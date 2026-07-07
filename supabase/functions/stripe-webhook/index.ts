// Receives Stripe webhook events and routes them by `metadata.kind`:
//   verification_fee       -> one-time provider verification fee (provider_verifications)
//   provider_subscription  -> recurring Trimbly Pro / Pro Mechanic plan (providers)
//   garage_subscription    -> recurring My Garage add-on (garage_subscriptions)
//
// Signature verification uses constructEventAsync (Web Crypto based) since
// Deno doesn't have Node's crypto module Stripe's sync verifier relies on.
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.4.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

function toIso(unixSeconds: number | null | undefined): string | null {
  return unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null;
}

// Writes that touch `providers.verified` / `subscription_tier` /
// `subscription_status` must pass through the trusted-sync flag, or the
// protect trigger on that table will silently revert them (by design — it's
// what stops a provider from setting these columns themselves). Postgres
// session variables set via set_config with is_local=true only apply within
// the same transaction/statement, which a single REST update constitutes.
async function trustedProviderUpdate(admin: ReturnType<typeof createClient>, updates: {
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_tier?: string | null;
  subscription_status?: string | null;
  subscription_current_period_end?: string | null;
}, providerId: string) {
  const { error } = await admin.rpc("update_provider_trusted", {
    p_provider_id: providerId,
    p_stripe_customer_id: updates.stripe_customer_id ?? null,
    p_stripe_subscription_id: updates.stripe_subscription_id ?? null,
    p_subscription_tier: updates.subscription_tier ?? null,
    p_subscription_status: updates.subscription_status ?? null,
    p_subscription_current_period_end: updates.subscription_current_period_end ?? null,
  });
  return error;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
      console.error("stripe-webhook: STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature") || "";

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error("stripe-webhook: signature verification failed", err);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const kind = session.metadata?.kind || "verification_fee"; // back-compat for sessions created before `kind` existed

      if (kind === "verification_fee") {
        const providerId = session.metadata?.provider_id || session.client_reference_id;
        if (providerId) {
          const { error } = await admin.from("provider_verifications").update({
            verification_fee_status: "paid",
            verification_fee_paid_at: new Date().toISOString(),
            verification_fee_amount_cents: session.amount_total,
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
          }).eq("provider_id", providerId);
          if (error) {
            console.error("stripe-webhook: failed to mark verification as paid", error);
            return new Response(JSON.stringify({ error: "Failed to record payment" }), {
              status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      } else if (kind === "provider_subscription") {
        const providerId = session.metadata?.provider_id;
        const tier = session.metadata?.tier || "pro";
        if (providerId) {
          const error = await trustedProviderUpdate(admin, {
            stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
            stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null,
            subscription_tier: tier,
            subscription_status: "active",
          }, providerId);
          if (error) {
            console.error("stripe-webhook: failed to activate provider subscription", error);
            return new Response(JSON.stringify({ error: "Failed to record subscription" }), {
              status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      } else if (kind === "garage_subscription") {
        const userId = session.metadata?.user_id || session.client_reference_id;
        if (userId) {
          const { error } = await admin.from("garage_subscriptions").upsert({
            user_id: userId,
            status: "trial", // corrected immediately by the subscription.created/updated event below
            stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
            stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null,
          }, { onConflict: "user_id" });
          if (error) {
            console.error("stripe-webhook: failed to record garage subscription", error);
            return new Response(JSON.stringify({ error: "Failed to record subscription" }), {
              status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }
    } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
      const sub = event.data.object as Stripe.Subscription;
      const kind = sub.metadata?.kind;
      const periodEnd = toIso(sub.current_period_end);

      if (kind === "provider_subscription" && sub.metadata?.provider_id) {
        const status = sub.status === "active" || sub.status === "trialing" ? "active" : sub.status === "past_due" ? "past_due" : "canceled";
        await trustedProviderUpdate(admin, {
          subscription_status: status,
          subscription_current_period_end: periodEnd,
          subscription_tier: status === "canceled" ? "free" : (sub.metadata?.tier || "pro"),
        }, sub.metadata.provider_id);
      } else if (kind === "garage_subscription" && sub.metadata?.user_id) {
        const status = sub.status === "trialing" ? "trial" : sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : "canceled";
        await admin.from("garage_subscriptions").update({
          status,
          current_period_end: periodEnd,
        }).eq("user_id", sub.metadata.user_id);
      }
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const kind = sub.metadata?.kind;

      if (kind === "provider_subscription" && sub.metadata?.provider_id) {
        await trustedProviderUpdate(admin, {
          subscription_status: "canceled",
          subscription_tier: "free",
        }, sub.metadata.provider_id);
      } else if (kind === "garage_subscription" && sub.metadata?.user_id) {
        await admin.from("garage_subscriptions").update({
          status: "canceled",
          canceled_at: new Date().toISOString(),
        }).eq("user_id", sub.metadata.user_id);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("stripe-webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal error, logged" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
