import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useHomeLimit } from "@/hooks/useHomeLimit";
import { useGarageSubscription } from "@/hooks/useGarageSubscription";
import { useHomeSharing, type GrantType } from "@/hooks/useHomeSharing";
import { markFeatureSeen } from "@/components/dashboard/FeatureAnnouncementDot";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { buildHomeownerSatelliteNavItems, homeownerNavGroups } from "@/components/dashboard/homeowner/navItems";
import { tierLabels } from "@/components/dashboard/homeowner/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Home, Crown, Users, Copy, Share2, Loader2, UserPlus, X, Sparkles, Building2,
} from "lucide-react";

const GRANT_LABELS: Record<GrantType, string> = {
  hero_member: "Family member",
  multi_full: "Full access to all homes",
  multi_single: "Access to one home",
};

export default function HomeSharing() {
  const navigate = useNavigate();
  const { user, loading: authLoading, profileName } = useAuth();
  const { subscriptionTier, loading: tierLoading } = useHomeLimit();
  const { active: hasGarage } = useGarageSubscription();
  const { toast } = useToast();
  const { invites, shares, monthlyAddonCents, loading: sharingLoading, refresh } = useHomeSharing();

  useEffect(() => { markFeatureSeen("family-sharing"); }, []);

  const [homes, setHomes] = useState<{ id: string; name: string }[]>([]);
  const [creating, setCreating] = useState<GrantType | null>(null);
  const [singleHomeId, setSingleHomeId] = useState<string>("");
  const [justCreatedToken, setJustCreatedToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("homes").select("id, name").eq("user_id", user.id).order("created_at", { ascending: true }).then(({ data }) => {
      setHomes(data || []);
      if (data?.length) setSingleHomeId(data[0].id);
    });
  }, [user]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isHero = subscriptionTier === "homeowner_pro";
  const isSuperHero = subscriptionTier === "multi_pro";
  const fullAccessCount = shares.filter((s) => s.grant_type === "multi_full").length;
  const nextFullPriceCents = fullAccessCount < 2 ? 0 : 1000;

  const createInvite = async (grantType: GrantType, homeId?: string) => {
    setCreating(grantType);
    try {
      const { data, error } = await supabase.rpc("create_home_invite" as any, {
        p_grant_type: grantType,
        p_home_id: homeId || null,
      } as any);
      const result = data as any;
      if (error || !result?.success) {
        toast({ title: "Couldn't create invite", description: result?.error || error?.message, variant: "destructive" });
        return;
      }
      setJustCreatedToken(result.token);
      toast({ title: "Invite link created", description: "Copy it and send it to whoever you're inviting." });
      refresh();
    } finally {
      setCreating(null);
    }
  };

  const linkFor = (token: string) => `${window.location.origin}/join/${token}`;

  const copyLink = async (token: string) => {
    await navigator.clipboard.writeText(linkFor(token));
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 1800);
    toast({ title: "Link copied" });
  };

  const shareLink = async (token: string, grantType: GrantType) => {
    const url = linkFor(token);
    const text = `Join me on Trimbly — I'm sharing my home with you: ${url}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Trimbly invite", text, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: "Message copied", description: "Paste it into a text or email." });
    }
  };

  const revoke = async (shareId: string) => {
    if (!confirm("Remove this person's access?")) return;
    const { error } = await supabase.rpc("revoke_home_share" as any, { p_share_id: shareId } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Access removed" });
    refresh();
  };

  const revokeInvite = async (inviteId: string) => {
    const { error } = await (supabase.from("home_invites" as any) as any).update({ status: "revoked" }).eq("id", inviteId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Invite link revoked" });
    refresh();
  };

  if (authLoading || tierLoading || !user) {
    return (
      <div className="min-h-screen bg-background container mx-auto px-4 pt-16 pb-16 max-w-5xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const displayName = profileName || user.user_metadata?.full_name || user.email;
  const navItems = buildHomeownerSatelliteNavItems(hasGarage);

  return (
    <DashboardShell
      brandLabel="My Home"
      navItems={navItems}
      groups={homeownerNavGroups}
      activeItemId="sharing"
      onNavigate={() => {}}
      header={{
        avatarIcon: Home,
        displayName,
        subtitle: (
          <Badge variant="secondary" className="text-xs gap-1">
            <Crown size={12} className="text-primary" /> {tierLabels[subscriptionTier] ?? "Free"}
          </Badge>
        ),
        onEditProfile: () => navigate("/dashboard?tab=profile"),
      }}
    >
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Family & Sharing</h1>
            <p className="text-muted-foreground">Invite others to view your home — they get their own account, your home stays yours.</p>
          </div>
        </div>

        {!isSuperHero && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6 space-y-2">
              <p className="font-semibold text-foreground flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Free during beta</p>
              <p className="text-sm text-muted-foreground">
                Inviting a household member normally costs $2/mo on Home Hero. While Trimbly is in beta it's free for everyone — invite whoever shares your address.
              </p>
            </CardContent>
          </Card>
        )}

        {!isSuperHero && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" /> Invite a family member</CardTitle>
              <CardDescription>Free during beta (normally $2/mo per person). They get their own login and can see your home.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => createInvite("hero_member")} disabled={creating !== null} className="gap-1.5">
                {creating === "hero_member" ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                Create invite link
              </Button>
            </CardContent>
          </Card>
        )}

        {isSuperHero && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Full access to all your homes</CardTitle>
                <CardDescription>
                  {fullAccessCount < 2
                    ? `${2 - fullAccessCount} free spot${2 - fullAccessCount === 1 ? "" : "s"} left, then $10/mo per person.`
                    : "Your 2 free spots are used — additional people are $10/mo each."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => createInvite("multi_full")} disabled={creating !== null} className="gap-1.5">
                  {creating === "multi_full" ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  Create invite link {nextFullPriceCents === 0 ? "(free)" : "($10/mo)"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Access to one property</CardTitle>
                <CardDescription>$5/mo per person — pick which home they can see.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-end gap-3">
                <div>
                  <Select value={singleHomeId} onValueChange={setSingleHomeId}>
                    <SelectTrigger className="w-[220px]"><SelectValue placeholder="Choose a home" /></SelectTrigger>
                    <SelectContent>
                      {homes.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => createInvite("multi_single", singleHomeId)} disabled={creating !== null || !singleHomeId} className="gap-1.5">
                  {creating === "multi_single" ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  Create invite link ($5/mo)
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {justCreatedToken && (
          <Card className="border-primary/40">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-foreground mb-2">Send this link to whoever you're inviting:</p>
              <div className="flex gap-2">
                <input readOnly value={linkFor(justCreatedToken)} className="flex-1 font-mono text-xs rounded-md border border-input bg-background px-3 py-2" />
                <Button variant="outline" onClick={() => copyLink(justCreatedToken)} className="gap-1.5 shrink-0">
                  <Copy size={14} /> {copiedToken === justCreatedToken ? "Copied" : "Copy"}
                </Button>
                <Button onClick={() => shareLink(justCreatedToken, "hero_member")} className="gap-1.5 shrink-0">
                  <Share2 size={14} /> Share
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {(
          <>
            <Card>
              <CardHeader><CardTitle className="text-lg">Pending invite links ({invites.length})</CardTitle></CardHeader>
              <CardContent>
                {sharingLoading ? (
                  <Skeleton className="h-12 w-full" />
                ) : invites.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending invites.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {invites.map((inv) => (
                      <div key={inv.id} className="flex items-center gap-3 py-3 flex-wrap">
                        <Badge variant="outline" className="text-xs">{GRANT_LABELS[inv.grant_type]}</Badge>
                        <span className="text-xs text-muted-foreground">Expires {new Date(inv.expires_at).toLocaleDateString()}</span>
                        <div className="ml-auto flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => copyLink(inv.token)} className="gap-1.5">
                            <Copy size={12} /> {copiedToken === inv.token ? "Copied" : "Copy link"}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => revokeInvite(inv.id)} title="Revoke">
                            <X size={14} className="text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 flex-wrap">
                  <CardTitle className="text-lg">People with access ({shares.length})</CardTitle>
                  {shares.length > 0 && (
                    <div className="flex -space-x-2">
                      {shares.slice(0, 5).map((s) => (
                        <Avatar key={s.id} className="w-7 h-7 ring-2 ring-card">
                          <AvatarImage src={s.member_avatar_url ?? undefined} alt={s.member_name} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {s.member_name?.[0]?.toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {shares.length > 5 && (
                        <div className="w-7 h-7 rounded-full ring-2 ring-card bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                          +{shares.length - 5}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {shares.length > 0 && <CardDescription>+${(monthlyAddonCents / 100).toFixed(2)}/mo in shared access</CardDescription>}
              </CardHeader>
              <CardContent>
                {sharingLoading ? (
                  <Skeleton className="h-12 w-full" />
                ) : shares.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nobody has accepted an invite yet.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {shares.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 py-3 flex-wrap">
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarImage src={s.member_avatar_url ?? undefined} alt={s.member_name} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {s.member_name?.[0]?.toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{s.member_name}</p>
                          <p className="text-xs text-muted-foreground">{GRANT_LABELS[s.grant_type]}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {s.monthly_addon_cents === 0 ? "Free" : `$${(s.monthly_addon_cents / 100).toFixed(2)}/mo`}
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => revoke(s.id)} className="ml-auto text-destructive hover:text-destructive">
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
