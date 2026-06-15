import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Wrench, MapPin, DollarSign, Trash2, ChevronDown, ChevronUp, Phone, PhoneOff, MessageSquare, CheckCircle, XCircle, Car, Bike } from "lucide-react";
import { toast } from "sonner";

const AUTO_CATEGORIES = [
  "Oil Change", "Brakes", "Tires", "Battery", "Engine Diagnostics",
  "Transmission", "Suspension", "AC / Heat", "Electrical", "Body / Paint",
  "Detailing", "Pre-Purchase Inspection", "Towing", "Other",
];
const MOTO_CATEGORIES = [
  "Oil Change", "Tires", "Chain & Sprockets", "Brakes", "Valve Adjustment",
  "Fork / Suspension", "Battery", "Carb / Fuel", "Electrical",
  "Bodywork / Paint", "Pre-Purchase Inspection", "Towing", "Other",
];

type Vehicle = { id: string; nickname: string; vehicle_type: string; year: number | null; make: string; model: string; };
type Job = {
  id: string; title: string; description: string | null; category: string;
  service_type: string; city: string; state: string; country: string;
  mobile_service: boolean; budget_min: number | null; budget_max: number | null;
  status: string; vehicle_id: string | null; created_at: string;
};
type Bid = {
  id: string; vehicle_job_id: string; provider_id: string; message: string;
  bid_amount: number | null; estimated_hours: number | null; status: string;
  call_approved: boolean; phone_number: string | null; created_at: string;
  provider?: { user_id: string; business_name: string; category: string; city: string; state: string; years_experience: number | null; licensed: boolean; insured: boolean; phone: string | null };
};

