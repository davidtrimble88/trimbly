import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, EyeOff, Eye, Trash2, Flag } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { logActivity } from "./activityLog";

interface Review {
  id: string;
  provider_id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  flagged: boolean;
  flagged_reason: string | null;
  hidden: boolean;
  created_at: string;
}

const Moderation = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<"flagged" | "hidden" | "all">("flagged");
  const [providers, setProviders] = useState<Record<string, string>>({});

  useEffect(() => { load(); }, [filter]);

  const load = async () => {
    let q = supabase.from("reviews").select("*").order("created_at", { ascending: false });
    if (filter === "flagged") q = q.eq("flagged", true);
    if (filter === "hidden") q = q.eq("hidden", true);
    const { data } = await q;
    const rs = (data as Review[]) || [];
    setReviews(rs);
    if (rs.length > 0) {
      const { data: provs } = await supabase.from("providers").select("id, business_name").in("id", rs.map((r) => r.provider_id));
      const map: Record<string, string> = {};
      (provs || []).forEach((p: any) => { map[p.id] = p.business_name; });
      setProviders(map);
    }
  };

  const update = async (r: Review, field: "hidden" | "flagged", value: boolean) => {
    if (!user) return;
    const { error } = await supabase.from("reviews").update({ [field]: value }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    await logActivity(user.id, `review_${field}_${value}`, "review", r.id);
    toast.success("Updated");
    load();
  };

  const remove = async (r: Review) => {
    if (!user || !confirm("Permanently delete this review?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    await logActivity(user.id, "review_deleted", "review", r.id);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["flagged", "hidden", "all"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {reviews.map((r) => (
          <Card key={r.id} className={r.hidden ? "opacity-60" : ""}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-sm">{providers[r.provider_id] || "(provider)"}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3 h-3 ${i < r.rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                    ))}
                    <span className="text-xs text-muted-foreground ml-2">{format(new Date(r.created_at), "PP")}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {r.flagged && <Badge variant="destructive" className="text-[10px]"><Flag className="w-3 h-3 mr-1" />Flagged</Badge>}
                  {r.hidden && <Badge variant="secondary" className="text-[10px]">Hidden</Badge>}
                </div>
              </div>
              {r.comment && <p className="text-sm bg-muted/40 rounded p-3 mb-3 whitespace-pre-wrap">{r.comment}</p>}
              {r.flagged_reason && <p className="text-xs text-destructive mb-3">Flag reason: {r.flagged_reason}</p>}
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant={r.hidden ? "default" : "outline"} onClick={() => update(r, "hidden", !r.hidden)}>
                  {r.hidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {r.hidden ? "Unhide" : "Hide"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => update(r, "flagged", !r.flagged)}>
                  <Flag className="w-3 h-3" />{r.flagged ? "Unflag" : "Flag"}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => remove(r)}>
                  <Trash2 className="w-3 h-3" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {reviews.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No reviews in this view</p>}
      </div>
    </div>
  );
};

export default Moderation;
