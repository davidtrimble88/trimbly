import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ArrowLeft, Upload, Check } from "lucide-react";
import { toast } from "sonner";

export default function VehicleDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user || !id) return;
    const [v, s, t, d] = await Promise.all([
      supabase.from("vehicles").select("*").eq("id", id).maybeSingle(),
      supabase.from("vehicle_service_records").select("*").eq("vehicle_id", id).order("service_date", { ascending: false }),
      supabase.from("vehicle_maintenance_tasks").select("*").eq("vehicle_id", id).order("next_due_date", { ascending: true, nullsFirst: false }),
      supabase.from("vehicle_documents").select("*").eq("vehicle_id", id).order("created_at", { ascending: false }),
    ]);
    setVehicle(v.data);
    setServices(s.data || []);
    setTasks(t.data || []);
    setDocs(d.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user, id]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!vehicle) return <p className="text-sm text-muted-foreground">Vehicle not found.</p>;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild><Link to="/garage/vehicles"><ArrowLeft size={16} className="mr-1" /> All vehicles</Link></Button>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold">{vehicle.nickname || `${vehicle.year ?? ""} ${vehicle.make} ${vehicle.model}`.trim()}</h1>
          <p className="text-sm text-muted-foreground">{[vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" ")} · {vehicle.current_mileage.toLocaleString()} {vehicle.mileage_unit}{vehicle.license_plate ? ` · ${vehicle.license_plate}` : ""}</p>
        </div>
        <UpdateMileageDialog vehicle={vehicle} onSaved={load} />
      </div>

      <Tabs defaultValue="service">
        <TabsList>
          <TabsTrigger value="service">Service log ({services.length})</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance ({tasks.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({docs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="service" className="space-y-3">
          <ServiceLog vehicle={vehicle} services={services} onChanged={load} />
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-3">
          <MaintenanceList vehicle={vehicle} tasks={tasks} onChanged={load} />
        </TabsContent>

        <TabsContent value="documents" className="space-y-3">
          <DocumentsList vehicle={vehicle} docs={docs} onChanged={load} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UpdateMileageDialog({ vehicle, onSaved }: { vehicle: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(String(vehicle.current_mileage));
  const save = async () => {
    const m = parseInt(val, 10);
    if (isNaN(m) || m < 0) return toast.error("Enter a valid mileage");
    const { error } = await supabase.from("vehicles").update({ current_mileage: m }).eq("id", vehicle.id);
    if (error) return toast.error(error.message);
    toast.success("Mileage updated");
    setOpen(false);
    onSaved();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm">Update mileage</Button></DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Update mileage</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label>Current {vehicle.mileage_unit}</Label>
          <Input value={val} inputMode="numeric" onChange={(e) => setVal(e.target.value.replace(/\D/g, "").slice(0, 7))} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ServiceLog({ vehicle, services, onChanged }: { vehicle: any; services: any[]; onChanged: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ service_date: new Date().toISOString().slice(0,10), service_type: "maintenance", description: "", cost: "", shop_name: "", mileage: String(vehicle.current_mileage) });

  const add = async () => {
    if (!user) return;
    if (!form.description.trim()) return toast.error("Add a description");
    const { error } = await supabase.from("vehicle_service_records").insert({
      vehicle_id: vehicle.id,
      owner_user_id: user.id,
      service_date: form.service_date,
      service_type: form.service_type,
      description: form.description.trim(),
      cost: form.cost ? parseFloat(form.cost) : null,
      shop_name: form.shop_name.trim() || null,
      mileage: form.mileage ? parseInt(form.mileage, 10) : null,
    });
    if (error) return toast.error(error.message);
    setOpen(false);
    setForm({ service_date: new Date().toISOString().slice(0,10), service_type: "maintenance", description: "", cost: "", shop_name: "", mileage: String(vehicle.current_mileage) });
    toast.success("Service logged");
    onChanged();
  };

  const remove = async (recordId: string) => {
    if (!confirm("Delete this service record?")) return;
    const { error } = await supabase.from("vehicle_service_records").delete().eq("id", recordId);
    if (error) return toast.error(error.message);
    onChanged();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Service log</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus size={14} className="mr-1" /> Add</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Log a service</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Date</Label><Input type="date" value={form.service_date} onChange={(e) => setForm({ ...form, service_date: e.target.value })} /></div>
                <div><Label>Mileage</Label><Input inputMode="numeric" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value.replace(/\D/g, "").slice(0,7) })} /></div>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.service_type} onValueChange={(v) => setForm({ ...form, service_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="modification">Modification</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>What was done *</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} maxLength={500} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Cost</Label><Input inputMode="decimal" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value.replace(/[^\d.]/g, "") })} placeholder="0.00" /></div>
                <div><Label>Shop / Pro</Label><Input value={form.shop_name} onChange={(e) => setForm({ ...form, shop_name: e.target.value })} maxLength={80} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={add}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground">No service records yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {services.map((s) => (
              <li key={s.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="outline" className="capitalize">{s.service_type}</Badge>
                    <span className="text-xs text-muted-foreground">{s.service_date}{s.mileage ? ` · ${s.mileage.toLocaleString()} mi` : ""}</span>
                  </div>
                  <p className="text-sm">{s.description}</p>
                  {(s.shop_name || s.cost) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {s.shop_name}{s.shop_name && s.cost ? " · " : ""}{s.cost ? `$${Number(s.cost).toFixed(2)}` : ""}
                    </p>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(s.id)} aria-label="Delete">
                  <Trash2 size={14} className="text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function MaintenanceList({ vehicle, tasks, onChanged }: { vehicle: any; tasks: any[]; onChanged: () => void }) {
  const markDone = async (task: any) => {
    const today = new Date();
    const next_due_date = task.interval_months ? (() => { const d = new Date(today); d.setMonth(d.getMonth() + task.interval_months); return d.toISOString().slice(0,10); })() : null;
    const next_due_mileage = task.interval_miles ? (vehicle.current_mileage + task.interval_miles) : null;
    const { error } = await supabase.from("vehicle_maintenance_tasks").update({
      last_done_date: today.toISOString().slice(0,10),
      last_done_mileage: vehicle.current_mileage,
      next_due_date,
      next_due_mileage,
      status: "upcoming",
    }).eq("id", task.id);
    if (error) return toast.error(error.message);
    toast.success(`${task.task_name} marked done`);
    onChanged();
  };

  const remove = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;
    const { error } = await supabase.from("vehicle_maintenance_tasks").delete().eq("id", taskId);
    if (error) return toast.error(error.message);
    onChanged();
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Maintenance schedule</CardTitle></CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {tasks.map((t) => (
              <li key={t.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium truncate">{t.task_name}</span>
                    <Badge variant={t.status === "overdue" ? "destructive" : t.status === "due" ? "default" : "outline"}>{t.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t.interval_miles ? `every ${t.interval_miles.toLocaleString()} ${vehicle.mileage_unit}` : ""}
                    {t.interval_miles && t.interval_months ? " · " : ""}
                    {t.interval_months ? `every ${t.interval_months} months` : ""}
                    {(t.next_due_date || t.next_due_mileage) ? ` · next: ${t.next_due_date ?? ""}${t.next_due_date && t.next_due_mileage ? " / " : ""}${t.next_due_mileage ? `${t.next_due_mileage.toLocaleString()} ${vehicle.mileage_unit}` : ""}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => markDone(t)}><Check size={14} className="mr-1" /> Done</Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(t.id)}><Trash2 size={14} className="text-destructive" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function DocumentsList({ vehicle, docs, onChanged }: { vehicle: any; docs: any[]; onChanged: () => void }) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("registration");
  const [expiresOn, setExpiresOn] = useState("");

  const upload = async (file: File) => {
    if (!user) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("Max 10MB");
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${vehicle.id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("vehicle-docs").upload(path, file);
    if (upErr) { setUploading(false); return toast.error(upErr.message); }
    const { error } = await supabase.from("vehicle_documents").insert({
      vehicle_id: vehicle.id,
      owner_user_id: user.id,
      doc_type: docType,
      file_name: file.name,
      file_url: path,
      file_size: file.size,
      expires_on: expiresOn || null,
    });
    setUploading(false);
    if (error) return toast.error(error.message);
    setExpiresOn("");
    toast.success("Document uploaded");
    onChanged();
  };

  const open = async (doc: any) => {
    const { data, error } = await supabase.storage.from("vehicle-docs").createSignedUrl(doc.file_url, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  const remove = async (doc: any) => {
    if (!confirm("Delete this document?")) return;
    await supabase.storage.from("vehicle-docs").remove([doc.file_url]);
    const { error } = await supabase.from("vehicle_documents").delete().eq("id", doc.id);
    if (error) return toast.error(error.message);
    onChanged();
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Documents</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
          <div>
            <Label>Type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="registration">Registration</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="warranty">Warranty</SelectItem>
                <SelectItem value="manual">Owner's manual</SelectItem>
                <SelectItem value="inspection">Inspection</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Expires (optional)</Label>
            <Input type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="vfile" className="block">File</Label>
            <Input id="vfile" type="file" accept="image/*,.pdf" disabled={uploading} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </div>
        </div>
        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {docs.map((d) => (
              <li key={d.id} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="outline" className="capitalize">{d.doc_type}</Badge>
                    <span className="text-sm truncate">{d.file_name}</span>
                  </div>
                  {d.expires_on && <p className="text-xs text-muted-foreground">Expires {d.expires_on}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => open(d)}><Upload size={14} className="mr-1 rotate-180" /> Open</Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(d)}><Trash2 size={14} className="text-destructive" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
