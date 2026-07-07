// Creates a recurring Stripe Checkout session for the My Garage add-on.
// Replaces the previous direct-upsert-from-client in GarageUpsell.tsx, which
// only had SELECT granted to authenticated users anyway (writes require the
// service role) and was explicitly marked TEMP/test-only in the code.
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.4.0";
import { getClientKey, rateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRICE_CENTS: Record<string, number> = { monthly: 399, yearly: 2900 };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const rl = rateLimit(`garage-checkout:${getClientKey(req)}`, { limit: 5, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl, corsHeaders);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not configured");
    const SITE_URL = Deno.env.get("SITE_URL") || "https://trimbly.app";

    const userJwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!userJwt) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${userJwt}` } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const interval = body.interval === "yearly" ? "yearly" : "monthly";

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: existing } = await admin
      .from("garage_subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing?.status === "active") {
      return new Response(JSON.stringify({ error: "My Garage is already active" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email || undefined,
      client_reference_id: user.id,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: PRICE_CENTS[interval],
            recurring: { interval: interval === "yearly" ? "year" : "month" },
            product_data: { name: "My Garage" },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          kind: "garage_subscription",
          user_id: user.id,
          interval,
        },
      },
      metadata: {
        kind: "garage_subscription",
        user_id: user.id,
        interval,
      },
      success_url: `${SITE_URL}/garage?subscription=success`,
      cancel_url: `${SITE_URL}/garage/upsell?subscription=cancelled`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-garage-checkout error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message || "Failed to start checkout" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
