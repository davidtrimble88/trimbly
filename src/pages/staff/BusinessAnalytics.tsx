import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DollarSign, Users, TrendingUp, RefreshCw, Download, CreditCard,
  UserCheck, Briefcase, Package, Crown, Activity,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
} from "recharts";
import * as XLSX from "xlsx";
import { toast } from "@/hooks/use-toast";

type SubRow = {
  audience: string; tier_key: string; tier: string;
  count: number; monthly_price: number; mrr: number;
};
type GrowthRow = {
  month: string; homeowners_new: number; providers_new: number; paid_new: number;
  jobs_new: number; bids_new: number; rentals_new: number; agreements_new: number;
};
type Totals = {
  total_users: number; homeowners: number; providers: number;
  paid_homeowners: number; paid_providers: number; paid_total: number;
  suspended_users: number; conversion_rate: number;
  mrr: number; arr: number; mrr_homeowners: number; mrr_providers: number;
  arpu: number; arppu: number;
  gmv_bids_total: number; gmv_bids_accepted: number; gmv_rentals_signed: number;
  total_jobs: number; completed_jobs: number; active_jobs: number;
  total_bids: number; accepted_bids: number; avg_bid: number;
  verified_providers: number; featured_providers: number;
  total_rentals: number; available_rentals: number; signed_agreements: number;
};
type Payload = {
  totals: Totals; subscriptionBreakdown: SubRow[]; growth: GrowthRow[]; generated_at: string;
};

