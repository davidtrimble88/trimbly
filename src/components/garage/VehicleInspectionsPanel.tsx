import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type Item = { id: string; category: string; item_name: string; condition: string; notes: string | null; cost_estimate: number | null };
type Inspection = { id: string; title: string; summary: string | null; sent_at: string | null; created_at: string };

const CONDITION_LABEL: Record<string, { label: string; className: string }> = {
  ok: { label: "OK", className: "bg-green-500/15 text-green-700 border-green-500/40" },
  watch: { label: "Watch", className: "bg-yellow-500/15 text-yellow-700 border-yellow-500/40" },
  needs_attention: { label: "Needs attention", className: "bg-destructive/15 text-destructive border-destructive/40" },
};

export default function VehicleInspectionsPanel({ vehicleId }: { vehicleId: string }) {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [items, setItems] = useState<Record<string, Item[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("vehicle_inspections")
        .select("id, title, summary, sent_at, created_at")
        .eq("vehicle_id", vehicleId)
        .eq("status", "sent")
        .order("created_at", { ascending: false });
      const list = (data as Inspection[]) || [];
      setInspections(list);
      if (list.length > 0) {
        const { data: itemRows } = await supabase
          .from("vehicle_inspection_items")
          .select("*")
          .in("inspection_id", list.map((i) => i.id))
          .order("sort_order");
        const map: Record<string, Item[]> = {};
        (itemRows || []).forEach((row: Item & { inspection_id: string }) => {
          if (!map[row.inspection_id]) map[row.inspection_id] = [];
          map[row.inspection_id].push(row);
        });
        setItems(map);
      }
      setLoading(false);
    })();
  }, [vehicleId]);

  if (loading) return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
    </div>
  );
  if (inspections.length === 0) {
    return <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No inspection reports yet. Mechanics can send one after completing accepted work.</CardContent></Card>;
  }

  return (
    <div className="space-y-3">
      {inspections.map((insp) => (
        <Card key={insp.id}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-1.5"><ClipboardList size={16} /> {insp.title}</CardTitle>
            <p className="text-xs text-muted-foreground">{insp.sent_at ? new Date(insp.sent_at).toLocaleDateString() : ""}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {insp.summary && <p className="text-sm text-muted-foreground">{insp.summary}</p>}
            <ul className="divide-y divide-border">
              {(items[insp.id] || []).map((item) => {
                const cond = CONDITION_LABEL[item.condition] || CONDITION_LABEL.ok;
                return (
                  <li key={item.id} className="py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{item.item_name}</span>
                      <Badge variant="outline" className={`text-[10px] ${cond.className}`}>{cond.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{item.category}{item.notes ? ` · ${item.notes}` : ""}{item.cost_estimate ? ` · est. $${item.cost_estimate}` : ""}</p>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
