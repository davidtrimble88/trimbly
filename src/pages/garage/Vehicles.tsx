import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Car, Bike, Plus, ScanLine, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getPresetsFor, computeNextDueDate, computeNextDueMileage } from "@/lib/garage/maintenancePresets";

type Vehicle = {
  id: string;
  nickname: string;
  vehicle_type: string;
  year: number | null;
  make: string;
  model: string;
  trim: string | null;
  current_mileage: number;
  mileage_unit: string;
  license_plate: string | null;
  vin: string | null;
};

export default function GarageVehicles() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nickname: "",
    vehicle_type: "car",
    year: "",
    make: "",
    model: "",
    trim: "",
    license_plate: "",
    current_mileage: "0",
    mileage_unit: "mi",
    vin: "",
  });
  const [saving, setSaving] = useState(false);
  const [decoding, setDecoding] = useState(false);

  const decodeVin = async () => {
    const vin = form.vin.trim().toUpperCase();
    if (vin.length !== 17) {
      toast.error("VIN should be 17 characters");
      return;
    }
    setDecoding(true);
    const { data, error } = await supabase.functions.invoke("vin-lookup", { body: { vin } });
    setDecoding(false);
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Couldn't decode that VIN");
      return;
    }
    setForm((f) => ({
      ...f,
      year: data.year ? String(data.year) : f.year,
      make: data.make || f.make,
      model: data.model || f.model,
      trim: data.trim || f.trim,
      vehicle_type: data.vehicleType?.toLowerCase().includes("motorcycle") ? "motorcycle" : f.vehicle_type,
    }));
    toast.success("VIN decoded — details filled in below");
  };

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("vehicles").select("*").eq("owner_user_id", user.id).order("created_at", { ascending: false });
    setVehicles((data as Vehicle[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const reset = () => setForm({ nickname: "", vehicle_type: "car", year: "", make: "", model: "", trim: "", license_plate: "", current_mileage: "0", mileage_unit: "mi", vin: "" });

  const submit = async () => {
    if (!user) return;
    if (!form.make.trim() || !form.model.trim()) {
      toast.error("Make and model are required");
      return;
    }
    setSaving(true);
    const mileage = parseInt(form.current_mileage || "0", 10);
    const { data, error } = await supabase.from("vehicles").insert({
      owner_user_id: user.id,
      nickname: form.nickname.trim(),
      vehicle_type: form.vehicle_type,
      year: form.year ? parseInt(form.year, 10) : null,
      make: form.make.trim(),
      model: form.model.trim(),
      trim: form.trim.trim() || null,
      license_plate: form.license_plate.trim() || null,
      current_mileage: mileage,
      mileage_unit: form.mileage_unit,
      vin: form.vin.trim().toUpperCase() || null,
    }).select().single();

    if (error || !data) {
      setSaving(false);
      toast.error(error?.message || "Failed to add vehicle");
      return;
    }

    // Seed default maintenance tasks
    const presets = getPresetsFor(form.vehicle_type);
    const rows = presets.map((p) => ({
      vehicle_id: data.id,
      owner_user_id: user.id,
      task_name: p.task_name,
      category: p.category,
      interval_miles: p.interval_miles ?? null,
      interval_months: p.interval_months ?? null,
      next_due_date: computeNextDueDate(p.interval_months),
      next_due_mileage: computeNextDueMileage(p.interval_miles, mileage),
      status: "upcoming",
    }));
    if (rows.length) await supabase.from("vehicle_maintenance_tasks").insert(rows);

    setSaving(false);
    setOpen(false);
    reset();
    toast.success("Vehicle added");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">My Vehicles</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus size={16} className="mr-1" /> Add vehicle</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add a vehicle</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Type</Label>
                <Select value={form.vehicle_type} onValueChange={(v) => setForm({ ...form, vehicle_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">Car</SelectItem>
                    <SelectItem value="motorcycle">Motorcycle</SelectItem>
                    <SelectItem value="truck">Truck</SelectItem>
                    <SelectItem value="suv">SUV</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>VIN (optional)</Label>
                <div className="flex gap-1">
                  <Input
                    value={form.vin}
                    onChange={(e) => setForm({ ...form, vin: e.target.value.toUpperCase().slice(0, 17) })}
                    placeholder="17-character VIN"
                    maxLength={17}
                    className="font-mono"
                  />
                  <Button type="button" variant="outline" onClick={decodeVin} disabled={decoding || form.vin.trim().length !== 17}>
                    {decoding ? <Loader2 size={14} className="animate-spin" /> : <ScanLine size={14} />}
                    <span className="ml-1 hidden sm:inline">Decode</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Decoding fills in year, make, model, and trim automatically.</p>
              </div>
              <div>
                <Label>Nickname (optional)</Label>
                <Input value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} placeholder="Daily Driver" maxLength={60} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Year</Label>
                  <Input value={form.year} inputMode="numeric" onChange={(e) => setForm({ ...form, year: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="2020" />
                </div>
                <div className="col-span-2">
                  <Label>Make *</Label>
                  <Input value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} placeholder="Honda" maxLength={40} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Model *</Label>
                  <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Civic" maxLength={40} />
                </div>
                <div>
                  <Label>Trim</Label>
                  <Input value={form.trim} onChange={(e) => setForm({ ...form, trim: e.target.value })} placeholder="EX" maxLength={40} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>License plate</Label>
                  <Input value={form.license_plate} onChange={(e) => setForm({ ...form, license_plate: e.target.value.toUpperCase() })} maxLength={12} />
                </div>
                <div>
                  <Label>Current mileage</Label>
                  <div className="flex gap-1">
                    <Input value={form.current_mileage} inputMode="numeric" onChange={(e) => setForm({ ...form, current_mileage: e.target.value.replace(/\D/g, "").slice(0, 7) })} />
                    <Select value={form.mileage_unit} onValueChange={(v) => setForm({ ...form, mileage_unit: v })}>
                      <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mi">mi</SelectItem>
                        <SelectItem value="km">km</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">We'll seed common maintenance reminders for this {form.vehicle_type}. You can edit them anytime.</p>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={saving}>{saving ? "Adding…" : "Add vehicle"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : vehicles.length === 0 ? (
        <Card className="text-center py-10">
          <CardContent>
            <Car size={40} className="mx-auto text-primary mb-3" />
            <h3 className="font-display font-bold text-lg mb-1">Add your first vehicle</h3>
            <p className="text-muted-foreground text-sm mb-4 max-w-sm mx-auto">
              Track service history, reminders, and documents for any car, truck, or motorcycle.
            </p>
            <Button onClick={() => setOpen(true)}><Plus size={14} className="mr-1.5" /> Add vehicle</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {vehicles.map((v) => (
            <Link key={v.id} to={`/garage/vehicles/${v.id}`}>
              <Card className="hover:border-primary transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    {v.vehicle_type === "motorcycle" ? <Bike size={16} className="text-muted-foreground" /> : <Car size={16} className="text-muted-foreground" />}
                    <span className="font-semibold text-sm truncate">{v.nickname || `${v.year ?? ""} ${v.make} ${v.model}`}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{[v.year, v.make, v.model, v.trim].filter(Boolean).join(" ")}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>{v.current_mileage.toLocaleString()} {v.mileage_unit}</span>
                    {v.license_plate && <span className="font-mono">{v.license_plate}</span>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
