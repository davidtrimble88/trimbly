import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, AlertTriangle, Clock, CheckCircle2, Crown, Home as HomeIcon, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardShell from "@/components/dashboard/DashboardShell";
import UpgradeGate from "@/components/dashboard/UpgradeGate";
import { buildHomeownerSatelliteNavItems, homeownerNavGroups } from "@/components/dashboard/homeowner/navItems";
import { tierLabels } from "@/components/dashboard/homeowner/types";
import { useAuth } from "@/hooks/useAuth";
import { useHomeLimit } from "@/hooks/useHomeLimit";
import { useGarageSubscription } from "@/hooks/useGarageSubscription";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { matchLifespan, lifespanStatus, type LifespanStatus } from "@/lib/systemLifespans";

type BinderRow = { id: string; name: string; home_id: string; purchase_date: string | null };
type HomeRow = { id: string; name: string };

type MatchedItem = {
  id: string;
  name: string;
  label: string;
  homeName: string;
  ageYears: number;
  minYears: number;
  maxYears: number;
  status: LifespanStatus;
};

const statusMeta: Record<LifespanStatus, { title: string; icon: typeof AlertTriangle; className: string; blurb: string }> = {
  overdue: { title: "Due Now", icon: AlertTriangle, className: "border-destructive/30 bg-destructive/5", blurb: "Past typical replacement age — worth budgeting for soon." },
  due_soon: { title: "Plan Ahead", icon: Clock, className: "border-accent/30 bg-accent/5", blurb: "Entering the typical replacement window." },
  good: { title: "Good Condition", icon: CheckCircle2, className: "border-primary/20 bg-primary/5", blurb: "Well within its expected lifespan." },
};

