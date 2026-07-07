import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, ShieldCheck, Lock, Check } from "lucide-react";
import { toast } from "sonner";

type Milestone = {
  id: string;
  title: string;
  amount_cents: number;
  status: string; // pending | funded | released | refunded
};

export default function MilestonesPanel({
  quoteId, providerId, homeownerId, isHomeowner,
}: { quoteId: string; providerId: string; homeownerId: string; isHomeowner: boolean }) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ title: "", amount: "" });
  const [saving, setSaving] = useState(false);
  const [connectStatus, setConnectStatus] = useState<{ chargesEnabled: boolean } | null>(null);

  const load = async () => {
    const { data } = await supabase.from("job_milestones").select("id, title, amount_cents, status").eq("quote_id", quoteId).order("created_at");
    setMilestones((data as Milestone[]) || []);
    if (isHomeowner) {
      const { data: prov } = await supabase.from("providers").select("stripe_connect_charges_enabled").eq("id", providerId).maybeSingle();
      setConnectStatus({ chargesEnabled: !!prov?.stripe_connect_charges_enabled });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [quoteId]);

  const addMilestone = async () => {
    const amount = parseFloat(form.amount);
    if (!form.title.trim() || isNaN(amount) || amount <= 0) {
      toast.error("Add a title and a valid amount");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("job_milestones").insert({
      quote_id: quoteId,
      provider_id: providerId,
      homeowner_id: homeownerId,
      title: form.title.trim(),
      amount_cents: Math.round(amount * 100),
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setAddOpen(false);
    setForm({ title: "", amount: "" });
    toast.success("Milestone added");
    load();
  };

  const fund = async (m: Milestone) => {
    setBusyId(m.id);
    const { data, error } = await supabase.functions.invoke("fund-milestone", { body: { milestone_id: m.id } });
    setBusyId(null);
    if (error || data?.error) { toast.error(data?.error || error?.message || "Couldn't start payment"); return; }
    if (data?.url) window.location.href = data.url;
  };

  const release = async (m: Milestone) => {
    if (!confirm(`Release $${(m.amount_cents / 100).toFixed(2)} to the pro for "${m.title}"? This can't be undone.`)) return;
    setBusyId(m.id);
    const { data, error } = await supabase.functions.invoke("release-milestone", { body: { milestone_id: m.id } });
    setBusyId(null);
    if (error || data?.error) { toast.error(data?.error || error?.message || "Couldn't release payment"); return; }
    toast.success("Payment released to the pro");
    load();
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-muted text-muted-foreground",
      funded: "bg-yellow-500/15 text-yellow-700 border-yellow-500/40",
      released: "bg-green-500/15 text-green-700 border-green-500/40",
      refunded: "bg-destructive/15 text-destructive border-destructive/40",
    };
    return <Badge variant="outline" className={map[status] || map.pending}>{status}</Badge>;
  };

  if (loading) return null;

  return (
    <Card className="print:hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-1.5"><ShieldCheck size={16} className="text-primary" /> Milestone payments</CardTitle>
        {!isHomeowner && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button size="sm" variant="outline"><Plus size={14} className="mr-1" /> Add milestone</Button></DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>New milestone</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Materials deposit" /></div>
                <div><Label>Amount ($)</Label><Input inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^\d.]/g, "") })} /></div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button onClick={addMilestone} disabled={saving}>{saving ? "Adding…" : "Add"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Funds are held securely until you approve completed work, then released to the pro — never before.
        </p>
        {isHomeowner && connectStatus && !connectStatus.chargesEnabled && (
          <p className="text-xs text-orange-600 bg-orange-500/10 border border-orange-500/30 rounded-md p-2">
            This pro hasn't finished setting up payouts yet, so milestones can't be funded until they do.
          </p>
        )}
        {milestones.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isHomeowner ? "No milestones set up yet." : "Break the job into milestones so the homeowner can pay in stages as work is completed."}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {milestones.map((m) => (
              <li key={m.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">${(m.amount_cents / 100).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(m.status)}
                  {isHomeowner && m.status === "pending" && (
                    <Button size="sm" onClick={() => fund(m)} disabled={busyId === m.id || !connectStatus?.chargesEnabled}>
                      {busyId === m.id ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} className="mr-1" />}
                      Fund
                    </Button>
                  )}
                  {isHomeowner && m.status === "funded" && (
                    <Button size="sm" variant="outline" onClick={() => release(m)} disabled={busyId === m.id}>
                      {busyId === m.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} className="mr-1" />}
                      Approve & release
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
