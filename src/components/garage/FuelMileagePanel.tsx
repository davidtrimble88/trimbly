import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Fuel, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type FuelLog = {
  id: string;
  logged_at: string;
  mileage: number;
  volume: number;
  cost: number | null;
  full_tank: boolean;
  station: string | null;
};

type MileagePoint = { logged_at: string; mileage: number };

export default function FuelMileagePanel({ vehicle }: { vehicle: { id: string; mileage_unit: string; current_mileage: number } }) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [mileagePoints, setMileagePoints] = useState<MileagePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    logged_at: new Date().toISOString().slice(0, 10),
    mileage: String(vehicle.current_mileage),
    volume: "",
    cost: "",
    full_tank: true,
    station: "",
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data: fuel }, { data: mileage }] = await Promise.all([
      supabase.from("vehicle_fuel_logs").select("*").eq("vehicle_id", vehicle.id).order("logged_at", { ascending: true }),
      supabase.from("vehicle_mileage_logs").select("logged_at, mileage").eq("vehicle_id", vehicle.id).order("logged_at", { ascending: true }),
    ]);
    setLogs((fuel as FuelLog[]) || []);
    setMileagePoints((mileage as MileagePoint[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [vehicle.id]);

  const volumeUnit = vehicle.mileage_unit === "km" ? "L" : "gal";

  const stats = useMemo(() => {
    const fullTankLogs = logs.filter((l) => l.full_tank).sort((a, b) => a.mileage - b.mileage);
    const mpgReadings: number[] = [];
    for (let i = 1; i < fullTankLogs.length; i++) {
      const milesDriven = fullTankLogs[i].mileage - fullTankLogs[i - 1].mileage;
      if (milesDriven > 0 && fullTankLogs[i].volume > 0) {
        mpgReadings.push(milesDriven / fullTankLogs[i].volume);
      }
    }
    const avgEfficiency = mpgReadings.length ? mpgReadings.reduce((a, b) => a + b, 0) / mpgReadings.length : null;

    const totalCost = logs.reduce((sum, l) => sum + (l.cost || 0), 0);
    const sortedByMileage = [...logs].sort((a, b) => a.mileage - b.mileage);
    const milesSpan = sortedByMileage.length >= 2 ? sortedByMileage[sortedByMileage.length - 1].mileage - sortedByMileage[0].mileage : 0;
    const costPerMile = milesSpan > 0 && totalCost > 0 ? totalCost / milesSpan : null;

    return { avgEfficiency, costPerMile, totalCost };
  }, [logs]);

  const chartData = useMemo(() => {
    const combined = [
      ...mileagePoints.map((p) => ({ date: p.logged_at, mileage: p.mileage })),
      ...logs.map((l) => ({ date: l.logged_at, mileage: l.mileage })),
    ];
    const byDate = new Map<string, number>();
    for (const p of combined) {
      if (!byDate.has(p.date) || byDate.get(p.date)! < p.mileage) byDate.set(p.date, p.mileage);
    }
    return Array.from(byDate.entries())
      .map(([date, mileage]) => ({ date, mileage }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [mileagePoints, logs]);

  const add = async () => {
    if (!user) return;
    const mileage = parseInt(form.mileage, 10);
    const volume = parseFloat(form.volume);
    if (isNaN(mileage) || isNaN(volume) || volume <= 0) {
      toast.error("Mileage and volume are required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("vehicle_fuel_logs").insert({
      vehicle_id: vehicle.id,
      owner_user_id: user.id,
      logged_at: form.logged_at,
      mileage,
      volume,
      cost: form.cost ? parseFloat(form.cost) : null,
      full_tank: form.full_tank,
      station: form.station.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setOpen(false);
    setForm({ logged_at: new Date().toISOString().slice(0, 10), mileage: String(vehicle.current_mileage), volume: "", cost: "", full_tank: true, station: "" });
    toast.success("Fill-up logged");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this fill-up?")) return;
    await supabase.from("vehicle_fuel_logs").delete().eq("id", id);
    load();
  };

  if (loading) return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg efficiency</p>
          <p className="font-display text-xl font-bold">{stats.avgEfficiency ? `${stats.avgEfficiency.toFixed(1)} ${vehicle.mileage_unit}/${volumeUnit}` : "—"}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Cost / {vehicle.mileage_unit}</p>
          <p className="font-display text-xl font-bold">{stats.costPerMile ? `$${stats.costPerMile.toFixed(2)}` : "—"}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total fuel spend</p>
          <p className="font-display text-xl font-bold">${stats.totalCost.toFixed(0)}</p>
        </CardContent></Card>
      </div>

      {chartData.length >= 2 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-1.5"><TrendingUp size={16} /> Mileage over time</CardTitle></CardHeader>
          <CardContent className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={50} />
                <Tooltip />
                <Line type="monotone" dataKey="mileage" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-1.5"><Fuel size={16} /> Fill-up log</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus size={14} className="mr-1" /> Log fill-up</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Log a fill-up</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Date</Label><Input type="date" value={form.logged_at} onChange={(e) => setForm({ ...form, logged_at: e.target.value })} /></div>
                  <div><Label>Odometer</Label><Input inputMode="numeric" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value.replace(/\D/g, "").slice(0, 7) })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Volume ({volumeUnit})</Label><Input inputMode="decimal" value={form.volume} onChange={(e) => setForm({ ...form, volume: e.target.value.replace(/[^\d.]/g, "") })} /></div>
                  <div><Label>Cost ($)</Label><Input inputMode="decimal" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value.replace(/[^\d.]/g, "") })} /></div>
                </div>
                <div><Label>Station (optional)</Label><Input value={form.station} onChange={(e) => setForm({ ...form, station: e.target.value })} /></div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.full_tank} onCheckedChange={(v) => setForm({ ...form, full_tank: !!v })} />
                  Filled to full (needed for accurate MPG)
                </label>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={add} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No fill-ups logged yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {[...logs].reverse().map((l) => (
                <li key={l.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{l.logged_at} · {l.mileage.toLocaleString()} {vehicle.mileage_unit}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.volume} {volumeUnit}{l.cost ? ` · $${l.cost.toFixed(2)}` : ""}{l.station ? ` · ${l.station}` : ""}{!l.full_tank ? " · partial fill" : ""}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(l.id)}><Trash2 size={14} className="text-destructive" /></Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
