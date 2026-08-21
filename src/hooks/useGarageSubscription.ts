import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const CACHE_PREFIX = "trimbly:garageActive:";

export type GarageStatus = "trial" | "active" | "canceled" | "past_due";

export interface GarageSubscription {
  status: GarageStatus;
  plan_interval: "monthly" | "yearly";
  current_period_end: string | null;
  started_at: string;
}

// The cache must be scoped per-user — a shared, unscoped key leaked whoever
// was last active on a browser into the *next* login's first render (e.g. a
// lapsed subscriber briefly seeing the "Garage" nav link, or vice versa).
// Supabase's own persisted session is read synchronously here (rather than
// waiting on useAuth to resolve) purely so the very first paint can already
// use the right per-user key instead of guessing.
function currentSessionUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const key = Object.keys(localStorage).find((k) => k.endsWith("-auth-token"));
    if (!key) return null;
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    return parsed?.user?.id ?? parsed?.currentSession?.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns whether the current user has an active My Garage add-on,
 * plus the underlying subscription record. Caches the boolean in
 * localStorage (per-user) so gated pages don't flash an upsell on reload.
 */
export function useGarageSubscription() {
  const { user, loading: authLoading } = useAuth();
  const [active, setActive] = useState<boolean | null>(() => {
    if (typeof window === "undefined") return null;
    const uid = currentSessionUserId();
    if (!uid) return null;
    const v = localStorage.getItem(CACHE_PREFIX + uid);
    return v === "1" ? true : v === "0" ? false : null;
  });
  const [sub, setSub] = useState<GarageSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setActive(false);
      setSub(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("garage_subscriptions")
        .select("status, plan_interval, current_period_end, started_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const isActive =
        !!data &&
        (data.status === "active" || data.status === "trial") &&
        (!data.current_period_end || new Date(data.current_period_end) > new Date());
      setSub((data as GarageSubscription) || null);
      setActive(isActive);
      setLoading(false);
      try { localStorage.setItem(CACHE_PREFIX + user.id, isActive ? "1" : "0"); } catch {}
    })();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  return { active: !!active, loading, sub };
}
