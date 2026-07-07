import { supabase } from "@/integrations/supabase/client";

export async function startProviderSubscriptionCheckout(tier: "pro" = "pro"): Promise<{ url?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke("create-provider-subscription-checkout", { body: { tier } });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  if (data?.url) return { url: data.url };
  return { error: "Could not start checkout" };
}

export async function startGarageCheckout(interval: "monthly" | "yearly" = "monthly"): Promise<{ url?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke("create-garage-checkout", { body: { interval } });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  if (data?.url) return { url: data.url };
  return { error: "Could not start checkout" };
}
