// Creates a one-time Stripe Checkout session for the provider verification
// fee. Paying unlocks document upload + the Checkr background check flow;
// completion (via stripe-webhook) is what allows the Verified badge to turn on.
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.4.0";
import { getClientKey, rateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const clientKey = getClientKey(req);
    const rl = rateLimit(`verification-checkout:${clientKey}`, { limit: 5, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl, corsHeaders);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not configured");

    const SITE_URL = Deno.env.get("SITE_URL") || "https://trimbly.app";
    const FEE_CENTS = Number(Deno.env.get("VERIFICATION_FEE_CENTS") || "2900");

    const userJwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!userJwt) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${userJwt}` } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: provider, error: providerErr } = await admin
      .from("providers")
      .select("id, business_name")
      .eq("user_id", user.id)
      .maybeSingle();
    if (providerErr || !provider) {
      return new Response(JSON.stringify({ error: "No provider profile found for this account" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: verification } = await admin
      .from("provider_verifications")
      .select("verification_fee_status")
      .eq("provider_id", provider.id)
      .maybeSingle();

    if (verification?.verification_fee_status === "paid") {
      return new Response(JSON.stringify({ error: "Verification fee already paid" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email || undefined,
      client_reference_id: provider.id,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: FEE_CENTS,
            product_data: {
              name: "Trimbly Pro Verification",
              description: "Background check + license/insurance review, one-time fee",
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        provider_id: provider.id,
        user_id: user.id,
      },
      success_url: `${SITE_URL}/pro-dashboard?tab=verification&verification=success`,
      cancel_url: `${SITE_URL}/pro-dashboard?tab=verification&verification=cancelled`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-verification-checkout error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message || "Failed to start checkout" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
