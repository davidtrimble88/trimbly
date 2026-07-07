// Charges the homeowner for a milestone via a standard (non-Connect) Stripe
// Checkout session — funds land in Trimbly's own Stripe balance, NOT the
// provider's. This deliberately avoids PaymentIntent manual-capture holds,
// which expire after ~7 days and can't survive a multi-week job. Funds are
// moved to the provider only later, via release-milestone, as a separate
// Transfer once the homeowner approves the completed work.
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
    const rl = rateLimit(`fund-milestone:${getClientKey(req)}`, { limit: 10, windowMs: 60_000 });
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
    const milestoneId = (body.milestone_id || "").toString();
    if (!milestoneId) {
      return new Response(JSON.stringify({ error: "milestone_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: milestone, error: milestoneErr } = await admin
      .from("job_milestones")
      .select("id, title, amount_cents, status, homeowner_id, provider_id")
      .eq("id", milestoneId)
      .maybeSingle();
    if (milestoneErr || !milestone) {
      return new Response(JSON.stringify({ error: "Milestone not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (milestone.homeowner_id !== user.id) {
      return new Response(JSON.stringify({ error: "This milestone isn't on your account" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (milestone.status !== "pending") {
      return new Response(JSON.stringify({ error: `Milestone is already ${milestone.status}` }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: provider } = await admin
      .from("providers")
      .select("business_name, stripe_connect_charges_enabled")
      .eq("id", milestone.provider_id)
      .maybeSingle();
    if (!provider?.stripe_connect_charges_enabled) {
      return new Response(JSON.stringify({ error: "This provider hasn't finished setting up payouts yet — ask them to complete Stripe onboarding first." }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transferGroup = `milestone_${milestone.id}`;
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email || undefined,
      client_reference_id: milestone.id,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: milestone.amount_cents,
            product_data: { name: `${provider.business_name}: ${milestone.title}` },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        transfer_group: transferGroup,
        description: `Milestone: ${milestone.title}`,
      },
      metadata: {
        kind: "milestone_payment",
        milestone_id: milestone.id,
      },
      success_url: `${SITE_URL}/dashboard?milestone=success`,
      cancel_url: `${SITE_URL}/dashboard?milestone=cancelled`,
    });

    await admin.from("job_milestones").update({
      stripe_checkout_session_id: session.id,
      transfer_group: transferGroup,
    }).eq("id", milestone.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("fund-milestone error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message || "Failed to start payment" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