export default function GarageJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bids, setBids] = useState<Record<string, Bid[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    vehicle_id: "", title: "", description: "", category: "",
    service_type: "auto", city: "", state: "", country: "US",
    mobile_service: false, budget_min: "", budget_max: "",
  });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: jobsData }, { data: vehData }] = await Promise.all([
      supabase.from("vehicle_jobs").select("*").eq("owner_user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("vehicles").select("id, nickname, vehicle_type, year, make, model").eq("owner_user_id", user.id),
    ]);
    setJobs((jobsData as Job[]) || []);
    setVehicles((vehData as Vehicle[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const loadBids = async (jobId: string) => {
    const { data } = await supabase
      .from("vehicle_job_bids")
      .select("*, provider:providers(user_id, business_name, category, city, state, years_experience, licensed, insured, phone)")
      .eq("vehicle_job_id", jobId)
      .order("created_at", { ascending: false });
    setBids((p) => ({ ...p, [jobId]: (data as unknown as Bid[]) || [] }));
  };

  const toggleExpand = (id: string) => {
    if (expanded === id) setExpanded(null);
    else { setExpanded(id); loadBids(id); }
  };

  const submit = async () => {
    if (!user) return;
    if (!form.title || !form.category || !form.city || !form.state) {
      toast.error("Fill in title, category, city, and state.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("vehicle_jobs").insert({
      owner_user_id: user.id,
      vehicle_id: form.vehicle_id || null,
      title: form.title,
      description: form.description || null,
      category: form.category,
      service_type: form.service_type,
      city: form.city,
      state: form.state,
      country: form.country,
      mobile_service: form.mobile_service,
      budget_min: form.budget_min ? Number(form.budget_min) : null,
      budget_max: form.budget_max ? Number(form.budget_max) : null,
      status: "open",
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Job posted — mechanics can now bid.");
    setForm({ vehicle_id: "", title: "", description: "", category: "", service_type: "auto", city: "", state: "", country: "US", mobile_service: false, budget_min: "", budget_max: "" });
    setShowForm(false);
    load();
  };

  const deleteJob = async (id: string) => {
    if (!confirm("Delete this job?")) return;
    await supabase.from("vehicle_jobs").delete().eq("id", id);
    setJobs((p) => p.filter((j) => j.id !== id));
    toast.success("Job deleted");
  };

  const setBidStatus = async (bid: Bid, status: string) => {
    await supabase.from("vehicle_job_bids").update({ status }).eq("id", bid.id);
    loadBids(bid.vehicle_job_id);
    toast.success(status === "accepted" ? "Bid accepted" : "Bid updated");
  };

  const toggleCall = async (bid: Bid) => {
    if (!bid.call_approved) {
      const phone = prompt("Enter the phone number to share with this mechanic:");
      if (!phone || phone.trim().length < 7) return;
      await supabase.from("vehicle_job_bids").update({ phone_number: phone.trim(), call_approved: true }).eq("id", bid.id);
    } else {
      await supabase.from("vehicle_job_bids").update({ call_approved: false, phone_number: null }).eq("id", bid.id);
    }
    loadBids(bid.vehicle_job_id);
  };

  const messagePro = async (bid: Bid) => {
    if (!user || !bid.provider?.user_id) return;
    const body = prompt(`Message ${bid.provider.business_name}:`);
    if (!body?.trim()) return;
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id, recipient_id: bid.provider.user_id,
      provider_id: bid.provider_id, subject: `Re: ${bid.message.slice(0, 50)}`, body: body.trim(),
    });
    if (error) toast.error(error.message);
    else toast.success("Message sent");
  };

  const categories = form.service_type === "motorcycle" ? MOTO_CATEGORIES : AUTO_CATEGORIES;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Vehicle Jobs</h1>
          <p className="text-sm text-muted-foreground">Post repairs or service work and get bids from local mechanics.</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> Post a Job</Button>
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : jobs.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Wrench className="w-10 h-10 mx-auto mb-3 opacity-60" />
          No vehicle jobs yet. Post one to get mechanic bids.
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const veh = vehicles.find((v) => v.id === job.vehicle_id);
            const isOpen = expanded === job.id;
            const jobBids = bids[job.id] || [];
            return (
              <Card key={job.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {job.service_type === "motorcycle" ? <Bike className="w-4 h-4" /> : <Car className="w-4 h-4" />}
                        <CardTitle className="text-base">{job.title}</CardTitle>
                        <Badge variant="secondary">{job.status}</Badge>
                        {job.mobile_service && <Badge variant="outline">Mobile OK</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                        <span>{job.category}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.city}, {job.state}</span>
                        {(job.budget_min || job.budget_max) && (
                          <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />
                            {job.budget_min || 0}{job.budget_max ? `–${job.budget_max}` : "+"}
                          </span>
                        )}
                        {veh && <span>{veh.year} {veh.make} {veh.model}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => toggleExpand(job.id)}>
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteJob(job.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {isOpen && (
                  <CardContent className="pt-0 space-y-3">
                    {job.description && <p className="text-sm text-muted-foreground">{job.description}</p>}
                    <div className="border-t pt-3">
                      <h4 className="text-sm font-semibold mb-2">Bids ({jobBids.length})</h4>
                      {jobBids.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No bids yet. We'll notify you when mechanics respond.</p>
                      ) : (
                        <div className="space-y-2">
                          {jobBids.map((b) => (
                            <div key={b.id} className="rounded-md border p-3 text-sm">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div>
                                  <div className="font-medium">{b.provider?.business_name || "Mechanic"}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {b.provider?.city}, {b.provider?.state}
                                    {b.provider?.years_experience ? ` · ${b.provider.years_experience}y` : ""}
                                    {b.provider?.licensed ? " · Licensed" : ""}
                                    {b.provider?.insured ? " · Insured" : ""}
                                  </div>
                                </div>
                                <Badge variant={b.status === "accepted" ? "default" : "secondary"}>{b.status}</Badge>
                              </div>
                              <p className="text-sm mb-2">{b.message}</p>
                              <div className="text-xs text-muted-foreground mb-2">
                                {b.bid_amount != null && <>Bid: <strong>${b.bid_amount}</strong> </>}
                                {b.estimated_hours != null && <>· ~{b.estimated_hours}h</>}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button size="sm" variant="outline" onClick={() => messagePro(b)}>
                                  <MessageSquare className="w-3 h-3 mr-1" /> Message
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => toggleCall(b)}>
                                  {b.call_approved ? <><PhoneOff className="w-3 h-3 mr-1" /> Revoke call</> : <><Phone className="w-3 h-3 mr-1" /> Approve call</>}
                                </Button>
                                {b.status === "pending" && (
                                  <>
                                    <Button size="sm" onClick={() => setBidStatus(b, "accepted")}>
                                      <CheckCircle className="w-3 h-3 mr-1" /> Accept
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setBidStatus(b, "rejected")}>
                                      <XCircle className="w-3 h-3 mr-1" /> Decline
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Post a vehicle job</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Service type</Label>
                <Select value={form.service_type} onValueChange={(v) => setForm({ ...form, service_type: v, category: "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Car / Truck</SelectItem>
                    <SelectItem value="motorcycle">Motorcycle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vehicle (optional)</Label>
                <Select value={form.vehicle_id || "none"} onValueChange={(v) => setForm({ ...form, vehicle_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.nickname || `${v.year ?? ""} ${v.make} ${v.model}`.trim()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Front brake pads replacement" />
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Symptoms, when it started, what you've tried…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>City *</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>State *</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Budget min ($)</Label><Input type="number" value={form.budget_min} onChange={(e) => setForm({ ...form, budget_min: e.target.value })} /></div>
              <div><Label>Budget max ($)</Label><Input type="number" value={form.budget_max} onChange={(e) => setForm({ ...form, budget_max: e.target.value })} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.mobile_service} onCheckedChange={(v) => setForm({ ...form, mobile_service: !!v })} />
              Open to mobile mechanics coming to me
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={submit} disabled={submitting}>{submitting ? "Posting…" : "Post Job"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
