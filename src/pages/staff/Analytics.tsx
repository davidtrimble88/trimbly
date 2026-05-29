import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Users, MapPin, Wrench, DollarSign, Package, TrendingUp, Download, RefreshCw, Globe } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import * as XLSX from "xlsx";
import { toast } from "@/hooks/use-toast";

type RegionRow = {
  region: string; homeowners: number; providers: number; jobs: number; rentals: number;
  total_users: number; bid_count: number; avg_bid: number; avg_rental_day: number;
};
type StateRow = {
  key: string; label: string; region: string; country: string; state: string;
  homeowners: number; providers: number; jobs: number; rentals: number; total_users: number;
  bid_count: number; avg_bid: number; min_bid: number; max_bid: number;
  rental_count: number; avg_rental_day: number;
};
type CategoryRow = { category: string; bids: number; avg_bid: number; min_bid: number; max_bid: number };
type Totals = {
  homeowners: number; providers: number; jobs: number; bids: number; rentals: number;
  states_active: number; regions_active: number; avg_bid_overall: number;
};
type Payload = {
  totals: Totals; byRegion: RegionRow[]; byState: StateRow[]; byCategory: CategoryRow[]; generated_at: string;
};

const COUNTRY_OPTIONS = [
  { value: "all", label: "All countries" },
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
];
const CHART_COLORS = ["#3da06e", "#f59e0b", "#3b82f6", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899", "#10b981", "#f97316", "#6366f1"];
const fmt = (n: number) => (isFinite(n) ? n.toLocaleString() : "—");
const fmtMoney = (n: number) => (isFinite(n) && n > 0 ? `$${Math.round(n).toLocaleString()}` : "—");

const StaffAnalytics = () => {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [country, setCountry] = useState<string>("all");
  const [region, setRegion] = useState<string>("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setRefreshing(true);
    const { data: res, error } = await supabase.functions.invoke("staff-analytics");
    setRefreshing(false);
    setLoading(false);
    if (error) {
      toast({ title: "Failed to load analytics", description: error.message, variant: "destructive" });
      return;
    }
    setData(res as Payload);
  };

  useEffect(() => { load(); }, []);

  const regionOptions = useMemo(() => {
    if (!data) return [{ value: "all", label: "All regions" }];
    const filtered = country === "all"
      ? data.byRegion
      : data.byRegion.filter((r) => r.region.startsWith(country === "US" ? "US" : "CA"));
    return [{ value: "all", label: "All regions" }, ...filtered.map((r) => ({ value: r.region, label: r.region }))];
  }, [data, country]);

  const filteredRegions = useMemo(() => {
    if (!data) return [];
    return data.byRegion.filter((r) => {
      if (country !== "all" && !r.region.startsWith(country === "US" ? "US" : "CA")) return false;
      if (region !== "all" && r.region !== region) return false;
      return true;
    }).sort((a, b) => b.total_users - a.total_users);
  }, [data, country, region]);

  const filteredStates = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.byState.filter((s) => {
      if (country !== "all" && s.country !== country) return false;
      if (region !== "all" && s.region !== region) return false;
      if (q && !`${s.label} ${s.region}`.toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => b.total_users - a.total_users);
  }, [data, country, region, search]);

  const exportExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    const summary = [
      ["Metric", "Value"],
      ["Generated", new Date(data.generated_at).toLocaleString()],
      ["Homeowners", data.totals.homeowners],
      ["Providers", data.totals.providers],
      ["Jobs", data.totals.jobs],
      ["Bids", data.totals.bids],
      ["Rentals", data.totals.rentals],
      ["Active states/provinces", data.totals.states_active],
      ["Active regions", data.totals.regions_active],
      ["Avg bid (all areas)", Math.round(data.totals.avg_bid_overall)],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Summary");

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filteredRegions.map((r) => ({
      Region: r.region, Homeowners: r.homeowners, Providers: r.providers, Jobs: r.jobs, Rentals: r.rentals,
      "Total Users": r.total_users, Bids: r.bid_count, "Avg Bid": Math.round(r.avg_bid), "Avg Rental/day": Math.round(r.avg_rental_day),
    }))), "By Region");

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filteredStates.map((s) => ({
      Country: s.country, State: s.state, Region: s.region, Homeowners: s.homeowners, Providers: s.providers,
      Jobs: s.jobs, Rentals: s.rentals, "Total Users": s.total_users, Bids: s.bid_count,
      "Avg Bid": Math.round(s.avg_bid), "Min Bid": Math.round(s.min_bid), "Max Bid": Math.round(s.max_bid),
      "Avg Rental/day": Math.round(s.avg_rental_day),
    }))), "By State");

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.byCategory.map((c) => ({
      Category: c.category, Bids: c.bids, "Avg Bid": Math.round(c.avg_bid),
      "Min Bid": Math.round(c.min_bid), "Max Bid": Math.round(c.max_bid),
    }))), "By Category");

    XLSX.writeFile(wb, `trimbly-analytics-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading analytics…</p>;
  if (!data) return <p className="text-sm text-muted-foreground">No data available.</p>;

  const kpis = [
    { label: "Homeowners", value: fmt(data.totals.homeowners), icon: Users },
    { label: "Providers", value: fmt(data.totals.providers), icon: Wrench },
    { label: "States / Provinces", value: fmt(data.totals.states_active), icon: MapPin },
    { label: "Regions", value: fmt(data.totals.regions_active), icon: Globe },
    { label: "Jobs", value: fmt(data.totals.jobs), icon: TrendingUp },
    { label: "Rentals", value: fmt(data.totals.rentals), icon: Package },
    { label: "Avg Bid", value: fmtMoney(data.totals.avg_bid_overall), icon: DollarSign, accent: true },
  ];

  // Top 10 slices for charts (so they stay readable at scale)
  const topStatesByUsers = [...filteredStates].slice(0, 10);
  const topStatesByBids = [...filteredStates].filter((s) => s.bid_count > 0).sort((a, b) => b.avg_bid - a.avg_bid).slice(0, 10);
  const topStatesByRentals = [...filteredStates].filter((s) => s.rentals > 0).sort((a, b) => b.rentals - a.rentals).slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Platform Analytics</h2>
          <p className="text-sm text-muted-foreground">
            US &amp; Canada activity grouped by region and state · {fmt(data.totals.homeowners + data.totals.providers)} users analyzed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={exportExcel}>
            <Download className="w-4 h-4 mr-1" /> Excel
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className={k.accent ? "border-primary/40 bg-primary/5" : ""}>
            <CardContent className="pt-5">
              <k.icon className={`w-4 h-4 mb-2 ${k.accent ? "text-primary" : "text-muted-foreground"}`} />
              <p className="text-xl font-bold text-foreground">{k.value}</p>
              <p className="text-[11px] text-muted-foreground">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-5 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-muted-foreground mb-1 block">Country</label>
            <Select value={country} onValueChange={(v) => { setCountry(v); setRegion("all"); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COUNTRY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground mb-1 block">Region</label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {regionOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground mb-1 block">Search state / province</label>
            <Input placeholder="e.g. CA, Ontario, TX" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="regions">
        <TabsList>
          <TabsTrigger value="regions">Regions</TabsTrigger>
          <TabsTrigger value="states">States / Provinces</TabsTrigger>
          <TabsTrigger value="bids">Bid Pricing</TabsTrigger>
          <TabsTrigger value="rentals">Rentals</TabsTrigger>
        </TabsList>

        {/* REGIONS */}
        <TabsContent value="regions" className="space-y-4 mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Users by Region</CardTitle></CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredRegions}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="region" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={70} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="homeowners" stackId="u" fill={CHART_COLORS[0]} name="Homeowners" />
                    <Bar dataKey="providers" stackId="u" fill={CHART_COLORS[1]} name="Providers" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">User Share by Region</CardTitle></CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={filteredRegions} dataKey="total_users" nameKey="region" outerRadius={110} label={(e) => e.region}>
                      {filteredRegions.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Region Breakdown</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Region</TableHead>
                    <TableHead className="text-right">Homeowners</TableHead>
                    <TableHead className="text-right">Providers</TableHead>
                    <TableHead className="text-right">Jobs</TableHead>
                    <TableHead className="text-right">Rentals</TableHead>
                    <TableHead className="text-right">Bids</TableHead>
                    <TableHead className="text-right">Avg Bid</TableHead>
                    <TableHead className="text-right">Avg Rental/day</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegions.map((r) => (
                    <TableRow key={r.region}>
                      <TableCell className="font-medium">{r.region}</TableCell>
                      <TableCell className="text-right">{fmt(r.homeowners)}</TableCell>
                      <TableCell className="text-right">{fmt(r.providers)}</TableCell>
                      <TableCell className="text-right">{fmt(r.jobs)}</TableCell>
                      <TableCell className="text-right">{fmt(r.rentals)}</TableCell>
                      <TableCell className="text-right">{fmt(r.bid_count)}</TableCell>
                      <TableCell className="text-right text-primary font-medium">{fmtMoney(r.avg_bid)}</TableCell>
                      <TableCell className="text-right">{fmtMoney(r.avg_rental_day)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STATES */}
        <TabsContent value="states" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Top 10 States / Provinces by Users</CardTitle></CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topStatesByUsers} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="label" type="category" width={140} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="homeowners" stackId="u" fill={CHART_COLORS[0]} name="Homeowners" />
                  <Bar dataKey="providers" stackId="u" fill={CHART_COLORS[1]} name="Providers" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">All States / Provinces ({fmt(filteredStates.length)})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>State / Province</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead className="text-right">Homeowners</TableHead>
                      <TableHead className="text-right">Providers</TableHead>
                      <TableHead className="text-right">Jobs</TableHead>
                      <TableHead className="text-right">Rentals</TableHead>
                      <TableHead className="text-right">Avg Bid</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStates.map((s) => (
                      <TableRow key={s.key}>
                        <TableCell className="font-medium">{s.label}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.region}</TableCell>
                        <TableCell className="text-right">{fmt(s.homeowners)}</TableCell>
                        <TableCell className="text-right">{fmt(s.providers)}</TableCell>
                        <TableCell className="text-right">{fmt(s.jobs)}</TableCell>
                        <TableCell className="text-right">{fmt(s.rentals)}</TableCell>
                        <TableCell className="text-right text-primary">{fmtMoney(s.avg_bid)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BIDS */}
        <TabsContent value="bids" className="space-y-4 mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Avg Bid by Region</CardTitle></CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredRegions}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="region" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={70} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip formatter={(v: any) => fmtMoney(Number(v))} />
                    <Bar dataKey="avg_bid" fill={CHART_COLORS[2]} name="Avg Bid" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Top 10 States by Avg Bid</CardTitle></CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topStatesByBids} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} />
                    <YAxis dataKey="label" type="category" width={140} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => fmtMoney(Number(v))} />
                    <Bar dataKey="avg_bid" fill={CHART_COLORS[2]} name="Avg Bid" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Avg Bid by Category</CardTitle></CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byCategory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={70} />
                  <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => fmtMoney(Number(v))} />
                  <Legend />
                  <Bar dataKey="avg_bid" fill={CHART_COLORS[3]} name="Avg Bid" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RENTALS */}
        <TabsContent value="rentals" className="space-y-4 mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Rentals by Region</CardTitle></CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredRegions}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="region" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={70} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="rentals" fill={CHART_COLORS[4]} name="Listings" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Top 10 States by Rental Listings</CardTitle></CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topStatesByRentals} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="label" type="category" width={140} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="rentals" fill={CHART_COLORS[4]} name="Listings" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Avg Rental Day Rate by Region</CardTitle></CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredRegions}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="region" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={70} />
                  <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => fmtMoney(Number(v))} />
                  <Bar dataKey="avg_rental_day" fill={CHART_COLORS[5]} name="Avg / day" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StaffAnalytics;
