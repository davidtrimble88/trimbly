import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useHomeLimit = () => {
  const { user } = useAuth();
  const [homeCount, setHomeCount] = useState(0);
  const [subscriptionTier, setSubscriptionTier] = useState<string>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      const [{ count }, { data: profile }] = await Promise.all([
        supabase.from("homes").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("profiles").select("subscription_tier").eq("id", user.id).maybeSingle(),
      ]);
      setHomeCount(count ?? 0);
      setSubscriptionTier(profile?.subscription_tier ?? "free");
      setLoading(false);
    };
    load();
  }, [user]);

  const maxHomes = subscriptionTier === "free" ? 1 : Infinity;
  const canAddHome = homeCount < maxHomes;
  const isPro = subscriptionTier !== "free";

  return { homeCount, maxHomes, canAddHome, isPro, subscriptionTier, loading };
};
