import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ShieldCheck, EyeOff, Eye, Star } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "./activityLog";

interface Provider {
  id: string;
  business_name: string;
  category: string;
  city: string;
  state: string;
  subscription_tier: string;
  verified: boolean;
  featured: boolean;
  hidden: boolean;
  licensed: boolean;
  insured: boolean;
  user_id: string;
  phone: string | null;
  website: string | null;
}

const Providers = () => {
  const { user } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unverified" | "verified" | "featured" | "hidden">("all");

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from("providers").select("*").order("created_at", { ascending: false });
    setProviders((data as Provider[]) || []);
  };

  const filtered = providers.filter((p) => {
    if (filter === "unverified" && p.verified) return false;
    if (filter === "verified" && !p.verified) return false;
    if (filter === "featured" && !p.featured) return false;
    if (filter === "hidden" && !p.hidden) return false;
    if (search && !p.business_name.toLowerCase().includes(search.toLowerCase()) && !p.category.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const update = async (p: Provider, field: "verified" | "featured" | "hidden", value: boolean) => {
    if (!user) return;
    const { error } = await supabase.from("providers").update({ [field]: value }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    await logActivity(user.id, `provider_${field}_${value ? "on" : "off"}`, "provider", p.id, { business_name: p.business_name });
    toast.success("Updated");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by business or category..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "unverified", "verified", "featured", "hidden"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {filtered.map((p) => (
          <Card key={p.id} className={p.hidden ? "opacity-60" : ""}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{p.business_name}</h3>
                  <p className="text-xs text-muted-foreground">{p.category} · {p.city}, {p.state}</p>
                </div>
                <div className="flex flex-col gap-1 items-end shrink-0">
                  {p.subscription_tier === "pro" && <Badge className="text-[10px]">PRO</Badge>}
                  {p.verified && <Badge variant="outline" className="text-[10px] border-primary text-primary"><ShieldCheck className="w-3 h-3 mr-1" />Verified</Badge>}
                  {p.featured && <Badge variant="outline" className="text-[10px]"><Star className="w-3 h-3 mr-1" />Featured</Badge>}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground mb-3">
                {p.licensed && <span className="bg-muted px-1.5 py-0.5 rounded">Licensed</span>}
                {p.insured && <span className="bg-muted px-1.5 py-0.5 rounded">Insured</span>}
                {p.phone && <span className="bg-muted px-1.5 py-0.5 rounded">{p.phone}</span>}
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                <Button size="sm" variant={p.verified ? "default" : "outline"} onClick={() => update(p, "verified", !p.verified)}>
                  <ShieldCheck className="w-3 h-3" /> {p.verified ? "Unverify" : "Verify"}
                </Button>
                <Button size="sm" variant={p.featured ? "default" : "outline"} onClick={() => update(p, "featured", !p.featured)}>
                  <Star className="w-3 h-3" /> {p.featured ? "Unfeature" : "Feature"}
                </Button>
                <Button size="sm" variant={p.hidden ? "destructive" : "outline"} onClick={() => update(p, "hidden", !p.hidden)}>
                  {p.hidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {p.hidden ? "Unhide" : "Hide"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-2 text-center py-8">No providers match</p>
        )}
      </div>
    </div>
  );
};

export default Providers;
