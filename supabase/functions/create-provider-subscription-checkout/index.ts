// Creates a recurring Stripe Checkout session to upgrade a provider to a
// paid tier. Replaces the previous behavior where subscription_tier was
// written directly from a client-supplied `?tier=` query param with zero
// payment step (ProRegister.tsx / MechanicRegister.tsx). Registration now
// always creates providers at the free tier; this function is what actually
// unlocks a paid tier, and only ever via a completed Stripe payment
// (confirmed by stripe-webhook, never by the client directly).
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.4.0";
import { getClientKey, rateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Home-service pros and mechanics share one "pro" tier concept but at
// different price points. Keyed by providers.provider_type.
const PRICING_CENTS: Record<string, number> = {
  mechanic: 1500, // $15/mo
  default: 2900,  // $29/mo (general home-service pros)
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const rl = rateLimit(`provider-sub-checkout:${getClientKey(req)}`, { limit: 5, windowMs: 60_000 });
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
    const tier = (body.tier || "pro").toString();
    if (tier !== "pro") {
      return new Response(JSON.stringify({ error: "Unsupported tier" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: provider, error: providerErr } = await admin
      .from("providers")
      .select("id, business_name, provider_type, subscription_tier, subscription_status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (providerErr || !provider) {
      return new Response(JSON.stringify({ error: "Complete your provider profile before upgrading" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (provider.subscription_tier === "pro" && provider.subscription_status === "active") {
      return new Response(JSON.stringify({ error: "Already on the Pro plan" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const unitAmount = PRICING_CENTS[provider.provider_type === "mechanic" ? "mechanic" : "default"];
    const planLabel = provider.provider_type === "mechanic" ? "Trimbly Pro Mechanic" : "Trimbly Pro";
    const returnTab = provider.provider_type === "mechanic" ? "mechanic-dashboard" : "pro-dashboard";

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email || undefined,
      client_reference_id: provider.id,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: unitAmount,
            recurring: { interval: "month" },
            product_data: { name: planLabel },
          },
          quantity: 1,
        },
      ],
      metadata: {
        kind: "provider_subscription",
        provider_id: provider.id,
        user_id: user.id,
        tier,
      },
      subscription_data: {
        metadata: {
          kind: "provider_subscription",
          provider_id: provider.id,
          user_id: user.id,
          tier,
        },
      },
      success_url: `${SITE_URL}/${returnTab}?subscription=success`,
      cancel_url: `${SITE_URL}/${returnTab}?subscription=cancelled`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-provider-subscription-checkout error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message || "Failed to start checkout" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
