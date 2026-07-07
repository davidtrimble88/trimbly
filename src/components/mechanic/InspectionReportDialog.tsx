import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Item = { category: string; item_name: string; condition: "ok" | "watch" | "needs_attention"; notes: string; cost_estimate: string };

const CATEGORIES = ["Engine", "Brakes", "Tires", "Suspension", "Electrical", "Fluids", "Body", "Drivetrain", "Other"];

const emptyItem = (): Item => ({ category: "Engine", item_name: "", condition: "ok", notes: "", cost_estimate: "" });

export default function InspectionReportDialog({
  vehicleId, providerId, ownerUserId, vehicleJobId, trigger,
}: {
  vehicleId: string; providerId: string; ownerUserId: string; vehicleJobId?: string; trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Vehicle Inspection");
  const [summary, setSummary] = useState("");
  const [items, setItems] = useState<Item[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);

  const updateItem = (i: number, patch: Partial<Item>) => {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  };
  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const send = async () => {
    const validItems = items.filter((it) => it.item_name.trim());
    if (validItems.length === 0) {
      toast.error("Add at least one inspection item");
      return;
    }
    setSaving(true);
    const { data: inspection, error } = await supabase.from("vehicle_inspections").insert({
      vehicle_id: vehicleId,
      vehicle_job_id: vehicleJobId || null,
      provider_id: providerId,
      owner_user_id: ownerUserId,
      title: title.trim() || "Vehicle Inspection",
      summary: summary.trim() || null,
      status: "sent",
      sent_at: new Date().toISOString(),
    }).select().single();

    if (error || !inspection) {
      setSaving(false);
      toast.error(error?.message || "Failed to create report");
      return;
    }

    const rows = validItems.map((it, idx) => ({
      inspection_id: inspection.id,
      category: it.category,
      item_name: it.item_name.trim(),
      condition: it.condition,
      notes: it.notes.trim() || null,
      cost_estimate: it.cost_estimate ? Number(it.cost_estimate) : null,
      sort_order: idx,
    }));
    const { error: itemsErr } = await supabase.from("vehicle_inspection_items").insert(rows);
    setSaving(false);
    if (itemsErr) {
      toast.error(itemsErr.message);
      return;
    }
    toast.success("Inspection report sent to the owner");
    setOpen(false);
    setTitle("Vehicle Inspection");
    setSummary("");
    setItems([emptyItem()]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button size="sm" variant="outline"><ClipboardList size={14} className="mr-1" /> Send inspection report</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Multi-point inspection report</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Report title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Summary (optional)</Label>
            <Textarea rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Overall notes for the owner" />
          </div>

          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Item {i + 1}</span>
                  {items.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(i)}>
                      <Trash2 size={12} className="text-destructive" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Category</Label>
                    <Select value={item.category} onValueChange={(v) => updateItem(i, { category: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Condition</Label>
                    <Select value={item.condition} onValueChange={(v) => updateItem(i, { condition: v as Item["condition"] })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ok">✅ OK</SelectItem>
                        <SelectItem value="watch">⚠️ Watch</SelectItem>
                        <SelectItem value="needs_attention">🔴 Needs attention</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Input placeholder="Item (e.g. Front brake pads)" value={item.item_name} onChange={(e) => updateItem(i, { item_name: e.target.value })} />
                <Textarea rows={2} placeholder="Notes" value={item.notes} onChange={(e) => updateItem(i, { notes: e.target.value })} />
                <Input type="number" placeholder="Estimated cost to fix ($, optional)" value={item.cost_estimate} onChange={(e) => updateItem(i, { cost_estimate: e.target.value })} />
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addItem}><Plus size={14} className="mr-1" /> Add item</Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={send} disabled={saving}>{saving ? "Sending…" : "Send to owner"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
