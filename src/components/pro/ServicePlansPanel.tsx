import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Repeat, Plus, Users, Trash2, Pencil } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type Plan = {
  id: string;
  name: string;
  description: string;
  category: string;
  frequency: string;
  price: number;
  active: boolean;
};

type Sub = {
  id: string;
  plan_id: string;
  homeowner_id: string;
  status: string;
  next_service_date: string | null;
  homeowner_name?: string;
  plan_name?: string;
};

const FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "biannual", label: "Every 6 months" },
  { value: "annual", label: "Annual" },
];

export default function ServicePlansPanel({ providerId }: { providerId: string }) {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [open, setOpen] = useState(false);

  const blank = (): Plan => ({
    id: "",
    name: "",
    description: "",
    category: "General",
    frequency: "monthly",
    price: 0,
    active: true,
  });

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from("service_plans").select("*").eq("provider_id", providerId).order("created_at", { ascending: false }),
      supabase.from("plan_subscriptions").select("*, service_plans(name)").eq("provider_id", providerId).order("created_at", { ascending: false }),
    ]);
    setPlans((p as Plan[]) || []);
    const subsRaw = (s as any[]) || [];
    const homeownerIds = [...new Set(subsRaw.map((x) => x.homeowner_id))];
    let nameMap: Record<string, string> = {};
    if (homeownerIds.length) {
      const { data: profs } = await supabase
        .from("profiles").select("id, full_name").in("id", homeownerIds);
      (profs || []).forEach((p: any) => { nameMap[p.id] = p.full_name || "Homeowner"; });
    }
    setSubs(subsRaw.map((x) => ({
      ...x,
      homeowner_name: nameMap[x.homeowner_id] || "Homeowner",
      plan_name: x.service_plans?.name,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, [providerId]);

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast({ title: "Plan name required", variant: "destructive" });
      return;
    }
    const payload = {
      provider_id: providerId,
      name: editing.name,
      description: editing.description,
      category: editing.category,
      frequency: editing.frequency,
      price: editing.price,
      active: editing.active,
    };
    const { error } = editing.id
      ? await supabase.from("service_plans").update(payload).eq("id", editing.id)
      : await supabase.from("service_plans").insert(payload);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing.id ? "Plan updated" : "Plan created" });
    setOpen(false);
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this plan? Active subscriptions will be cancelled.")) return;
    const { error } = await supabase.from("service_plans").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Plan deleted" });
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Repeat size={18} className="text-primary" /> Recurring Service Plans
          </span>
          <Button size="sm" onClick={() => { setEditing(blank()); setOpen(true); }}>
            <Plus size={14} className="mr-1" /> New Plan
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Offer maintenance contracts (e.g., quarterly HVAC, monthly landscaping) to homeowners for predictable recurring revenue.
        </p>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : plans.length === 0 ? (
          <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-6 text-center">
            No plans yet. Create your first recurring service plan.
          </div>
        ) : (
          <div className="space-y-2">
            {plans.map((p) => {
              const activeSubs = subs.filter((s) => s.plan_id === p.id && s.status === "active").length;
              return (
                <div key={p.id} className="border rounded-lg p-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold">{p.name}</h4>
                      <Badge variant="secondary">{FREQUENCIES.find(f => f.value === p.frequency)?.label}</Badge>
                      {!p.active && <Badge variant="outline">Inactive</Badge>}
                    </div>
                    {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
                    <div className="flex items-center gap-3 text-sm mt-2">
                      <span className="font-medium">${Number(p.price).toFixed(2)}</span>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Users size={12} /> {activeSubs} subscriber{activeSubs !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}>
                      <Pencil size={14} />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(p.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {subs.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-2 mt-4">Active Subscribers</h4>
            <div className="space-y-1">
              {subs.map((s) => (
                <div key={s.id} className="text-sm border rounded p-2 flex items-center justify-between">
                  <div>
                    <span className="font-medium">{s.homeowner_name}</span>
                    <span className="text-muted-foreground"> · {s.plan_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.next_service_date && (
                      <span className="text-xs text-muted-foreground">Next: {new Date(s.next_service_date).toLocaleDateString()}</span>
                    )}
                    <Badge variant={s.status === "active" ? "default" : "outline"}>{s.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Plan" : "New Service Plan"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Plan Name</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. Quarterly HVAC Tune-up" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="What's included in each service visit?" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Input value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
                </div>
                <div>
                  <Label>Frequency</Label>
                  <Select value={editing.frequency} onValueChange={(v) => setEditing({ ...editing, frequency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Price per service ($)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-7"
                    value={editing.price || ""}
                    onChange={(e) => setEditing({ ...editing, price: e.target.value === "" ? 0 : parseFloat(e.target.value) })}
                    onBlur={(e) => {
                      const n = parseFloat(e.target.value);
                      setEditing({ ...editing, price: isNaN(n) ? 0 : Math.round(n * 100) / 100 });
                    }}
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {[50, 100, 150, 250, 500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setEditing({ ...editing, price: preset })}
                      className="text-xs px-2 py-1 rounded-md border border-border bg-background hover:bg-secondary transition-colors"
                    >
                      ${preset}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between border rounded p-3">
                <Label>Active (visible to homeowners)</Label>
                <Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
