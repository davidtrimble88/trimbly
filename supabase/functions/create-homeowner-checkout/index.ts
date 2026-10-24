// Starts a recurring Stripe Checkout for a homeowner plan (Home Hero or Home
// Super Hero). The card is collected up front and Stripe charges nothing until
// the 14-day trial ends. Same shape as create-garage-checkout; the plan and
// price are fixed here, never taken from the client.
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.4.0";
import { getClientKey, rateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Must match homeownerTiers in src/lib/pricingTiers.ts.
const PLANS: Record<string, { name: string; cents: number }> = {
  homeowner_pro: { name: "Trimbly Home Hero", cents: 500 },
  multi_pro: { name: "Trimbly Home Super Hero", cents: 2000 },
};

const TRIAL_DAYS = 14;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const rl = rateLimit(`homeowner-checkout:${getClientKey(req)}`, { limit: 5, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl, corsHeaders);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not configured");
    const SITE_URL = Deno.env.get("SITE_URL") || "https://trimblyhome.com";

    const userJwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!userJwt) return json({ error: "Unauthorized" }, 401);
    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${userJwt}` } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const tier = String(body.tier ?? "homeowner_pro");
    const plan = PLANS[tier];
    if (!plan) return json({ error: "Unsupported plan" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: profile } = await admin
      .from("profiles")
      .select("user_type, subscription_status, stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile || profile.user_type === "provider") {
      return json({ error: "Home plans are for homeowner accounts" }, 400);
    }
    if (profile.subscription_status === "active" || profile.subscription_status === "past_due") {
      return json({ error: "You already have an active subscription" }, 409);
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const metadata = { kind: "homeowner_subscription", user_id: user.id, tier };
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      // Reuse the Stripe customer if they've been here before.
      ...(profile.stripe_customer_id
        ? { customer: profile.stripe_customer_id }
        : { customer_email: user.email || undefined }),
      client_reference_id: user.id,
      // The card is required even though the first charge is 14 days away.
      payment_method_collection: "always",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: plan.cents,
            recurring: { interval: "month" },
            product_data: { name: plan.name },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata,
      },
      metadata,
      success_url: `${SITE_URL}/dashboard?subscription=success`,
      cancel_url: `${SITE_URL}/dashboard?subscription=cancelled`,
    });

    return json({ url: session.url });
  } catch (err) {
    console.error("create-homeowner-checkout error:", err);
    return json({ error: "We couldn't start checkout. Please try again." }, 500);
  }
});
