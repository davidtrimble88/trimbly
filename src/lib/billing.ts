import { supabase } from "@/integrations/supabase/client";

export async function startProviderSubscriptionCheckout(tier: "pro" = "pro"): Promise<{ url?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke("create-provider-subscription-checkout", { body: { tier } });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  if (data?.url) return { url: data.url };
  return { error: "Could not start checkout" };
}

export async function startHomeownerCheckout(tier: "homeowner_pro" | "multi_pro" = "homeowner_pro"): Promise<{ url?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke("create-homeowner-checkout", { body: { tier } });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  if (data?.url) return { url: data.url };
  return { error: "Could not start checkout" };
}

/** Turns off renewal for every Stripe subscription the signed-in user has. Access runs to the end of the paid period or trial. */
export async function cancelMySubscriptions(): Promise<{ cancelled?: number; endsAt?: string | null; error?: string }> {
  const { data, error } = await supabase.functions.invoke("cancel-subscription", { body: {} });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  return { cancelled: data?.cancelled ?? 0, endsAt: data?.endsAt ?? null };
}

/**
 * Brings the owner's Stripe bill in line with their household seats after one
 * is added or removed. The server works out the amount from the database; this
 * only names the seat. Failures are swallowed on purpose: the seat itself is
 * already saved, and a scheduled sweep catches anything missed.
 */
export async function syncHouseholdBilling(shareId: string): Promise<void> {
  try {
    await supabase.functions.invoke("sync-household-billing", { body: { shareId } });
  } catch (err) {
    console.error("household billing sync failed", err);
  }
}

export async function startGarageCheckout(interval: "monthly" | "yearly" = "monthly"): Promise<{ url?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke("create-garage-checkout", { body: { interval } });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  if (data?.url) return { url: data.url };
  return { error: "Could not start checkout" };
}
