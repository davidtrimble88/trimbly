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
import { Plus, Trash2, ArrowLeft, Upload, Check, ShoppingCart, ExternalLink, ScanLine, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { VehicleProductDialog } from "@/components/garage/VehicleProductDialog";
import FuelMileagePanel from "@/components/garage/FuelMileagePanel";
import VehicleInspectionsPanel from "@/components/garage/VehicleInspectionsPanel";

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
          <p className="text-xs text-muted-foreground font-mono mt-0.5 flex items-center gap-2">
            {vehicle.vin ? `VIN: ${vehicle.vin}` : "No VIN on file"}
            <VinDialog vehicle={vehicle} onSaved={load} />
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild><Link to={`/garage/vehicles/${vehicle.id}/report`}>Printable report</Link></Button>
          <RecallCheck vehicle={vehicle} />
          <UpdateMileageDialog vehicle={vehicle} onSaved={load} />
        </div>
      </div>

      <Tabs defaultValue="service">
        <TabsList>
          <TabsTrigger value="service">Service log ({services.length})</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance ({tasks.length})</TabsTrigger>
          <TabsTrigger value="fuel">Fuel & Mileage</TabsTrigger>
          <TabsTrigger value="inspections">Inspections</TabsTrigger>
          <TabsTrigger value="documents">Documents ({docs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="service" className="space-y-3">
          <ServiceLog vehicle={vehicle} services={services} onChanged={load} />
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-3">
          <ScanServiceReport vehicle={vehicle} onImported={load} />
          <MaintenanceList vehicle={vehicle} tasks={tasks} onChanged={load} />
        </TabsContent>

        <TabsContent value="fuel" className="space-y-3">
          <FuelMileagePanel vehicle={vehicle} />
        </TabsContent>

        <TabsContent value="inspections" className="space-y-3">
          <VehicleInspectionsPanel vehicleId={vehicle.id} />
        </TabsContent>

        <TabsContent value="documents" className="space-y-3">
          <DocumentsList vehicle={vehicle} docs={docs} onChanged={load} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function VinDialog({ vehicle, onSaved }: { vehicle: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(vehicle.vin || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const vin = val.trim().toUpperCase();
    if (vin && vin.length !== 17) return toast.error("VIN should be 17 characters");
    setSaving(true);
    const { error } = await supabase.from("vehicles").update({ vin: vin || null }).eq("id", vehicle.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("VIN saved");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="underline hover:text-foreground">{vehicle.vin ? "Edit" : "Add VIN"}</button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{vehicle.vin ? "Edit VIN" : "Add VIN"}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label>VIN</Label>
          <Input className="font-mono" value={val} maxLength={17} onChange={(e) => setVal(e.target.value.toUpperCase().slice(0, 17))} placeholder="17-character VIN" />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecallCheck({ vehicle }: { vehicle: any }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recalls, setRecalls] = useState<any[] | null>(null);

  const check = async () => {
    if (!vehicle.make || !vehicle.model || !vehicle.year) {
      toast.error("Add year, make, and model first");
      return;
    }
    setOpen(true);
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("vin-lookup", {
      body: { make: vehicle.make, model: vehicle.model, modelYear: String(vehicle.year) },
    });
    setLoading(false);
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Couldn't check recalls");
      setRecalls([]);
      return;
    }
    setRecalls(data.recalls || []);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={check}>
        <AlertTriangle size={14} className="mr-1" /> Check recalls
      </Button>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Open recalls — {vehicle.year} {vehicle.make} {vehicle.model}</DialogTitle></DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin" size={24} /></div>
        ) : recalls && recalls.length > 0 ? (
          <ul className="space-y-3">
            {recalls.map((r: any, i: number) => (
              <li key={i} className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                <p className="font-semibold text-foreground">{r.component}</p>
                <p className="text-muted-foreground mt-1">{r.summary}</p>
                {r.remedy && <p className="text-xs text-muted-foreground mt-1"><strong>Remedy:</strong> {r.remedy}</p>}
                <p className="text-xs text-muted-foreground mt-1">Campaign {r.campaignNumber} · {r.reportedDate}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground py-4">No open recalls found via NHTSA for this year/make/model. Note this checks by model, not your specific VIN's build date — always confirm with your dealer for anything safety-critical.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function UpdateMileageDialog({ vehicle, onSaved }: { vehicle: any; onSaved: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(String(vehicle.current_mileage));
  const save = async () => {
    const m = parseInt(val, 10);
    if (isNaN(m) || m < 0) return toast.error("Enter a valid mileage");
    const { error } = await supabase.from("vehicles").update({ current_mileage: m }).eq("id", vehicle.id);
    if (error) return toast.error(error.message);
    if (user) {
      await supabase.from("vehicle_mileage_logs").insert({
        vehicle_id: vehicle.id, owner_user_id: user.id, mileage: m, source: "manual",
      });
    }
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
    if (form.mileage) {
      await supabase.from("vehicle_mileage_logs").insert({
        vehicle_id: vehicle.id, owner_user_id: user.id, mileage: parseInt(form.mileage, 10), source: "service_record",
      });
    }
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
  const [shopTask, setShopTask] = useState<any>(null);
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
                  <Button variant="ghost" size="sm" onClick={() => setShopTask(t)} title="Shop on Amazon">
                    <ShoppingCart size={14} className="mr-1" /> <span className="hidden sm:inline">Shop</span> <ExternalLink size={10} className="ml-0.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => markDone(t)}><Check size={14} className="mr-1" /> Done</Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(t.id)}><Trash2 size={14} className="text-destructive" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {shopTask && (
        <VehicleProductDialog
          open={!!shopTask}
          onOpenChange={(o) => !o && setShopTask(null)}
          task={shopTask}
          vehicle={vehicle}
        />
      )}
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

function ScanServiceReport({ vehicle, onImported }: { vehicle: any; onImported: () => void }) {
  const { user } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extracted, setExtracted] = useState<any>(null);
  const [docRow, setDocRow] = useState<any>(null);
  const [addNextTask, setAddNextTask] = useState(true);

  const runScan = async (file: File) => {
    if (!user) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("Max 10MB");
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/heic"];
    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|png|jpe?g|webp|heic)$/i)) {
      return toast.error("Upload a PDF or image");
    }
    setScanning(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/${vehicle.id}/${crypto.randomUUID()}.${ext}`;

      // 1. upload to storage
      const { error: upErr } = await supabase.storage.from("vehicle-docs").upload(path, file, {
        contentType: file.type || undefined,
      });
      if (upErr) { setScanning(false); return toast.error(upErr.message); }

      // 2. save documents row so it also appears in Documents
      const { data: docIns, error: docErr } = await supabase.from("vehicle_documents").insert({
        vehicle_id: vehicle.id,
        owner_user_id: user.id,
        doc_type: "inspection",
        file_name: file.name,
        file_url: path,
        file_size: file.size,
      }).select().single();
      if (docErr) { setScanning(false); return toast.error(docErr.message); }
      setDocRow(docIns);

      // 3. create signed URL for AI to read
      const { data: signed, error: sErr } = await supabase.storage
        .from("vehicle-docs").createSignedUrl(path, 300);
      if (sErr || !signed?.signedUrl) {
        setScanning(false);
        return toast.error("Couldn't read the uploaded file");
      }

      // 4. call parse function
      const { data, error } = await supabase.functions.invoke("parse-vehicle-service-doc", {
        body: {
          file_url: signed.signedUrl,
          mime_type: file.type || (ext.toLowerCase() === "pdf" ? "application/pdf" : `image/${ext}`),
          vehicle_context: {
            year: vehicle.year, make: vehicle.make, model: vehicle.model,
            current_mileage: vehicle.current_mileage, mileage_unit: vehicle.mileage_unit,
          },
        },
      });
      setScanning(false);
      if (error || data?.error) {
        return toast.error(data?.error || error?.message || "AI couldn't read that report");
      }
      setExtracted(data.extracted);
    } catch (e: any) {
      setScanning(false);
      toast.error(e?.message || "Something went wrong");
    }
  };

  const closeDialog = () => {
    setExtracted(null);
    setDocRow(null);
  };

  const importIt = async () => {
    if (!user || !extracted) return;
    setSaving(true);

    const perfList = Array.isArray(extracted.services_performed) ? extracted.services_performed : [];
    const description = [
      perfList.join(", "),
      extracted.technician_notes ? `Notes: ${extracted.technician_notes}` : "",
    ].filter(Boolean).join(" — ").slice(0, 900) || "Service performed";

    const svcDate = extracted.service_date || new Date().toISOString().slice(0, 10);
    const mileage = Number(extracted.mileage) > 0 ? Number(extracted.mileage) : null;
    const cost = Number(extracted.total_cost) > 0 ? Number(extracted.total_cost) : null;

    const { error: svcErr } = await supabase.from("vehicle_service_records").insert({
      vehicle_id: vehicle.id,
      owner_user_id: user.id,
      service_date: svcDate,
      service_type: extracted.service_type || "maintenance",
      description,
      cost,
      shop_name: (extracted.shop_name || "").slice(0, 80) || null,
      mileage,
    });
    if (svcErr) { setSaving(false); return toast.error(svcErr.message); }

    // Update vehicle mileage if newer
    if (mileage && mileage > (vehicle.current_mileage || 0)) {
      await supabase.from("vehicles").update({ current_mileage: mileage }).eq("id", vehicle.id);
      await supabase.from("vehicle_mileage_logs").insert({
        vehicle_id: vehicle.id, owner_user_id: user.id, mileage, source: "service_record",
      });
    }

    // Optionally add a task for next recommended service
    const nextDate = extracted.next_service_date || null;
    const nextMi = Number(extracted.next_service_mileage) > 0 ? Number(extracted.next_service_mileage) : null;
    if (addNextTask && (nextDate || nextMi)) {
      const taskName = (extracted.next_service_notes || "Next recommended service").slice(0, 80);
      await supabase.from("vehicle_maintenance_tasks").insert({
        vehicle_id: vehicle.id,
        owner_user_id: user.id,
        task_name: taskName,
        next_due_date: nextDate || null,
        next_due_mileage: nextMi,
        status: "upcoming",
      });
    }

    setSaving(false);
    toast.success("Service report imported");
    closeDialog();
    onImported();
  };

  return (
    <>
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ScanLine size={16} className="text-primary" /> Scan a service report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Upload a PDF or photo of a maintenance invoice, oil-change receipt, or dealer report and we'll
            pull out the service date, mileage, work performed, and the next recommended service.
            The file is also saved to your Documents.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              id="scan-report"
              type="file"
              accept="image/*,.pdf"
              disabled={scanning}
              onChange={(e) => e.target.files?.[0] && runScan(e.target.files[0])}
              className="max-w-xs"
            />
            {scanning && (
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Loader2 size={14} className="animate-spin" /> Reading report…
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!extracted} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review extracted service info</DialogTitle>
          </DialogHeader>
          {extracted && (
            <div className="space-y-3 text-sm">
              {extracted.confidence && extracted.confidence !== "high" && (
                <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-2 text-xs">
                  AI confidence is {extracted.confidence}. Please double-check the fields below before saving.
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date</Label>
                  <Input value={extracted.service_date || ""} onChange={(e) => setExtracted({ ...extracted, service_date: e.target.value })} />
                </div>
                <div>
                  <Label>Mileage</Label>
                  <Input inputMode="numeric" value={String(extracted.mileage || "")} onChange={(e) => setExtracted({ ...extracted, mileage: parseInt(e.target.value.replace(/\D/g, ""), 10) || 0 })} />
                </div>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={extracted.service_type || "maintenance"} onValueChange={(v) => setExtracted({ ...extracted, service_type: v })}>
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
              <div>
                <Label>Services performed</Label>
                <Textarea
                  rows={4}
                  value={Array.isArray(extracted.services_performed) ? extracted.services_performed.join("\n") : ""}
                  onChange={(e) => setExtracted({ ...extracted, services_performed: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Shop</Label>
                  <Input value={extracted.shop_name || ""} onChange={(e) => setExtracted({ ...extracted, shop_name: e.target.value })} />
                </div>
                <div>
                  <Label>Total cost</Label>
                  <Input inputMode="decimal" value={String(extracted.total_cost || "")} onChange={(e) => setExtracted({ ...extracted, total_cost: parseFloat(e.target.value.replace(/[^\d.]/g, "")) || 0 })} />
                </div>
              </div>
              {extracted.technician_notes && (
                <div>
                  <Label>Technician notes</Label>
                  <Textarea rows={2} value={extracted.technician_notes} onChange={(e) => setExtracted({ ...extracted, technician_notes: e.target.value })} />
                </div>
              )}
              <div className="rounded-md border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Next recommended service</p>
                  <label className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <input type="checkbox" checked={addNextTask} onChange={(e) => setAddNextTask(e.target.checked)} />
                    Add as task
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Due date</Label>
                    <Input value={extracted.next_service_date || ""} onChange={(e) => setExtracted({ ...extracted, next_service_date: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Due mileage</Label>
                    <Input inputMode="numeric" value={String(extracted.next_service_mileage || "")} onChange={(e) => setExtracted({ ...extracted, next_service_mileage: parseInt(e.target.value.replace(/\D/g, ""), 10) || 0 })} />
                  </div>
                </div>
                {extracted.next_service_notes && (
                  <p className="text-xs text-muted-foreground">{extracted.next_service_notes}</p>
                )}
              </div>
              {docRow && (
                <p className="text-xs text-muted-foreground">
                  <Check size={12} className="inline mr-1 text-primary" />
                  File saved to Documents as "{docRow.file_name}".
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog} disabled={saving}>Cancel</Button>
            <Button onClick={importIt} disabled={saving}>
              {saving ? "Saving…" : "Save to service log"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