const SystemLifespanTracker = () => {
  const { user, profileName } = useAuth();
  const navigate = useNavigate();
  const { isPro, subscriptionTier, loading: limitLoading } = useHomeLimit();
  const { active: hasGarage } = useGarageSubscription();
  const { toast } = useToast();

  const [homes, setHomes] = useState<HomeRow[]>([]);
  const [items, setItems] = useState<BinderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: homesData, error: homesError } = await supabase.from("homes").select("id, name").eq("user_id", user.id);
      if (homesError) {
        toast({ title: "Error", description: homesError.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      const homesList = (homesData as HomeRow[]) || [];
      setHomes(homesList);
      const homeIds = homesList.map((h) => h.id);
      if (homeIds.length === 0) { setLoading(false); return; }
      const { data, error } = await supabase.from("home_binder_items").select("id, name, home_id, purchase_date").in("home_id", homeIds);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      setItems((data as BinderRow[]) || []);
      setLoading(false);
    })();
  }, [user]);

  if (!user) return null;

  const displayName = profileName || user.user_metadata?.full_name || user.email;
  const navItems = buildHomeownerSatelliteNavItems(hasGarage);

  const withDate = items.filter((i) => !!i.purchase_date);
  const noDateCount = items.length - withDate.length;

  const matched: MatchedItem[] = withDate
    .map((item) => {
      const entry = matchLifespan(item.name);
      if (!entry) return null;
      const ageYears = (Date.now() - new Date(item.purchase_date!).getTime()) / (365.25 * 86400000);
      const home = homes.find((h) => h.id === item.home_id);
      return {
        id: item.id,
        name: item.name,
        label: entry.label,
        homeName: home?.name || "Property",
        ageYears,
        minYears: entry.minYears,
        maxYears: entry.maxYears,
        status: lifespanStatus(ageYears, entry),
      };
    })
    .filter((x): x is MatchedItem => !!x)
    .sort((a, b) => b.ageYears - a.ageYears);

  const buckets: Record<LifespanStatus, MatchedItem[]> = {
    overdue: matched.filter((m) => m.status === "overdue"),
    due_soon: matched.filter((m) => m.status === "due_soon"),
    good: matched.filter((m) => m.status === "good"),
  };

  return (
    <DashboardShell
      brandLabel="My Home"
      navItems={navItems}
      groups={homeownerNavGroups}
      activeItemId="systems"
      onNavigate={() => {}}
      header={{
        avatarIcon: HomeIcon,
        displayName,
        subtitle: (
          <Badge variant="secondary" className="text-xs gap-1">
            <Crown size={12} className="text-primary" /> {tierLabels[subscriptionTier] ?? "Free"}
          </Badge>
        ),
        onEditProfile: () => navigate("/dashboard?tab=profile"),
      }}
    >
      <div className="max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity size={22} className="text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-foreground font-display">System Lifespan Tracker</h1>
          </div>
          <p className="text-muted-foreground">
            See what's aging out before it breaks — based on the purchase dates already in your Digital Home Binder.
          </p>
        </div>

        {limitLoading || loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <UpgradeGate
            hasAccess={isPro}
            featureName="System Lifespan Tracker"
            description="See which home systems and appliances are aging out, based on your Digital Home Binder."
            benefits={["Flags items due for replacement soon", "Typical lifespan ranges for 25+ common systems", "Cross-references your existing Binder entries automatically"]}
            pricingRoute="/#pricing"
            icon={Crown}
          >
            {items.length === 0 ? (
              <div className="rounded-xl border border-border bg-card text-center py-12">
                <FolderOpen size={36} className="mx-auto text-primary mb-3" />
                <h3 className="font-display font-bold text-lg mb-1">Add items to your Home Binder first</h3>
                <p className="text-muted-foreground text-sm mb-4 max-w-sm mx-auto">
                  Once you've logged appliances and systems with a purchase date, this page will show what's aging out.
                </p>
                <Button asChild><Link to="/binder">Go to Home Binder</Link></Button>
              </div>
            ) : matched.length === 0 ? (
              <div className="rounded-xl border border-border bg-card text-center py-12">
                <Activity size={36} className="mx-auto text-primary mb-3" />
                <h3 className="font-display font-bold text-lg mb-1">Nothing to track yet</h3>
                <p className="text-muted-foreground text-sm mb-4 max-w-md mx-auto">
                  We couldn't match any of your binder items to a known system or appliance with a purchase date. Add a purchase date to items like your water heater, HVAC, or roof to see them here.
                </p>
                <Button asChild variant="outline"><Link to="/binder">Go to Home Binder</Link></Button>
              </div>
            ) : (
              <div className="space-y-8">
                {(["overdue", "due_soon", "good"] as LifespanStatus[]).map((status) => {
                  const list = buckets[status];
                  if (list.length === 0) return null;
                  const meta = statusMeta[status];
                  return (
                    <div key={status}>
                      <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-1">
                        <meta.icon size={18} className={status === "overdue" ? "text-destructive" : status === "due_soon" ? "text-accent" : "text-primary"} />
                        {meta.title}
                        <span className="text-sm font-normal text-muted-foreground">({list.length})</span>
                      </h2>
                      <p className="text-xs text-muted-foreground mb-3">{meta.blurb}</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {list.map((m) => (
                          <div key={m.id} className={`rounded-xl border p-4 ${meta.className}`}>
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="font-semibold text-sm text-foreground">{m.name}</p>
                              <Badge variant="outline" className="text-xs shrink-0">{m.label}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{m.homeName}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {Math.round(m.ageYears)} yr{Math.round(m.ageYears) !== 1 ? "s" : ""} old · typical lifespan {m.minYears}–{m.maxYears} yrs
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {noDateCount > 0 && (
                  <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    {noDateCount} item{noDateCount !== 1 ? "s" : ""} in your binder {noDateCount !== 1 ? "don't" : "doesn't"} have a purchase date set —{" "}
                    <Link to="/binder" className="text-primary hover:underline font-medium">add one</Link> so they can be tracked here too.
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  Lifespan ranges are general US averages for informational purposes only — actual lifespan depends on usage, maintenance, and manufacturer.
                </p>
              </div>
            )}
          </UpgradeGate>
        )}
      </div>
    </DashboardShell>
  );
};

export default SystemLifespanTracker;
