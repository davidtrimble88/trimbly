import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Search, Star } from "lucide-react";

const AUTO_CATEGORIES = ["Auto Repair", "Mechanic", "Motorcycle Repair", "Auto Body", "Tire Shop"];

export default function GarageMechanics() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let query = supabase.from("providers").select("id, business_name, category, city, state, slug, subscription_tier");
    // Filter by auto-related categories or "auto"/"mechanic" in the name
    query = query.or(AUTO_CATEGORIES.map((c) => `category.ilike.%${c}%`).join(",") + ",business_name.ilike.%mechanic%,business_name.ilike.%auto%,business_name.ilike.%motorcycle%");
    if (q.trim()) query = query.or(`business_name.ilike.%${q}%,city.ilike.%${q}%,state.ilike.%${q}%`);
    const { data } = await query.limit(50);
    setResults(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Find a Mechanic</h1>
      <p className="text-sm text-muted-foreground">Trimbly pros who work on cars and motorcycles. Message first — phone only after they approve.</p>

      <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Shop, city, or state" />
        <Button type="submit"><Search size={16} className="mr-1" /> Search</Button>
      </form>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : results.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No mechanics matched. Try a broader search or visit <Link to="/search" className="underline">Find Pros</Link>.</CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {results.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-sm truncate">{p.business_name}</h3>
                  {p.subscription_tier === "elite" && <Badge className="bg-primary">Elite</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{p.category}</p>
                <p className="text-xs text-muted-foreground">{[p.city, p.state].filter(Boolean).join(", ")}</p>
                <Button asChild size="sm" variant="outline" className="w-full mt-3">
                  <Link to={p.slug ? `/pros/${p.slug}` : `/pro/${p.id}`}>View profile</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
