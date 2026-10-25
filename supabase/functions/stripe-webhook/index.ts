// Receives Stripe webhook events and routes them by `metadata.kind`:
//   verification_fee       -> one-time provider verification fee (provider_verifications)
//   provider_subscription  -> recurring Trimbly Pro / Pro Mechanic plan (providers)
//   garage_subscription    -> recurring My Garage add-on (garage_subscriptions)
//   homeowner_subscription -> recurring Home Hero / Home Super Hero (profiles)
//   gift_purchase          -> one-time gift codes for Home Hero (gift_orders, gift_codes)
//   charge.refunded        -> voids the unredeemed codes of a refunded gift
//
// Signature verification uses constructEventAsync (Web Crypto based) since
// Deno doesn't have Node's crypto module Stripe's sync verifier relies on.
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.4.0";
import { sendEmail } from "../_shared/sendEmail.ts";
import { reconcileHouseholdBilling } from "../_shared/householdBilling.ts";
import { GIFT_MAX_QUANTITY, generateGiftCode, renderBuyerEmail, renderRecipientEmail } from "../_shared/gift.ts";

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Creates the order and its codes (once per Stripe session) and emails them.
// Stripe retries webhooks, so this is safe to run repeatedly: the order insert
// is keyed on the session id, the buyer email is only sent while
// gift_orders.emailed_at is NULL, and each recipient's email is only sent while
// that gift's recipient_emailed_at is NULL. Returns false when something should
// be retried (the order or the buyer email); a recipient's email failing is
// logged but never fails the webhook, since the buyer already has every code.
async function fulfillGiftPurchase(admin: ReturnType<typeof createClient>, session: Stripe.Checkout.Session): Promise<boolean> {
  const m = session.metadata ?? {};
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  const orderColumns = "id, buyer_email, buyer_name, recipient_email, recipient_name, note, emailed_at";

  let { data: order } = await admin.from("gift_orders").select(orderColumns)
    .eq("stripe_checkout_session_id", session.id).maybeSingle();

  if (!order) {
    if (m.draft_id) {
      // New flow: every gift has its own name, email and note, saved by create-gift-checkout.
      const { data: draft, error: draftErr } = await admin.from("gift_drafts")
        .select("buyer_email, buyer_name, items").eq("id", m.draft_id).maybeSingle();
      if (draftErr || !draft) {
        console.error("stripe-webhook: could not load the gift draft", m.draft_id, draftErr);
        return false;
      }
      const items = (draft.items as Array<Record<string, string>>).map((it) => ({ ...it, code: generateGiftCode() }));
      const { error: createErr } = await admin.rpc("create_gift_order_items", {
        p_session_id: session.id,
        p_payment_intent: paymentIntentId,
        p_buyer_email: draft.buyer_email,
        p_buyer_name: draft.buyer_name,
        p_amount_cents: session.amount_total ?? 0,
        p_items: items,
      });
      if (createErr) {
        console.error("stripe-webhook: create_gift_order_items failed", createErr);
        return false;
      }
      await admin.from("gift_drafts").delete().eq("id", m.draft_id); // best effort; it holds names and emails
    } else {
      // Older sessions: one order-wide recipient in the metadata.
      const buyerEmail = m.buyer_email || session.customer_details?.email;
      if (!buyerEmail) {
        console.error("stripe-webhook: gift session has no buyer email", session.id);
        return false;
      }
      const quantity = Math.min(GIFT_MAX_QUANTITY, Math.max(1, parseInt(m.quantity || "1", 10) || 1));
      const { error: createErr } = await admin.rpc("create_gift_order", {
        p_session_id: session.id,
        p_payment_intent: paymentIntentId,
        p_buyer_email: buyerEmail,
        p_buyer_name: m.buyer_name || null,
        p_recipient_email: m.recipient_email || null,
        p_recipient_name: m.recipient_name || null,
        p_note: m.note || null,
        p_amount_cents: session.amount_total ?? 0,
        p_codes: Array.from({ length: quantity }, () => generateGiftCode()),
      });
      if (createErr) {
        console.error("stripe-webhook: create_gift_order failed", createErr);
        return false;
      }
    }
    const reloaded = await admin.from("gift_orders").select(orderColumns)
      .eq("stripe_checkout_session_id", session.id).maybeSingle();
    order = reloaded.data;
  }
  if (!order) {
    console.error("stripe-webhook: could not load the gift order", session.id);
    return false;
  }

  const { data: codeRows, error: codesErr } = await admin.from("gift_codes")
    .select("code, recipient_name, recipient_email, note, recipient_emailed_at")
    .eq("order_id", order.id).order("position", { nullsFirst: false }).order("created_at");
  if (codesErr || !codeRows || codeRows.length === 0) {
    console.error("stripe-webhook: could not load gift codes", codesErr);
    return false;
  }

  type CodeRow = { code: string; recipient_name: string | null; recipient_email: string | null; note: string | null; recipient_emailed_at: string | null };
  // An order saved before per-gift details existed kept its one recipient on the order itself.
  const legacySingle = codeRows.length === 1 && !order.emailed_at;
  const gifts = (codeRows as CodeRow[]).map((c) => ({
    code: c.code,
    name: c.recipient_name ?? (legacySingle ? order!.recipient_name : null),
    email: c.recipient_email ?? (legacySingle ? order!.recipient_email : null),
    note: c.note ?? order!.note,
    alreadyEmailed: !!c.recipient_emailed_at,
  }));
  const siteUrl = Deno.env.get("SITE_URL") || "https://trimblyhome.com";

  if (!order.emailed_at) {
    const buyerMail = renderBuyerEmail({
      items: gifts.map((g) => ({ code: g.code, recipientName: g.name, recipientEmail: g.email })),
      siteUrl,
    });
    const sent = await sendEmail({ to: order.buyer_email, ...buyerMail });
    if (!sent.ok) return false;
    const { error: markErr } = await admin.from("gift_orders")
      .update({ emailed_at: new Date().toISOString() }).eq("id", order.id);
    if (markErr) console.error("stripe-webhook: could not mark gift order emailed", markErr);
  }

  for (const g of gifts) {
    if (!g.email || g.alreadyEmailed) continue;
    await sleep(600); // Resend allows about two requests a second
    const mail = renderRecipientEmail({ code: g.code, buyerName: order.buyer_name, note: g.note, siteUrl });
    const sent = await sendEmail({ to: g.email, replyTo: order.buyer_email, ...mail });
    if (sent.ok) {
      await admin.from("gift_codes").update({ recipient_emailed_at: new Date().toISOString() }).eq("code", g.code);
    } else {
      console.error("stripe-webhook: gift recipient email failed", session.id, g.code);
    }
  }
  return true;
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
      } else if (kind === "homeowner_subscription") {
        const userId = session.metadata?.user_id || session.client_reference_id;
        const tier = session.metadata?.tier;
        if (userId && (tier === "homeowner_pro" || tier === "multi_pro")) {
          const { error } = await admin.rpc("update_profile_subscription_trusted", {
            p_user_id: userId,
            p_stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
            p_stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null,
            p_subscription_tier: tier,
            p_subscription_status: "active", // trialing counts as active; the card is on file
          });
          if (error) {
            console.error("stripe-webhook: failed to activate homeowner subscription", error);
            return new Response(JSON.stringify({ error: "Failed to record subscription" }), {
              status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          // Household seats added before the card was on file (during the beta)
          // start being billed now. Best effort: the scheduled sweep retries.
          try {
            const synced = await reconcileHouseholdBilling(admin, stripe, userId);
            if (!synced.ok) console.error("stripe-webhook: household billing sync failed", synced.error);
          } catch (err) {
            console.error("stripe-webhook: household billing sync threw", err);
          }
        }
      } else if (kind === "gift_purchase") {
        if (session.payment_status === "paid") {
          const ok = await fulfillGiftPurchase(admin, session);
          if (!ok) {
            // 500 makes Stripe redeliver; fulfillGiftPurchase is safe to repeat.
            return new Response(JSON.stringify({ error: "Failed to fulfill gift" }), {
              status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      } else if (kind === "milestone_payment") {
        const milestoneId = session.metadata?.milestone_id || session.client_reference_id;
        if (milestoneId) {
          const { error } = await admin.from("job_milestones").update({
            status: "funded",
            funded_at: new Date().toISOString(),
            stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
          }).eq("id", milestoneId);
          if (error) {
            console.error("stripe-webhook: failed to mark milestone funded", error);
            return new Response(JSON.stringify({ error: "Failed to record milestone payment" }), {
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
      } else if (kind === "homeowner_subscription" && sub.metadata?.user_id) {
        const status = sub.status === "active" || sub.status === "trialing" ? "active" : sub.status === "past_due" ? "past_due" : "canceled";
        const { error } = await admin.rpc("update_profile_subscription_trusted", {
          p_user_id: sub.metadata.user_id,
          p_stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
          p_stripe_subscription_id: sub.id,
          p_subscription_status: status,
          p_subscription_current_period_end: periodEnd,
          // Only a lapsed subscription drops the plan; active and past_due keep it.
          p_subscription_tier: status === "canceled" ? "free" : (sub.metadata.tier || null),
        });
        if (error) console.error("stripe-webhook: homeowner subscription sync failed", error);
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
      } else if (kind === "homeowner_subscription" && sub.metadata?.user_id) {
        const { error } = await admin.rpc("update_profile_subscription_trusted", {
          p_user_id: sub.metadata.user_id,
          p_subscription_tier: "free",
          p_subscription_status: "canceled",
        });
        if (error) console.error("stripe-webhook: homeowner subscription cancel failed", error);
      } else if (kind === "garage_subscription" && sub.metadata?.user_id) {
        await admin.from("garage_subscriptions").update({
          status: "canceled",
          canceled_at: new Date().toISOString(),
        }).eq("user_id", sub.metadata.user_id);
      }
    } else if (event.type === "charge.refunded") {
      // A fully refunded gift can no longer be redeemed. Codes already
      // redeemed are left alone; that's a staff decision.
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (charge.refunded && paymentIntentId) {
        const { data: orders } = await admin.from("gift_orders").select("id").eq("stripe_payment_intent_id", paymentIntentId);
        const orderIds = (orders ?? []).map((o: { id: string }) => o.id);
        if (orderIds.length > 0) {
          const { error } = await admin.from("gift_codes")
            .update({ voided_at: new Date().toISOString() })
            .in("order_id", orderIds)
            .is("redeemed_at", null)
            .is("voided_at", null);
          if (error) {
            console.error("stripe-webhook: failed to void refunded gift codes", error);
            return new Response(JSON.stringify({ error: "Failed to void gift codes" }), {
              status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }
    } else if (event.type === "account.updated") {
      const account = event.data.object as Stripe.Account;
      await admin.from("providers").update({
        stripe_connect_charges_enabled: !!account.charges_enabled,
        stripe_connect_payouts_enabled: !!account.payouts_enabled,
      }).eq("stripe_connect_account_id", account.id);
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
