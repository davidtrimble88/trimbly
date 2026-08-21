import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Resolves the EFFECTIVE subscription tier for a specific home: the
 * viewer's own tier if they own it, otherwise the home owner's tier (since
 * a shared member's access to that one home rides on whatever the owner is
 * paying for — a Free-tier invitee viewing a Home Hero owner's shared home
 * still gets Home Hero features for that home, per the product requirement).
 * Pass null/"all" to skip resolution (e.g. the combined multi-home view).
 */
export function useHomeAccess(homeId: string | null | undefined) {
  const { user } = useAuth();
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [effectiveTier, setEffectiveTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !homeId || homeId === "all") {
      setIsOwner(null); setOwnerId(null); setOwnerName(null); setEffectiveTier(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: home } = await supabase.from("homes").select("user_id").eq("id", homeId).maybeSingle();
      if (cancelled || !home) { setLoading(false); return; }
      const owner = home.user_id === user.id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier, full_name")
        .eq("id", home.user_id)
        .maybeSingle();
      if (cancelled) return;
      setIsOwner(owner);
      setOwnerId(home.user_id);
      setOwnerName(owner ? null : profile?.full_name || "another Trimbly user");
      setEffectiveTier(profile?.subscription_tier ?? "free");
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, homeId]);

  return { isOwner, ownerId, ownerName, effectiveTier, loading };
}
