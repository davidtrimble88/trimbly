// Self-serve cancellation. Looks up the caller's own Stripe subscriptions from
// our database (never from the request) and turns off renewal at the end of
// the current period or trial. Access continues until then; the existing
// customer.subscription.deleted webhook handlers drop the plan to Free when
// the period actually ends.
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.4.0";
import { getClientKey, rateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const rl = rateLimit(`cancel-subscription:${getClientKey(req)}`, { limit: 5, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl, corsHeaders);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not configured");

    const userJwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!userJwt) return json({ error: "Unauthorized" }, 401);
    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${userJwt}` } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const [profile, provider, garage] = await Promise.all([
      admin.from("profiles").select("stripe_subscription_id").eq("id", user.id).maybeSingle(),
      admin.from("providers").select("stripe_subscription_id").eq("user_id", user.id).maybeSingle(),
      admin.from("garage_subscriptions").select("stripe_subscription_id").eq("user_id", user.id).maybeSingle(),
    ]);
    const ids = [profile.data?.stripe_subscription_id, provider.data?.stripe_subscription_id, garage.data?.stripe_subscription_id]
      .filter((id): id is string => !!id);

    if (ids.length === 0) return json({ cancelled: 0 });

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
      httpClient: Stripe.createFetchHttpClient(),
    });

    let cancelled = 0;
    let endsAt: number | null = null;
    for (const id of ids) {
      try {
        const sub = await stripe.subscriptions.update(id, { cancel_at_period_end: true });
        cancelled++;
        const end = sub.trial_end && sub.status === "trialing" ? sub.trial_end : sub.current_period_end;
        if (end && (endsAt === null || end > endsAt)) endsAt = end;
      } catch (err) {
        // Already ended in Stripe: nothing left to cancel.
        console.error("cancel-subscription: could not update", id, err);
      }
    }

    return json({ cancelled, endsAt: endsAt ? new Date(endsAt * 1000).toISOString() : null });
  } catch (err) {
    console.error("cancel-subscription error:", err);
    return json({ error: "We couldn't cancel right now. Please try again or contact us." }, 500);
  }
});
