import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type GrantType = "hero_member" | "multi_full" | "multi_single";

export interface HomeInvite {
  id: string;
  token: string;
  grant_type: GrantType;
  home_id: string | null;
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
  created_at: string;
}

export interface HomeShare {
  id: string;
  member_user_id: string;
  grant_type: GrantType;
  home_id: string | null;
  monthly_addon_cents: number;
  status: "active" | "revoked";
  created_at: string;
  member_name?: string;
  member_avatar_url?: string | null;
}

/** Owner-side view of who they've invited/shared homes with. */
export function useHomeSharing() {
  const { user } = useAuth();
  const [invites, setInvites] = useState<HomeInvite[]>([]);
  const [shares, setShares] = useState<HomeShare[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const [{ data: invitesData }, { data: sharesData }] = await Promise.all([
      (supabase.from("home_invites" as any) as any)
        .select("id, token, grant_type, home_id, status, expires_at, created_at")
        .eq("owner_user_id", user.id)
        .order("created_at", { ascending: false }),
      (supabase.from("home_shares" as any) as any)
        .select("id, member_user_id, grant_type, home_id, monthly_addon_cents, status, created_at")
        .eq("owner_user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    const shareRows = (sharesData || []) as HomeShare[];
    const memberIds = [...new Set(shareRows.map((s) => s.member_user_id))];
    if (memberIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", memberIds);
      const profMap = new Map((profs || []).map((p: any) => [p.id, p]));
      shareRows.forEach((s) => {
        const p = profMap.get(s.member_user_id);
        s.member_name = p?.full_name || "Trimbly user";
        s.member_avatar_url = p?.avatar_url || null;
      });
    }

    setInvites(((invitesData || []) as HomeInvite[]).filter((i) => i.status === "pending"));
    setShares(shareRows.filter((s) => s.status === "active"));
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [user]);

  const monthlyAddonCents = shares.reduce((sum, s) => sum + s.monthly_addon_cents, 0);

  return { invites, shares, monthlyAddonCents, loading, refresh };
}
