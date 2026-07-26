import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wrench, Car, Bike, MapPin, DollarSign, Star, MessageSquare,
  Briefcase, Zap, ExternalLink, LayoutDashboard, QrCode, CheckCircle, Sparkles,
} from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import InspectionReportDialog from "@/components/mechanic/InspectionReportDialog";
import PaymentMethodsPanel from "@/components/pro/PaymentMethodsPanel";
import MechanicToolsTab from "@/components/dashboard/mechanic/MechanicToolsTab";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { DashboardNavItem } from "@/components/dashboard/types";
import StatCard from "@/components/dashboard/StatCard";
import EditProfileDialog from "@/components/dashboard/pro/EditProfileDialog";
import type { ProviderProfile } from "@/components/dashboard/pro/types";

type VBid = {
  id: string; vehicle_job_id: string; message: string;
  bid_amount: number | null; estimated_hours: number | null;
  status: string; call_approved: boolean; created_at: string;
  vehicle_job?: { title: string; service_type: string; city: string; state: string; status: string; description: string | null; owner_user_id: string | null; vehicle_id: string | null; };
};

export default function MechanicDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [bids, setBids] = useState<VBid[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const activeTab = searchParams.get("tab") || "overview";
  const setActiveTab = (tab: string) => {
    if (tab === "overview") {
      searchParams.delete("tab");
    } else {
      searchParams.set("tab", tab);
    }
    setSearchParams(searchParams, { replace: true });
  };
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ProviderProfile>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const result = searchParams.get("subscription");
    if (!result) return;
    if (result === "success") {
      toast({ title: "Welcome to Pro Mechanic!", description: "Your subscription is active." });
    } else if (result === "cancelled") {
      toast({ title: "Checkout cancelled", description: "No charge was made." });
    }
    searchParams.delete("subscription");
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: prov } = await supabase.from("providers").select("*").eq("user_id", user.id).maybeSingle();
    if (!prov) { setLoading(false); return; }
    setProvider(prov as ProviderProfile);

    const [bidsRes, reviewsRes, msgsRes] = await Promise.all([
      supabase.from("vehicle_job_bids")
        .select("*, vehicle_job:vehicle_jobs(title, service_type, city, state, status, description, owner_user_id, vehicle_id)")
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
    toast({ title: v ? "You're now available" : "You're now unavailable" });
  };

  const [markingCompleteId, setMarkingCompleteId] = useState<string | null>(null);
  const markJobComplete = async (bid: VBid) => {
    if (!user || !bid.vehicle_job) return;
    if (!confirm(`Mark "${bid.vehicle_job.title}" as complete? The vehicle owner will be notified and asked to leave a review.`)) return;
    setMarkingCompleteId(bid.id);
    try {
      const { error: jErr } = await supabase
        .from("vehicle_jobs")
        .update({ status: "completed" })
        .eq("id", bid.vehicle_job_id);
      if (jErr) throw jErr;

      if (bid.vehicle_job.owner_user_id) {
        await supabase.from("messages").insert({
          sender_id: user.id,
          recipient_id: bid.vehicle_job.owner_user_id,
          subject: `Job complete: ${bid.vehicle_job.title}`,
          body: `${provider?.business_name || "Your mechanic"} marked "${bid.vehicle_job.title}" as complete. If everything looks good, please take a moment to leave a quick review.`,
        });
      }

      setBids((prev) => prev.map((b) => (
        b.id === bid.id && b.vehicle_job ? { ...b, vehicle_job: { ...b.vehicle_job, status: "completed" } } : b
      )));
      toast({ title: "Marked complete", description: "The vehicle owner has been notified and asked to review." });
    } catch (e: any) {
      toast({ title: "Couldn't mark complete", description: e.message || "Try again.", variant: "destructive" });
    } finally {
      setMarkingCompleteId(null);
    }
  };

  const openEdit = () => { if (provider) { setEditForm(provider); setEditOpen(true); } };
  const saveEdit = async () => {
    if (!provider) return;
    setSaving(true);
    const { error } = await supabase.from("providers").update({
      business_name: editForm.business_name,
      category: editForm.category,
      city: editForm.city, state: editForm.state,
      phone: editForm.phone || null, show_phone_publicly: editForm.show_phone_publicly ?? false, website: editForm.website || null,
      description: editForm.description || null,
      hourly_rate_min: editForm.hourly_rate_min,
      hourly_rate_max: editForm.hourly_rate_max,
    }).eq("id", provider.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setProvider({ ...provider, ...editForm } as ProviderProfile);
      setEditOpen(false);
      toast({ title: "Profile updated" });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background container mx-auto px-4 pt-16 pb-16 max-w-5xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid md:grid-cols-4 gap-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Wrench className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-3xl font-bold mb-2">No Mechanic Profile</h1>
          <p className="text-muted-foreground mb-6">Create your shop profile to start receiving vehicle jobs.</p>
          <Button size="lg" onClick={() => navigate("/mechanic-pricing")}>Register as a Mechanic</Button>
        </div>
      </div>
    );
  }

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1) : "—";
  const pending = bids.filter(b => b.status === "pending").length;
  const accepted = bids.filter(b => b.status === "accepted").length;
  const unread = messages.filter(m => !m.read).length;

  const navItems: DashboardNavItem[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "bids", label: "Bids", icon: Wrench, badge: pending },
    { id: "tools", label: "Tools", icon: Sparkles },
    { id: "reviews", label: "Reviews", icon: Star },
    { id: "messages", label: "Messages", icon: MessageSquare, badge: unread },
  ];

  return (
    <>
      <DashboardShell
        brandLabel="Mechanic Dashboard"
        navItems={navItems}
        activeItemId={activeTab}
        onNavigate={(item) => setActiveTab(item.id)}
        header={{
          avatarIcon: Wrench,
          displayName: provider.business_name,
          subtitle: (
            <>
              <Badge variant="secondary" className="text-xs">{provider.category}</Badge>
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <MapPin size={12} /> {provider.city}, {provider.state}
              </span>
              {provider.subscription_tier === "pro" && (
                <Badge className="bg-primary text-primary-foreground text-xs gap-1"><Zap size={10} /> Verified Pro</Badge>
              )}
            </>
          ),
          available: provider.available,
          onToggleAvailable: toggleAvailable,
          onEditProfile: openEdit,
          onViewPublicProfile: () => navigate(`/pro/${provider.id}`),
          extraMenuItems: (
            <DropdownMenuItem onClick={() => navigate("/my-qr")}>
              <QrCode size={14} className="mr-2" /> My QR Code
            </DropdownMenuItem>
          ),
        }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard icon={Briefcase} value={pending} label="Pending Bids" onClick={() => setActiveTab("bids")} />
          <StatCard icon={Star} value={avgRating} label="Avg Rating" isEmpty={reviews.length === 0} emptyLabel="No reviews yet" onClick={() => setActiveTab("reviews")} />
          <StatCard icon={MessageSquare} value={unread} label="Unread" onClick={() => setActiveTab("messages")} />
          <StatCard icon={DollarSign} value={accepted} label="Accepted" onClick={() => setActiveTab("bids")} />
        </div>

        {activeTab === "overview" && (
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Find New Vehicle Work</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Browse open jobs from My Garage subscribers and place bids.</p>
                <Button onClick={() => navigate("/vehicle-jobs")} className="gap-2"><Wrench size={14} /> Open Vehicle Jobs Board <ExternalLink size={12} /></Button>
              </CardContent>
            </Card>
            <PaymentMethodsPanel
              providerId={provider.id}
              initialMethods={provider.payment_methods}
              initialHandles={provider.payment_handles}
              onSaved={(methods, handles) => setProvider((p) => p ? { ...p, payment_methods: methods, payment_handles: handles } : p)}
            />
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
          </div>
        )}

        {activeTab === "bids" && (
          <div className="space-y-3">
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
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>{b.message}</p>
                  {b.vehicle_job && <p className="text-xs">{b.vehicle_job.city}, {b.vehicle_job.state} · {new Date(b.created_at).toLocaleDateString()}</p>}
                  {b.status === "accepted" && b.vehicle_job?.vehicle_id && b.vehicle_job?.owner_user_id && provider && (
                    <InspectionReportDialog
                      vehicleId={b.vehicle_job.vehicle_id}
                      providerId={provider.id}
                      ownerUserId={b.vehicle_job.owner_user_id}
                      vehicleJobId={b.vehicle_job_id}
                    />
                  )}
                  {b.status === "accepted" && b.vehicle_job?.status !== "completed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => markJobComplete(b)}
                      disabled={markingCompleteId === b.id}
                    >
                      <CheckCircle size={14} /> {markingCompleteId === b.id ? "Marking..." : "Mark job complete"}
                    </Button>
                  )}
                  {b.vehicle_job?.status === "completed" && (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <CheckCircle size={10} /> Completed
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === "tools" && (
          <MechanicToolsTab
            provider={provider}
            userId={user!.id}
            onUpdated={(patch) => setProvider((p) => p ? { ...p, ...patch } : p)}
          />
        )}

        {activeTab === "reviews" && (
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No reviews yet.</CardContent></Card>
            ) : reviews.map(r => (
              <Card key={r.id}><CardContent className="py-4">
                <div className="flex items-center gap-1 text-accent mb-1">
                  {Array.from({ length: r.rating || 0 }).map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                </div>
                <p className="text-sm">{r.comment}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
              </CardContent></Card>
            ))}
          </div>
        )}

        {activeTab === "messages" && (
          <div className="space-y-3">
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
          </div>
        )}
      </DashboardShell>

      <EditProfileDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        form={editForm}
        onChange={setEditForm}
        onSave={saveEdit}
        saving={saving}
        variant="mechanic"
      />
    </>
  );
}