const CHART_COLORS = ["#3da06e", "#f59e0b", "#3b82f6", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899", "#10b981"];
const money = (n: number) =>
  isFinite(n) ? `$${Math.round(n).toLocaleString()}` : "—";
const moneyDetailed = (n: number) =>
  isFinite(n) ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—";
const num = (n: number) => (isFinite(n) ? n.toLocaleString() : "—");
const pct = (n: number) => (isFinite(n) ? `${n.toFixed(1)}%` : "—");

function KPI({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub?: string; icon: any; accent?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="font-display text-2xl font-bold text-foreground mt-1 truncate">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg ${accent || "bg-primary/10 text-primary"}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const BusinessAnalytics = () => {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    const { data: res, error } = await supabase.functions.invoke("staff-business-analytics");
    setRefreshing(false);
    setLoading(false);
    if (error) {
      toast({ title: "Failed to load business analytics", description: error.message, variant: "destructive" });
      return;
    }
    setData(res as Payload);
  };

  useEffect(() => { load(); }, []);

  const downloadExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();
    const summary = [
      { metric: "Total users", value: data.totals.total_users },
      { metric: "Homeowners", value: data.totals.homeowners },
      { metric: "Providers", value: data.totals.providers },
      { metric: "Paid homeowners", value: data.totals.paid_homeowners },
      { metric: "Paid providers", value: data.totals.paid_providers },
      { metric: "Paid conversion %", value: Number(data.totals.conversion_rate.toFixed(2)) },
      { metric: "MRR (USD)", value: Math.round(data.totals.mrr) },
      { metric: "ARR (USD)", value: Math.round(data.totals.arr) },
      { metric: "MRR homeowners", value: Math.round(data.totals.mrr_homeowners) },
      { metric: "MRR providers", value: Math.round(data.totals.mrr_providers) },
      { metric: "ARPU", value: Number(data.totals.arpu.toFixed(2)) },
      { metric: "ARPPU (paid only)", value: Number(data.totals.arppu.toFixed(2)) },
      { metric: "GMV bids total", value: Math.round(data.totals.gmv_bids_total) },
      { metric: "GMV bids accepted", value: Math.round(data.totals.gmv_bids_accepted) },
      { metric: "GMV signed rentals", value: Math.round(data.totals.gmv_rentals_signed) },
      { metric: "Total jobs", value: data.totals.total_jobs },
      { metric: "Completed jobs", value: data.totals.completed_jobs },
      { metric: "Suspended users", value: data.totals.suspended_users },
      { metric: "Generated at", value: data.generated_at },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "Summary");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.subscriptionBreakdown), "Subscriptions");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.growth), "Growth (12 mo)");
    XLSX.writeFile(wb, `trimbly-business-analytics-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading business analytics…</div>;
  }
  if (!data) {
    return <div className="text-sm text-destructive">No data available.</div>;
  }

  const t = data.totals;
  const subRows = data.subscriptionBreakdown;
  const paidBreakdown = subRows.filter((s) => s.tier_key !== "free");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Business Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Revenue, subscriptions, and user economics. Generated {new Date(data.generated_at).toLocaleString()}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={downloadExcel}>
            <Download className="h-4 w-4 mr-1" /> Excel
          </Button>
        </div>
      </div>

      {/* Money KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="MRR" value={money(t.mrr)} sub={`${money(t.mrr_homeowners)} HO · ${money(t.mrr_providers)} Pro`} icon={DollarSign} accent="bg-green-500/10 text-green-600" />
        <KPI label="ARR (projected)" value={money(t.arr)} sub="MRR × 12" icon={TrendingUp} accent="bg-emerald-500/10 text-emerald-600" />
        <KPI label="ARPU" value={moneyDetailed(t.arpu)} sub="All users" icon={CreditCard} />
        <KPI label="ARPPU" value={moneyDetailed(t.arppu)} sub="Paying users only" icon={Crown} accent="bg-amber-500/10 text-amber-600" />
      </div>

      {/* Users + conversion KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPI label="Total users" value={num(t.total_users)} icon={Users} />
        <KPI label="Homeowners" value={num(t.homeowners)} sub={`${num(t.paid_homeowners)} paying`} icon={Users} />
        <KPI label="Providers" value={num(t.providers)} sub={`${num(t.paid_providers)} paying`} icon={UserCheck} />
        <KPI label="Paid conversion" value={pct(t.conversion_rate)} sub={`${num(t.paid_total)} paying`} icon={Activity} accent="bg-blue-500/10 text-blue-600" />
        <KPI label="Verified pros" value={num(t.verified_providers)} sub={`${num(t.featured_providers)} featured`} icon={Crown} />
        <KPI label="Suspended" value={num(t.suspended_users)} icon={Users} accent="bg-destructive/10 text-destructive" />
      </div>

      <Tabs defaultValue="subscriptions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="money">Money & GMV</TabsTrigger>
          <TabsTrigger value="growth">Growth (12 mo)</TabsTrigger>
        </TabsList>

        {/* SUBSCRIPTIONS */}
        <TabsContent value="subscriptions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">MRR by tier</CardTitle></CardHeader>
              <CardContent style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="tier" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={70} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => money(Number(v))} />
                    <Bar dataKey="mrr" fill="#3da06e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Paying users by tier</CardTitle></CardHeader>
              <CardContent style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={paidBreakdown} dataKey="count" nameKey="tier" outerRadius={100} label={(e: any) => `${e.tier}: ${e.count}`}>
                      {paidBreakdown.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Subscription breakdown</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Audience</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead className="text-right">Subscribers</TableHead>
                    <TableHead className="text-right">Price/mo</TableHead>
                    <TableHead className="text-right">MRR</TableHead>
                    <TableHead className="text-right">ARR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subRows.map((s) => (
                    <TableRow key={`${s.audience}-${s.tier_key}`}>
                      <TableCell>
                        <Badge variant={s.audience === "Provider" ? "secondary" : "outline"}>{s.audience}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{s.tier}</TableCell>
                      <TableCell className="text-right">{num(s.count)}</TableCell>
                      <TableCell className="text-right">{money(s.monthly_price)}</TableCell>
                      <TableCell className="text-right font-semibold">{money(s.mrr)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{money(s.mrr * 12)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* USERS */}
        <TabsContent value="users" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">User mix</CardTitle></CardHeader>
              <CardContent style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Homeowners (free)", value: t.homeowners - t.paid_homeowners },
                        { name: "Homeowners (paid)", value: t.paid_homeowners },
                        { name: "Providers (free)", value: t.providers - t.paid_providers },
                        { name: "Providers (paid)", value: t.paid_providers },
                      ]}
                      dataKey="value" nameKey="name" outerRadius={100} label
                    >
                      {[0, 1, 2, 3].map((i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Paid vs free</CardTitle></CardHeader>
              <CardContent style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { group: "Homeowners", Free: t.homeowners - t.paid_homeowners, Paid: t.paid_homeowners },
                    { group: "Providers", Free: t.providers - t.paid_providers, Paid: t.paid_providers },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="group" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Free" stackId="a" fill="#94a3b8" />
                    <Bar dataKey="Paid" stackId="a" fill="#3da06e" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* MONEY */}
        <TabsContent value="money" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <KPI label="GMV bids submitted" value={money(t.gmv_bids_total)} sub={`${num(t.total_bids)} bids · avg ${money(t.avg_bid)}`} icon={Briefcase} />
            <KPI label="GMV bids accepted" value={money(t.gmv_bids_accepted)} sub={`${num(t.accepted_bids)} accepted`} icon={Briefcase} accent="bg-green-500/10 text-green-600" />
            <KPI label="GMV signed rentals" value={money(t.gmv_rentals_signed)} sub={`${num(t.signed_agreements)} agreements`} icon={Package} accent="bg-amber-500/10 text-amber-600" />
            <KPI label="Active jobs" value={num(t.active_jobs)} icon={Briefcase} />
            <KPI label="Completed jobs" value={num(t.completed_jobs)} sub={`${num(t.total_jobs)} total`} icon={Briefcase} accent="bg-blue-500/10 text-blue-600" />
            <KPI label="Available rentals" value={num(t.available_rentals)} sub={`${num(t.total_rentals)} listed`} icon={Package} />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Marketplace GMV</CardTitle></CardHeader>
            <CardContent style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: "Bids submitted", value: t.gmv_bids_total },
                  { name: "Bids accepted", value: t.gmv_bids_accepted },
                  { name: "Signed rentals", value: t.gmv_rentals_signed },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => money(Number(v))} />
                  <Bar dataKey="value" fill="#3da06e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GROWTH */}
        <TabsContent value="growth" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Signups by month</CardTitle></CardHeader>
            <CardContent style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.growth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="homeowners_new" stackId="1" stroke="#3da06e" fill="#3da06e" name="Homeowners" />
                  <Area type="monotone" dataKey="providers_new" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="Providers" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Paid signups by month</CardTitle></CardHeader>
              <CardContent style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.growth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="paid_new" stroke="#3da06e" strokeWidth={2} dot={false} name="Paid signups" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Marketplace activity by month</CardTitle></CardHeader>
              <CardContent style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.growth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="jobs_new" fill="#3b82f6" name="Jobs" />
                    <Bar dataKey="bids_new" fill="#8b5cf6" name="Bids" />
                    <Bar dataKey="rentals_new" fill="#f59e0b" name="Rentals" />
                    <Bar dataKey="agreements_new" fill="#ef4444" name="Agreements" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BusinessAnalytics;
