import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { Search, Star, ShieldCheck } from "lucide-react";

const AUTO_CATEGORIES = ["Auto Repair", "Mechanic", "Motorcycle Repair", "Auto Body", "Tire Shop"];

type Provider = {
  id: string; business_name: string; category: string; city: string; state: string;
  slug: string | null; subscription_tier: string; verified: boolean;
};
type Stats = { provider_id: string; avg_rating: number | null; review_count: number | null };

export default function GarageMechanics() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Provider[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, Stats>>({});
  const [loading, setLoading] = useState(true);
  const [vehicleType, setVehicleType] = useState<"all" | "auto" | "motorcycle">("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);

  const load = async () => {
    setLoading(true);
    let query = supabase.from("providers").select("id, business_name, category, city, state, slug, subscription_tier, verified");
    query = query.or(AUTO_CATEGORIES.map((c) => `category.ilike.%${c}%`).join(",") + ",business_name.ilike.%mechanic%,business_name.ilike.%auto%,business_name.ilike.%motorcycle%");
    if (q.trim()) query = query.or(`business_name.ilike.%${q}%,city.ilike.%${q}%,state.ilike.%${q}%`);
    if (vehicleType === "motorcycle") query = query.ilike("category", "%motorcycle%");
    if (verifiedOnly) query = query.eq("verified", true);
    const { data } = await query.limit(50);
    const providers = (data as Provider[]) || [];
    setResults(providers);

    if (providers.length > 0) {
      const { data: stats } = await supabase
        .from("provider_stats")
        .select("provider_id, avg_rating, review_count")
        .in("provider_id", providers.map((p) => p.id));
      const map: Record<string, Stats> = {};
      (stats || []).forEach((s: Stats) => { if (s.provider_id) map[s.provider_id] = s; });
      setStatsMap(map);
    } else {
      setStatsMap({});
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [vehicleType, verifiedOnly]);

  const visible = results
    .filter((p) => (statsMap[p.id]?.avg_rating || 0) >= minRating)
    .sort((a, b) => {
      // Verified and higher-rated pros surface first.
      if (a.verified !== b.verified) return a.verified ? -1 : 1;
      const ra = statsMap[a.id]?.avg_rating || 0;
      const rb = statsMap[b.id]?.avg_rating || 0;
      return rb - ra;
    });

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Find a Mechanic</h1>
      <p className="text-sm text-muted-foreground">Trimbly pros who work on cars and motorcycles. Message first — phone only after they approve.</p>

      <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Shop, city, or state" />
        <Button type="submit"><Search size={16} className="mr-1" /> Search</Button>
      </form>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          {(["all", "auto", "motorcycle"] as const).map((f) => (
            <Button key={f} size="sm" variant={vehicleType === f ? "default" : "outline"} onClick={() => setVehicleType(f)}>
              {f === "all" ? "All" : f === "auto" ? "Cars & Trucks" : "Motorcycles"}
            </Button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-sm">
          <Checkbox checked={verifiedOnly} onCheckedChange={(v) => setVerifiedOnly(!!v)} /> Verified only
        </label>
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">Min rating:</span>
          {[0, 3, 4, 4.5].map((r) => (
            <Button key={r} size="sm" variant={minRating === r ? "default" : "outline"} className="h-7 px-2" onClick={() => setMinRating(r)}>
              {r === 0 ? "Any" : `${r}+`}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : visible.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No mechanics matched. Try a broader search or visit <Link to="/search" className="underline">Find Pros</Link>.</CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((p) => {
            const stats = statsMap[p.id];
            return (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-sm truncate">{p.business_name}</h3>
                    {p.subscription_tier === "pro" && <Badge className="bg-primary shrink-0">Pro</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{p.category}</p>
                  <p className="text-xs text-muted-foreground">{[p.city, p.state].filter(Boolean).join(", ")}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {p.verified && (
                      <Badge variant="outline" className="text-[10px] border-primary text-primary">
                        <ShieldCheck className="w-3 h-3 mr-1" />Verified
                      </Badge>
                    )}
                    {stats?.avg_rating != null && (
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                        <Star className="w-3 h-3 fill-current text-yellow-500" />
                        {stats.avg_rating.toFixed(1)} ({stats.review_count})
                      </span>
                    )}
                  </div>
                  <Button asChild size="sm" variant="outline" className="w-full mt-3">
                    <Link to={p.slug ? `/pros/${p.slug}` : `/pro/${p.id}`}>View profile</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
