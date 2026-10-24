// Called by the app right after a household seat is added or removed
// (accepting an invite, removing a person). The caller names a share, not an
// amount: the owner is looked up from the database, and the caller must be that
// share's owner or its member. What gets billed is whatever the database says.
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.4.0";
import { getClientKey, rateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";
import { reconcileHouseholdBilling } from "../_shared/householdBilling.ts";

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
    const rl = rateLimit(`household-billing:${getClientKey(req)}`, { limit: 20, windowMs: 60_000 });
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

    const body = await req.json().catch(() => ({}));
    const shareId = typeof body.shareId === "string" ? body.shareId : null;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    let ownerId = user.id;
    if (shareId) {
      const { data: share } = await admin
        .from("home_shares")
        .select("owner_user_id, member_user_id")
        .eq("id", shareId)
        .maybeSingle();
      if (!share || (share.owner_user_id !== user.id && share.member_user_id !== user.id)) {
        return json({ error: "Not found" }, 404);
      }
      ownerId = share.owner_user_id;
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
      httpClient: Stripe.createFetchHttpClient(),
    });
    const result = await reconcileHouseholdBilling(admin, stripe, ownerId);
    if (!result.ok) return json({ error: result.error }, 500);
    return json(result);
  } catch (err) {
    console.error("sync-household-billing error:", err);
    return json({ error: "Couldn't update household billing" }, 500);
  }
});
