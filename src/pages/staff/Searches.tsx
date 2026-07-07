import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Sparkles, BookOpen, TrendingUp, Users as UsersIcon, Activity } from "lucide-react";

type Row = {
  id: string;
  user_id: string | null;
  search_type: string;
  query: string;
  category: string | null;
  location: string | null;
  results_count: number | null;
  metadata: any;
  created_at: string;
};

type Range = "24h" | "7d" | "30d" | "all";

const rangeMs: Record<Range, number | null> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  all: null,
};

export default function StaffSearches() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("7d");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase.from("search_logs").select("*").order("created_at", { ascending: false }).limit(2000);
      const ms = rangeMs[range];
      if (ms) q = q.gte("created_at", new Date(Date.now() - ms).toISOString());
      const { data } = await q;
      setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
  }, [range]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (typeFilter !== "all" && r.search_type !== typeFilter) return false;
      if (!s) return true;
      return (
        r.query.toLowerCase().includes(s) ||
        (r.category ?? "").toLowerCase().includes(s) ||
        (r.location ?? "").toLowerCase().includes(s)
      );
    });
  }, [rows, search, typeFilter]);

  const stats = useMemo(() => {
    const total = rows.length;
    const byType = rows.reduce<Record<string, number>>((a, r) => {
      a[r.search_type] = (a[r.search_type] || 0) + 1;
      return a;
    }, {});
    const uniqueUsers = new Set(rows.filter((r) => r.user_id).map((r) => r.user_id)).size;
    const anonCount = rows.filter((r) => !r.user_id).length;
    return { total, byType, uniqueUsers, anonCount };
  }, [rows]);

  const topQueries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const q = r.query.trim().toLowerCase();
      if (!q) continue;
      counts.set(q, (counts.get(q) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [rows]);

  const topCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const c = (r.category || "").trim();
      if (!c) continue;
      counts.set(c, (counts.get(c) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [rows]);

  const topLocations = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const c = (r.location || "").trim();
      if (!c) continue;
      counts.set(c, (counts.get(c) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [rows]);

  const typeIcon = (t: string) => {
    if (t === "ai") return <Sparkles size={12} className="text-accent" />;
    if (t === "manual") return <BookOpen size={12} className="text-blue-600" />;
    return <Search size={12} className="text-primary" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Search Analytics</h2>
          <p className="text-sm text-muted-foreground">What users are searching for across the platform.</p>
        </div>
        <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
          <TabsList>
            <TabsTrigger value="24h">24h</TabsTrigger>
            <TabsTrigger value="7d">7 days</TabsTrigger>
            <TabsTrigger value="30d">30 days</TabsTrigger>
            <TabsTrigger value="all">All time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile icon={<Activity size={16} />} label="Total searches" value={stats.total} />
        <StatTile icon={<UsersIcon size={16} />} label="Unique users" value={stats.uniqueUsers} sub={`${stats.anonCount} anonymous`} />
        <StatTile icon={<Search size={16} />} label="Provider searches" value={stats.byType.provider || 0} />
        <StatTile icon={<Sparkles size={16} />} label="AI searches" value={stats.byType.ai || 0} sub={`Manual: ${stats.byType.manual || 0}`} />
      </div>

      {/* Top lists */}
      <div className="grid md:grid-cols-3 gap-3">
        <TopList title="Top queries" icon={<TrendingUp size={14} />} items={topQueries} />
        <TopList title="Top categories" icon={<TrendingUp size={14} />} items={topCategories} />
        <TopList title="Top locations" icon={<TrendingUp size={14} />} items={topLocations} />
      </div>

      {/* Recent log */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-foreground flex-1">Recent searches ({filtered.length})</h3>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs h-8 rounded border border-border bg-background px-2"
            >
              <option value="all">All types</option>
              <option value="provider">Provider</option>
              <option value="ai">AI</option>
              <option value="manual">Manual</option>
            </select>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter query, category, location..."
              className="h-8 text-xs max-w-xs"
            />
          </div>

          {loading ? (
            <div className="space-y-2 py-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No searches recorded yet for this range.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Type</TableHead>
                    <TableHead>Query</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="w-20 text-right">Results</TableHead>
                    <TableHead className="w-20">User</TableHead>
                    <TableHead className="w-40">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 200).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Badge variant="secondary" className="gap-1 text-xs capitalize">
                          {typeIcon(r.search_type)} {r.search_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate font-medium text-foreground">{r.query || <span className="text-muted-foreground italic">(empty)</span>}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.category || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.location || "—"}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">{r.results_count ?? "—"}</TableCell>
                      <TableCell className="text-xs">
                        {r.user_id ? <Badge variant="outline" className="text-[10px]">user</Badge> : <Badge variant="outline" className="text-[10px]">anon</Badge>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filtered.length > 200 && (
                <p className="text-xs text-muted-foreground text-center pt-2">Showing 200 of {filtered.length}. Narrow the filter to see more.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">{icon} {label}</div>
        <div className="text-2xl font-bold text-foreground">{value.toLocaleString()}</div>
        {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function TopList({ title, icon, items }: { title: string; icon: React.ReactNode; items: [string, number][] }) {
  const max = items[0]?.[1] || 1;
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">{icon} {title}</h3>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">No data.</p>
        ) : (
          <ul className="space-y-1.5">
            {items.map(([label, count]) => (
              <li key={label} className="text-xs">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="truncate text-foreground">{label}</span>
                  <span className="text-muted-foreground tabular-nums">{count}</span>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${(count / max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
