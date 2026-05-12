import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Briefcase, ShieldCheck, MessageSquare, DollarSign, Inbox, TrendingUp, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface Stats {
  totalUsers: number;
  homeowners: number;
  providers: number;
  homeownerPro: number;
  multiHomeownerPro: number;
  providerPro: number;
  totalJobs: number;
  openJobs: number;
  newContacts: number;
  totalContacts: number;
  pendingOutreach: number;
  flaggedReviews: number;
  totalReviews: number;
  totalProviders: number;
  verifiedProviders: number;
}

const PRICING: Record<string, number> = {
  homeowner_pro: 10,
  multi_homeowner_pro: 20,
  pro: 29,
};

const Dashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const [profiles, jobs, contacts, pending, reviews, providers] = await Promise.all([
      supabase.from("profiles").select("user_type, subscription_tier"),
      supabase.from("jobs").select("status"),
      supabase.from("contact_messages").select("status"),
      supabase.from("pending_messages").select("status"),
      supabase.from("reviews").select("flagged"),
      supabase.from("providers").select("subscription_tier, verified"),
    ]);

    const profs = profiles.data || [];
    const provs = providers.data || [];
    setStats({
      totalUsers: profs.length,
      homeowners: profs.filter((p) => p.user_type === "homeowner").length,
      providers: profs.filter((p) => p.user_type === "provider").length,
      homeownerPro: profs.filter((p) => p.subscription_tier === "homeowner_pro").length,
      multiHomeownerPro: profs.filter((p) => p.subscription_tier === "multi_homeowner_pro").length,
      providerPro: provs.filter((p) => p.subscription_tier === "pro").length,
      totalJobs: (jobs.data || []).length,
      openJobs: (jobs.data || []).filter((j) => j.status === "pending" || j.status === "open").length,
      newContacts: (contacts.data || []).filter((c) => c.status === "new").length,
      totalContacts: (contacts.data || []).length,
      pendingOutreach: (pending.data || []).filter((p) => p.status === "pending").length,
      flaggedReviews: (reviews.data || []).filter((r) => r.flagged).length,
      totalReviews: (reviews.data || []).length,
      totalProviders: provs.length,
      verifiedProviders: provs.filter((p) => p.verified).length,
    });
  };

  if (!stats) return <p className="text-sm text-muted-foreground">Loading metrics...</p>;

  const mrr =
    stats.homeownerPro * PRICING.homeowner_pro +
    stats.multiHomeownerPro * PRICING.multi_homeowner_pro +
    stats.providerPro * PRICING.pro;

  const kpis = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, link: "/staff/users", sub: `${stats.homeowners} homeowners · ${stats.providers} pros` },
    { label: "Estimated MRR", value: `$${mrr.toLocaleString()}`, icon: DollarSign, accent: true, sub: `${stats.homeownerPro + stats.multiHomeownerPro + stats.providerPro} paid subs` },
    { label: "Open Jobs", value: stats.openJobs, icon: Briefcase, link: "/staff/jobs", sub: `${stats.totalJobs} total` },
    { label: "New Contacts", value: stats.newContacts, icon: Inbox, link: "/staff/contacts", sub: `${stats.totalContacts} total`, urgent: stats.newContacts > 0 },
    { label: "Pending Outreach", value: stats.pendingOutreach, icon: MessageSquare, link: "/staff/outreach", sub: "to unregistered pros" },
    { label: "Flagged Reviews", value: stats.flaggedReviews, icon: Star, link: "/staff/moderation", sub: `${stats.totalReviews} reviews total`, urgent: stats.flaggedReviews > 0 },
    { label: "Verified Providers", value: stats.verifiedProviders, icon: ShieldCheck, link: "/staff/providers", sub: `${stats.totalProviders} listings` },
    { label: "Active Subscribers", value: stats.homeownerPro + stats.multiHomeownerPro + stats.providerPro, icon: TrendingUp, sub: "Across all tiers" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Business Overview</h2>
        <p className="text-sm text-muted-foreground">Real-time metrics across the platform</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => {
          const card = (
            <Card key={k.label} className={`hover:shadow-md transition-shadow ${k.accent ? "border-primary/40 bg-primary/5" : ""} ${k.urgent ? "border-destructive/40" : ""}`}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-2">
                  <k.icon className={`w-5 h-5 ${k.accent ? "text-primary" : "text-muted-foreground"}`} />
                  {k.urgent && <Badge variant="destructive" className="text-[10px]">Action</Badge>}
                </div>
                <p className="text-2xl font-bold text-foreground">{k.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
                {k.sub && <p className="text-[11px] text-muted-foreground mt-1">{k.sub}</p>}
              </CardContent>
            </Card>
          );
          return k.link ? <Link key={k.label} to={k.link}>{card}</Link> : card;
        })}
      </div>

      {/* Subscription breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" /> Subscription Revenue Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 font-medium">Tier</th>
                  <th className="py-2 font-medium">Audience</th>
                  <th className="py-2 font-medium text-right">Subscribers</th>
                  <th className="py-2 font-medium text-right">Price/mo</th>
                  <th className="py-2 font-medium text-right">MRR</th>
                </tr>
              </thead>
              <tbody>
                <SubRow name="Home Hero" audience="Homeowners" count={stats.homeownerPro} price={PRICING.homeowner_pro} />
                <SubRow name="Home Super Hero" audience="Homeowners" count={stats.multiHomeownerPro} price={PRICING.multi_homeowner_pro} />
                <SubRow name="Provider Pro" audience="Service Providers" count={stats.providerPro} price={PRICING.pro} />
                <tr className="font-semibold bg-muted/40">
                  <td className="py-3 px-2" colSpan={2}>Total Recurring Revenue</td>
                  <td className="py-3 text-right">{stats.homeownerPro + stats.multiHomeownerPro + stats.providerPro}</td>
                  <td></td>
                  <td className="py-3 text-right text-primary">${mrr.toLocaleString()}/mo</td>
                </tr>
                <tr className="text-xs text-muted-foreground">
                  <td colSpan={4} className="pt-2 px-2">Annualized projection</td>
                  <td className="text-right pt-2">${(mrr * 12).toLocaleString()}/yr</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const SubRow = ({ name, audience, count, price }: { name: string; audience: string; count: number; price: number }) => (
  <tr className="border-b border-border last:border-0">
    <td className="py-3 px-2 font-medium text-foreground">{name}</td>
    <td className="py-3 text-muted-foreground">{audience}</td>
    <td className="py-3 text-right">{count}</td>
    <td className="py-3 text-right text-muted-foreground">${price}</td>
    <td className="py-3 text-right font-medium">${(count * price).toLocaleString()}</td>
  </tr>
);

export default Dashboard;
