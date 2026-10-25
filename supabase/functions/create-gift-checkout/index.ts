// Starts a one-time Stripe Checkout for gift codes. Public on purpose: the
// buyer (often a realtor or a relative) doesn't need a Trimbly account. The
// price is set here, never taken from the client. The codes themselves are
// created by stripe-webhook after payment clears, not here.
//
// Each gift in the order can have its own recipient name, email and note.
// Stripe metadata can't hold that (500 characters a value), so the validated
// list is saved as a gift_drafts row and the session carries only its id.
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.4.0";
import { getClientKey, rateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";
import {
  GIFT_MAX_QUANTITY,
  GIFT_NOTE_MAX,
  GIFT_PRICE_CENTS,
  cleanLine,
  isEmail,
  normalizeGiftItems,
} from "../_shared/gift.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const rl = rateLimit(`gift-checkout:${getClientKey(req)}`, { limit: 6, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl, corsHeaders);

    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not configured");
    const SITE_URL = Deno.env.get("SITE_URL") || "https://trimblyhome.com";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.json().catch(() => ({}));

    const buyerEmail = cleanLine(body.buyerEmail, 254).toLowerCase();
    if (!isEmail(buyerEmail)) return json({ error: "Enter a valid email so we can send the code" }, 400);

    const quantity = Math.floor(Number(body.quantity));
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > GIFT_MAX_QUANTITY) {
      return json({ error: `Choose between 1 and ${GIFT_MAX_QUANTITY} gifts. For more, place another order or email office@trimblyhome.com` }, 400);
    }

    const buyerName = cleanLine(body.buyerName, 80);
    const defaultNote = String(body.note ?? "").replace(/\r/g, "").trim().slice(0, GIFT_NOTE_MAX);

    // A page published before per-gift forms existed sends the single recipient at the top level.
    const gifts = Array.isArray(body.gifts)
      ? body.gifts
      : [{ recipientName: body.recipientName, recipientEmail: body.recipientEmail }];
    const normalized = normalizeGiftItems(gifts, quantity, defaultNote);
    if ("error" in normalized) return json({ error: normalized.error }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: draft, error: draftErr } = await admin
      .from("gift_drafts")
      .insert({ buyer_email: buyerEmail, buyer_name: buyerName || null, items: normalized.items })
      .select("id")
      .single();
    if (draftErr || !draft) {
      console.error("create-gift-checkout: could not save the draft", draftErr);
      return json({ error: "We couldn't start checkout. Please try again." }, 500);
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: buyerEmail,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: GIFT_PRICE_CENTS,
            product_data: {
              name: "Trimbly Home Hero: 1 year gift",
              description: "One-time gift code. Gives one homeowner 12 months of Home Hero, starting when they redeem it.",
            },
          },
          quantity,
        },
      ],
      metadata: {
        kind: "gift_purchase",
        draft_id: draft.id,
        buyer_email: buyerEmail,
        buyer_name: buyerName,
        quantity: String(quantity),
      },
      success_url: `${SITE_URL}/gift?thanks=1`,
      cancel_url: `${SITE_URL}/gift`,
    });

    return json({ url: session.url });
  } catch (err) {
    console.error("create-gift-checkout error:", err);
    return json({ error: "We couldn't start checkout. Please try again." }, 500);
  }
});
