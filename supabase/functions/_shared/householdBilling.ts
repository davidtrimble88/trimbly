// Keeps an owner's Stripe subscription in step with the household seats they
// pay for. The amounts come only from home_shares.monthly_addon_cents (locked
// in by accept_home_invite), never from a request. It is a reconcile, not an
// increment: it sets the subscription's household items to exactly what the
// database says, so running it twice, or after a missed event, is harmless.
//
// One Stripe item per distinct price ($2 member, $5 single home, $10 extra
// Super Hero member), each priced through a lookup key so the prices are
// created once and reused. The base plan item is never touched.
import type Stripe from "npm:stripe@17.4.0";

const KEY_PREFIX = "trimbly_household_";

const NAMES: Record<number, string> = {
  200: "Household member",
  500: "Shared single home",
  1000: "Additional household member (Home Super Hero)",
};

async function getOrCreatePrice(stripe: Stripe, cents: number): Promise<Stripe.Price> {
  const lookupKey = `${KEY_PREFIX}${cents}`;
  const found = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  if (found.data[0]) return found.data[0];
  return await stripe.prices.create({
    currency: "usd",
    unit_amount: cents,
    recurring: { interval: "month" },
    lookup_key: lookupKey,
    product_data: { name: NAMES[cents] ?? `Household access ($${(cents / 100).toFixed(2)}/mo)` },
  });
}

export type HouseholdSyncResult =
  | { ok: true; skipped: string }
  | { ok: true; changed: boolean; seats: Record<string, number> }
  | { ok: false; error: string };

export async function reconcileHouseholdBilling(
  // Any supabase-js service-role client; typed loosely because callers import supabase-js from different places.
  // deno-lint-ignore no-explicit-any
  admin: any,
  stripe: Stripe,
  ownerId: string,
): Promise<HouseholdSyncResult> {
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("stripe_subscription_id, subscription_status")
    .eq("id", ownerId)
    .maybeSingle();
  if (profileErr) return { ok: false, error: "Could not load the account" };
  // Test, staff and gifted accounts have no subscription to bill; their seats stay free.
  if (!profile?.stripe_subscription_id || profile.subscription_status !== "active") {
    return { ok: true, skipped: "no active subscription" };
  }

  const { data: shares, error: sharesErr } = await admin
    .from("home_shares")
    .select("monthly_addon_cents")
    .eq("owner_user_id", ownerId)
    .eq("status", "active");
  if (sharesErr) return { ok: false, error: "Could not load household seats" };

  const wanted = new Map<number, number>();
  for (const s of shares ?? []) {
    const cents = Number((s as { monthly_addon_cents: number }).monthly_addon_cents);
    if (cents > 0) wanted.set(cents, (wanted.get(cents) ?? 0) + 1);
  }

  const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id, { expand: ["items.data.price"] });
  if (!["active", "trialing", "past_due"].includes(sub.status)) {
    return { ok: true, skipped: `subscription is ${sub.status}` };
  }

  const items: Stripe.SubscriptionUpdateParams.Item[] = [];
  const keep = new Set<string>();
  for (const [cents, count] of wanted) {
    const price = await getOrCreatePrice(stripe, cents);
    keep.add(price.id);
    const existing = sub.items.data.find((i) => i.price.id === price.id);
    if (!existing) items.push({ price: price.id, quantity: count });
    else if (existing.quantity !== count) items.push({ id: existing.id, quantity: count });
  }
  for (const item of sub.items.data) {
    if (item.price.lookup_key?.startsWith(KEY_PREFIX) && !keep.has(item.price.id)) {
      items.push({ id: item.id, deleted: true });
    }
  }

  const seats = Object.fromEntries([...wanted].map(([cents, count]) => [String(cents), count]));
  if (items.length === 0) return { ok: true, changed: false, seats };

  await stripe.subscriptions.update(sub.id, { items, proration_behavior: "create_prorations" });
  return { ok: true, changed: true, seats };
}
