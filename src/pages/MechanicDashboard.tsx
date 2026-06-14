import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Wrench, Car, Bike, MapPin, DollarSign, Star, MessageSquare,
  Briefcase, Zap, ExternalLink, Pencil,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type Provider = {
  id: string; user_id: string; business_name: string; category: string;
  city: string; state: string; phone: string | null; website: string | null;
  description: string | null; hourly_rate_min: number; hourly_rate_max: number;
  available: boolean; subscription_tier: string; licensed: boolean;
  license_number: string | null; insured: boolean; insurance_details: string | null;
  provider_type?: string; slug?: string | null;
};

type VBid = {
  id: string; vehicle_job_id: string; message: string;
  bid_amount: number | null; estimated_hours: number | null;
  status: string; call_approved: boolean; created_at: string;
  vehicle_job?: { title: string; service_type: string; city: string; state: string; status: string; description: string | null; owner_user_id: string | null; };
};

export default function MechanicDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [bids, setBids] = useState<VBid[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Provider>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: prov } = await supabase.from("providers").select("*").eq("user_id", user.id).maybeSingle();
    if (!prov) { setLoading(false); return; }
    setProvider(prov as Provider);

    const [bidsRes, reviewsRes, msgsRes] = await Promise.all([
      supabase.from("vehicle_job_bids")
        .select("*, vehicle_job:vehicle_jobs(title, service_type, city, state, status, description, owner_user_id)")
        .eq("provider_id", prov.id)
        .order("created_at", { ascending: false }).limit(50),
      supabase.from("reviews").select("*").eq("provider_id", prov.id).order("created_at", { ascending: false }),
      supabase.from("messages").select("*").eq("recipient_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);
    setBids((bidsRes.data as any[] as VBid[]) || []);
    setReviews(reviewsRes.data || []);
    setMessages(msgsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const toggleAvailable = async () => {
    if (!provider) return;
    const v = !provider.available;
    await supabase.from("providers").update({ available: v }).eq("id", provider.id);
    setProvider({ ...provider, available: v });
    toast.success(v ? "You're now available" : "You're now unavailable");
  };

  const openEdit = () => { if (provider) { setEditForm(provider); setEditOpen(true); } };
  const saveEdit = async () => {
    if (!provider) return;
    setSaving(true);
    const { error } = await supabase.from("providers").update({
      business_name: editForm.business_name,
      category: editForm.category,
      city: editForm.city, state: editForm.state,
      phone: editForm.phone || null, website: editForm.website || null,
      description: editForm.description || null,
      hourly_rate_min: editForm.hourly_rate_min,
      hourly_rate_max: editForm.hourly_rate_max,
    }).eq("id", provider.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { setProvider({ ...provider, ...editForm } as Provider); setEditOpen(false); toast.success("Profile updated"); }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-16 max-w-5xl space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}</div>
          <Skeleton className="h-64" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-16 text-center">
          <Wrench className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-3xl font-bold mb-2">No Mechanic Profile</h1>
          <p className="text-muted-foreground mb-6">Create your shop profile to start receiving vehicle jobs.</p>
          <Button size="lg" onClick={() => navigate("/mechanic-pricing")}>Register as a Mechanic</Button>
        </div>
        <Footer />
      </div>
    );
  }

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1) : "—";
  const pending = bids.filter(b => b.status === "pending").length;
  const accepted = bids.filter(b => b.status === "accepted").length;
  const unread = messages.filter(m => !m.read).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex items-start justify-between gap-3 mb-6">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground flex items-center gap-2">
                <Wrench className="h-7 w-7 text-primary shrink-0" />
                <span className="truncate">{provider.business_name}</span>
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">{provider.category}</Badge>
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <MapPin size={12} /> {provider.city}, {provider.state}
                </span>
                {provider.subscription_tier === "pro" && (
                  <Badge className="bg-primary text-primary-foreground text-xs gap-1"><Zap size={10} /> Verified Pro</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground hidden sm:inline">Available</span>
              <Switch checked={provider.available} onCheckedChange={toggleAvailable} />
              <Button variant="outline" size="sm" onClick={openEdit}><Pencil size={14} className="mr-1.5" />Edit</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard icon={Briefcase} label="Pending Bids" value={pending} />
            <StatCard icon={Star} label="Avg Rating" value={avgRating} />
            <StatCard icon={MessageSquare} label="Unread" value={unread} />
            <StatCard icon={DollarSign} label="Accepted" value={accepted} />
          </div>

          <Tabs value={tab} onValueChange={setTab} className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="bids">Bids</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="messages">Messages</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Find New Vehicle Work</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">Browse open jobs from My Garage subscribers and place bids.</p>
                  <Button onClick={() => navigate("/vehicle-jobs")} className="gap-2"><Wrench size={14} /> Open Vehicle Jobs Board <ExternalLink size={12} /></Button>
                </CardContent>
              </Card>
              {provider.subscription_tier !== "pro" && (
                <Card className="border-primary/40 bg-primary/5">
                  <CardContent className="py-5 flex items-start gap-4">
                    <Zap className="text-primary mt-1" />
                    <div className="flex-1">
                      <div className="font-semibold">Upgrade to Pro Mechanic</div>
                      <p className="text-sm text-muted-foreground mb-3">Priority placement, verified badge, bid analytics & more leads.</p>
                      <Button size="sm" onClick={() => navigate("/mechanic-pricing")}>See Pro plan</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="bids" className="space-y-3">
              {bids.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">
                  No bids yet. <Button variant="link" onClick={() => navigate("/vehicle-jobs")}>Browse open vehicle jobs →</Button>
                </CardContent></Card>
              ) : bids.map(b => (
                <Card key={b.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {b.vehicle_job?.service_type === "motorcycle" ? <Bike className="w-4 h-4" /> : <Car className="w-4 h-4" />}
                        <CardTitle className="text-base">{b.vehicle_job?.title || "Vehicle job"}</CardTitle>
                        <Badge variant={b.status === "accepted" ? "default" : b.status === "rejected" ? "destructive" : "secondary"}>{b.status}</Badge>
                      </div>
                      {b.bid_amount && <span className="text-sm font-semibold">${b.bid_amount}</span>}
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-1">
                    <p>{b.message}</p>
                    {b.vehicle_job && <p className="text-xs">{b.vehicle_job.city}, {b.vehicle_job.state} · {new Date(b.created_at).toLocaleDateString()}</p>}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="reviews" className="space-y-3">
              {reviews.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">No reviews yet.</CardContent></Card>
              ) : reviews.map(r => (
                <Card key={r.id}><CardContent className="py-4">
                  <div className="flex items-center gap-1 text-amber-500 mb-1">
                    {Array.from({ length: r.rating || 0 }).map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                  </div>
                  <p className="text-sm">{r.comment}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                </CardContent></Card>
              ))}
            </TabsContent>

            <TabsContent value="messages" className="space-y-3">
              {messages.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">No messages.</CardContent></Card>
              ) : messages.map(m => (
                <Card key={m.id} className={!m.read ? "border-primary/40" : ""}>
                  <CardContent className="py-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="font-medium text-sm">{m.subject || "Message"}</div>
                      <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{m.body}</p>
                  </CardContent>
                </Card>
              ))}
              <Button variant="outline" onClick={() => navigate("/messages")} className="w-full">Open Messages</Button>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Shop Profile</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Shop Name</Label><Input value={editForm.business_name || ""} onChange={e => setEditForm(f => ({ ...f, business_name: e.target.value }))} /></div>
            <div><Label>Specialty</Label><Input value={editForm.category || ""} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>City</Label><Input value={editForm.city || ""} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} /></div>
              <div><Label>State</Label><Input value={editForm.state || ""} onChange={e => setEditForm(f => ({ ...f, state: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Min $/hr</Label><Input type="number" value={editForm.hourly_rate_min || 0} onChange={e => setEditForm(f => ({ ...f, hourly_rate_min: Number(e.target.value) }))} /></div>
              <div><Label>Max $/hr</Label><Input type="number" value={editForm.hourly_rate_max || 0} onChange={e => setEditForm(f => ({ ...f, hourly_rate_max: Number(e.target.value) }))} /></div>
            </div>
            <div><Label>Phone</Label><Input value={editForm.phone || ""} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><Label>Website</Label><Input value={editForm.website || ""} onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))} /></div>
            <div><Label>About</Label>
              <textarea className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm min-h-[80px]" value={editForm.description || ""} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <Card><CardContent className="py-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs"><Icon size={14} />{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </CardContent></Card>
  );
}
