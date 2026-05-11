import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Car, Plus, Trash2, Download } from "lucide-react";

type Trip = {
  id: string;
  trip_date: string;
  start_location: string;
  end_location: string;
  miles: number;
  purpose: string;
  notes: string;
  rate_per_mile: number;
};

export default function MileageLogPanel({ providerId, userId }: { providerId: string; userId: string }) {
  const { toast } = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    trip_date: new Date().toISOString().slice(0, 10),
    start_location: "",
    end_location: "",
    miles: "",
    purpose: "job",
    notes: "",
    rate_per_mile: "0.67",
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("mileage_logs")
      .select("*")
      .eq("user_id", userId)
      .order("trip_date", { ascending: false })
      .limit(100);
    setTrips((data as Trip[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  const addTrip = async () => {
    const miles = parseFloat(form.miles);
    if (!miles || miles <= 0) {
      toast({ title: "Enter miles", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("mileage_logs").insert({
      provider_id: providerId,
      user_id: userId,
      trip_date: form.trip_date,
      start_location: form.start_location,
      end_location: form.end_location,
      miles,
      purpose: form.purpose,
      notes: form.notes,
      rate_per_mile: parseFloat(form.rate_per_mile) || 0.67,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Trip logged" });
      setAdding(false);
      setForm({ ...form, start_location: "", end_location: "", miles: "", notes: "" });
      load();
    }
  };

  const deleteTrip = async (id: string) => {
    await supabase.from("mileage_logs").delete().eq("id", id);
    setTrips(trips.filter(t => t.id !== id));
  };

  const exportCsv = () => {
    const rows = [
      ["Date", "From", "To", "Miles", "Purpose", "Rate", "Deduction", "Notes"],
      ...trips.map(t => [
        t.trip_date,
        t.start_location,
        t.end_location,
        t.miles,
        t.purpose,
        t.rate_per_mile,
        (t.miles * t.rate_per_mile).toFixed(2),
        t.notes.replace(/,/g, ";"),
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mileage-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalMiles = trips.reduce((s, t) => s + Number(t.miles), 0);
  const totalDeduction = trips.reduce((s, t) => s + Number(t.miles) * Number(t.rate_per_mile), 0);

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Mileage & Expense Log</h3>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={!trips.length} className="gap-1.5">
              <Download size={14} /> CSV
            </Button>
            <Button size="sm" onClick={() => setAdding(!adding)} className="gap-1.5">
              <Plus size={14} /> Log Trip
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{totalMiles.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Total miles</p>
          </div>
          <div className="rounded-lg bg-primary/10 p-3 text-center">
            <p className="text-2xl font-bold text-primary">${totalDeduction.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Tax deduction</p>
          </div>
        </div>

        {adding && (
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Date</Label>
                <Input type="date" value={form.trip_date} onChange={e => setForm({ ...form, trip_date: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Miles</Label>
                <Input type="number" step="0.1" value={form.miles} onChange={e => setForm({ ...form, miles: e.target.value })} className="mt-1" placeholder="e.g. 12.5" />
              </div>
              <div>
                <Label className="text-xs">From</Label>
                <Input value={form.start_location} onChange={e => setForm({ ...form, start_location: e.target.value })} className="mt-1" placeholder="Shop / home" />
              </div>
              <div>
                <Label className="text-xs">To</Label>
                <Input value={form.end_location} onChange={e => setForm({ ...form, end_location: e.target.value })} className="mt-1" placeholder="Job site" />
              </div>
              <div>
                <Label className="text-xs">Purpose</Label>
                <select value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })}
                  className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="job">Job site</option>
                  <option value="supplies">Supplies run</option>
                  <option value="estimate">Estimate visit</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">IRS rate $/mi</Label>
                <Input type="number" step="0.01" value={form.rate_per_mile} onChange={e => setForm({ ...form, rate_per_mile: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="mt-1" rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
              <Button size="sm" onClick={addTrip}>Save Trip</Button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : trips.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No trips logged yet. Track miles for tax deductions.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {trips.map(t => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{t.trip_date}</span>
                    <span>·</span>
                    <span className="capitalize">{t.purpose}</span>
                  </div>
                  <div className="font-medium text-foreground truncate">
                    {t.start_location || "—"} → {t.end_location || "—"}
                  </div>
                  {t.notes && <p className="text-xs text-muted-foreground truncate">{t.notes}</p>}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold text-foreground">{Number(t.miles).toFixed(1)} mi</div>
                  <div className="text-xs text-primary">${(Number(t.miles) * Number(t.rate_per_mile)).toFixed(2)}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => deleteTrip(t.id)}>
                  <Trash2 size={14} className="text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
