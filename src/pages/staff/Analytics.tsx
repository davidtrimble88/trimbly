import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, Wrench, DollarSign, Package, TrendingUp } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type Row = Record<string, any>;

const fmtMoney = (n: number) =>
  isFinite(n) ? `$${Math.round(n).toLocaleString()}` : "—";

function groupBy<T extends Row>(rows: T[], keyFn: (r: T) => string) {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const k = keyFn(r) || "Unknown";
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(r);
  }
  return map;
}

const locKey = (city?: string | null, state?: string | null) =>
  [city?.trim() || "Unknown", state?.trim() || ""].filter(Boolean).join(", ");

const StaffAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<Row[]>([]);
  const [homes, setHomes] = useState<Row[]>([]);
  const [jobs, setJobs] = useState<Row[]>([]);
  const [bids, setBids] = useState<Row[]>([]);
  const [rentals, setRentals] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      const [p, h, j, b, r] = await Promise.all([
        supabase.from("providers").select("id, city, state, country, category, hourly_rate_min, hourly_rate_max"),
        supabase.from("homes").select("id, user_id, city, state, country"),
        supabase.from("jobs").select("id, city, state, category, budget_min, budget_max, status"),
        supabase.from("job_bids").select("id, job_id, bid_amount, estimated_hours, status, created_at"),
        supabase.from("equipment_rentals").select("id, city, state, category, price_day, price_hour, price_week, deposit_amount, available"),
      ]);
      setProviders(p.data || []);
      setHomes(h.data || []);
      setJobs(j.data || []);
      setBids(b.data || []);
      setRentals(r.data || []);
      setLoading(false);
    })();
  }, []);

  // Derive a job -> location/category lookup for bid analytics
  const jobLookup = useMemo(() => {
    const m = new Map<string, Row>();
    for (const j of jobs) m.set(j.id, j);
    return m;
  }, [jobs]);

  // Users by location (homeowners via homes + providers)
  const usersByLocation = useMemo(() => {
    const map = new Map<string, { homeowners: Set<string>; providers: number }>();
    for (const h of homes) {
      const k = locKey(h.city, h.state);
      if (!map.has(k)) map.set(k, { homeowners: new Set(), providers: 0 });
      map.get(k)!.homeowners.add(h.user_id);
    }
    for (const p of providers) {
      const k = locKey(p.city, p.state);
      if (!map.has(k)) map.set(k, { homeowners: new Set(), providers: 0 });
      map.get(k)!.providers += 1;
    }
    return Array.from(map.entries())
      .map(([loc, v]) => ({
        location: loc,
        homeowners: v.homeowners.size,
        providers: v.providers,
        total: v.homeowners.size + v.providers,
      }))
      .sort((a, b) => b.total - a.total);
  }, [homes, providers]);

  // Rentals by location
  const rentalsByLocation = useMemo(() => {
    const map = groupBy(rentals, (r) => locKey(r.city, r.state));
    return Array.from(map.entries())
      .map(([loc, items]) => {
        const dayPrices = items.map((i) => Number(i.price_day)).filter((n) => n > 0);
        const avgDay = dayPrices.length ? dayPrices.reduce((a, b) => a + b, 0) / dayPrices.length : 0;
        return {
          location: loc,
          listings: items.length,
          available: items.filter((i) => i.available).length,
          categories: new Set(items.map((i) => i.category)).size,
          avgDay,
        };
      })
      .sort((a, b) => b.listings - a.listings);
  }, [rentals]);

  // Avg bid cost by area (location of job)
  const bidsByArea = useMemo(() => {
    const map = new Map<string, { amounts: number[]; jobs: Set<string> }>();
    for (const bid of bids) {
      const job = jobLookup.get(bid.job_id);
      if (!job) continue;
      const k = locKey(job.city, job.state);
      if (!map.has(k)) map.set(k, { amounts: [], jobs: new Set() });
      const amt = Number(bid.bid_amount);
      if (amt > 0) map.get(k)!.amounts.push(amt);
      map.get(k)!.jobs.add(bid.job_id);
    }
    return Array.from(map.entries())
      .map(([loc, v]) => ({
        location: loc,
        bids: v.amounts.length,
        jobs: v.jobs.size,
        avg: v.amounts.length ? v.amounts.reduce((a, b) => a + b, 0) / v.amounts.length : 0,
        min: v.amounts.length ? Math.min(...v.amounts) : 0,
        max: v.amounts.length ? Math.max(...v.amounts) : 0,
      }))
      .sort((a, b) => b.bids - a.bids);
  }, [bids, jobLookup]);

  // Avg bid cost by category
  const bidsByCategory = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const bid of bids) {
      const job = jobLookup.get(bid.job_id);
      if (!job) continue;
      const cat = job.category || "Unknown";
      const amt = Number(bid.bid_amount);
      if (amt <= 0) continue;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(amt);
    }
    return Array.from(map.entries())
      .map(([category, amounts]) => ({
        category,
        bids: amounts.length,
        avg: amounts.reduce((a, b) => a + b, 0) / amounts.length,
        min: Math.min(...amounts),
        max: Math.max(...amounts),
      }))
      .sort((a, b) => b.bids - a.bids);
  }, [bids, jobLookup]);

  // Top locations overall (combined activity)
  const topLocations = useMemo(() => {
    const map = new Map<string, { users: number; jobs: number; rentals: number; providers: number }>();
    const bump = (k: string, field: "users" | "jobs" | "rentals" | "providers", n = 1) => {
      if (!map.has(k)) map.set(k, { users: 0, jobs: 0, rentals: 0, providers: 0 });
      map.get(k)![field] += n;
    };
    for (const u of usersByLocation) bump(u.location, "users", u.homeowners);
    for (const p of providers) bump(locKey(p.city, p.state), "providers");
    for (const j of jobs) bump(locKey(j.city, j.state), "jobs");
    for (const r of rentals) bump(locKey(r.city, r.state), "rentals");
    return Array.from(map.entries())
      .map(([location, v]) => ({ location, ...v, score: v.users + v.jobs + v.rentals + v.providers }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);
  }, [usersByLocation, providers, jobs, rentals]);

  const totals = useMemo(() => {
    const bidAmounts = bids.map((b) => Number(b.bid_amount)).filter((n) => n > 0);
    const avgBid = bidAmounts.length ? bidAmounts.reduce((a, b) => a + b, 0) / bidAmounts.length : 0;
    const uniqueLocations = new Set<string>();
    [...homes, ...providers, ...jobs, ...rentals].forEach((x: any) =>
      uniqueLocations.add(locKey(x.city, x.state))
    );
    return {
      totalHomeowners: new Set(homes.map((h) => h.user_id)).size,
      totalProviders: providers.length,
      totalJobs: jobs.length,
      totalRentals: rentals.length,
      totalBids: bids.length,
      avgBid,
      uniqueLocations: uniqueLocations.size,
    };
  }, [bids, homes, providers, jobs, rentals]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading analytics...</p>;

  const kpis = [
    { label: "Homeowners", value: totals.totalHomeowners, icon: Users },
    { label: "Providers", value: totals.totalProviders, icon: Wrench },
    { label: "Unique Locations", value: totals.uniqueLocations, icon: MapPin },
    { label: "Active Jobs", value: totals.totalJobs, icon: TrendingUp },
    { label: "Rental Listings", value: totals.totalRentals, icon: Package },
    { label: "Avg Bid", value: fmtMoney(totals.avgBid), icon: DollarSign, accent: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Platform Analytics</h2>
        <p className="text-sm text-muted-foreground">
          Users, locations, rentals, and bid pricing broken down by area
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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

      {/* Top locations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Top Locations (combined activity)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topLocations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No location data yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Homeowners</TableHead>
                  <TableHead className="text-right">Providers</TableHead>
                  <TableHead className="text-right">Jobs</TableHead>
                  <TableHead className="text-right">Rentals</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topLocations.map((l) => (
                  <TableRow key={l.location}>
                    <TableCell className="font-medium">{l.location}</TableCell>
                    <TableCell className="text-right">{l.users}</TableCell>
                    <TableCell className="text-right">{l.providers}</TableCell>
                    <TableCell className="text-right">{l.jobs}</TableCell>
                    <TableCell className="text-right">{l.rentals}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{l.score}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Users by location */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Users by Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          {usersByLocation.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Homeowners</TableHead>
                  <TableHead className="text-right">Providers</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersByLocation.slice(0, 25).map((u) => (
                  <TableRow key={u.location}>
                    <TableCell className="font-medium">{u.location}</TableCell>
                    <TableCell className="text-right">{u.homeowners}</TableCell>
                    <TableCell className="text-right">{u.providers}</TableCell>
                    <TableCell className="text-right font-semibold">{u.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Rentals by location */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" /> Equipment Rentals by Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rentalsByLocation.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rental listings yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Listings</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Categories</TableHead>
                  <TableHead className="text-right">Avg / day</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rentalsByLocation.slice(0, 25).map((r) => (
                  <TableRow key={r.location}>
                    <TableCell className="font-medium">{r.location}</TableCell>
                    <TableCell className="text-right">{r.listings}</TableCell>
                    <TableCell className="text-right">{r.available}</TableCell>
                    <TableCell className="text-right">{r.categories}</TableCell>
                    <TableCell className="text-right">{fmtMoney(r.avgDay)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Avg bid cost by area */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" /> Average Bid Cost by Area
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bidsByArea.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bids submitted yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Area</TableHead>
                  <TableHead className="text-right">Bids</TableHead>
                  <TableHead className="text-right">Jobs</TableHead>
                  <TableHead className="text-right">Min</TableHead>
                  <TableHead className="text-right">Avg</TableHead>
                  <TableHead className="text-right">Max</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bidsByArea.slice(0, 25).map((b) => (
                  <TableRow key={b.location}>
                    <TableCell className="font-medium">{b.location}</TableCell>
                    <TableCell className="text-right">{b.bids}</TableCell>
                    <TableCell className="text-right">{b.jobs}</TableCell>
                    <TableCell className="text-right">{fmtMoney(b.min)}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">{fmtMoney(b.avg)}</TableCell>
                    <TableCell className="text-right">{fmtMoney(b.max)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Avg bid cost by category */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="w-4 h-4 text-primary" /> Average Bid Cost by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bidsByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bids submitted yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Bids</TableHead>
                  <TableHead className="text-right">Min</TableHead>
                  <TableHead className="text-right">Avg</TableHead>
                  <TableHead className="text-right">Max</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bidsByCategory.map((b) => (
                  <TableRow key={b.category}>
                    <TableCell className="font-medium">{b.category}</TableCell>
                    <TableCell className="text-right">{b.bids}</TableCell>
                    <TableCell className="text-right">{fmtMoney(b.min)}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">{fmtMoney(b.avg)}</TableCell>
                    <TableCell className="text-right">{fmtMoney(b.max)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffAnalytics;
