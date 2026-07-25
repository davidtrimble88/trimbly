import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MapPin, Zap } from "lucide-react";
import {
  Building2, Shield, Star, Briefcase, MessageSquare,
  LayoutDashboard, Sparkles, QrCode, MapPinned, HelpCircle,
} from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import CredentialAlertBanner from "@/components/pro/CredentialAlertBanner";
import { useProNotifications } from "@/hooks/useProNotifications";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { DashboardNavItem } from "@/components/dashboard/types";
import ProOverviewTab from "@/components/dashboard/pro/ProOverviewTab";
import ProBidsTab from "@/components/dashboard/pro/ProBidsTab";
import ProToolsTab from "@/components/dashboard/pro/ProToolsTab";
import ProReviewsTab from "@/components/dashboard/pro/ProReviewsTab";
import ProMessagesTab from "@/components/dashboard/pro/ProMessagesTab";
import ProProfileTab from "@/components/dashboard/pro/ProProfileTab";
import VerificationTab from "@/components/dashboard/pro/VerificationTab";
import EditProfileDialog from "@/components/dashboard/pro/EditProfileDialog";
import ChangeLocationDialog from "@/components/dashboard/pro/ChangeLocationDialog";
import type { ProviderProfile, BidWithJob, ReviewRow, MessageRow, ProviderStats } from "@/components/dashboard/pro/types";

const ProDashboard = () => {
  const { user, loading: authLoading, profileName } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [stats, setStats] = useState<ProviderStats | null>(null);
  const [bids, setBids] = useState<BidWithJob[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [bidUnreadCounts, setBidUnreadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ProviderProfile>>({});
  const [saving, setSaving] = useState(false);
  const activeTab = searchParams.get("tab") || "overview";
  const setActiveTab = (tab: string) => {
    if (tab === "overview") {
      searchParams.delete("tab");
    } else {
      searchParams.set("tab", tab);
    }
    setSearchParams(searchParams, { replace: true });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const [locationOpen, setLocationOpen] = useState(false);
  const [locCity, setLocCity] = useState("");
  const [locState, setLocState] = useState("");
  const [locPostal, setLocPostal] = useState("");
  const [locCountry, setLocCountry] = useState("US");
  const [savingLoc, setSavingLoc] = useState(false);
  const [replayTour, setReplayTour] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user]);

  // Toasts driven by Stripe checkout redirects (?verification=..., ?subscription=...)
  useEffect(() => {
    const checkoutParams: { param: string; messages: Record<string, { title: string; description?: string }> }[] = [
      {
        param: "verification",
        messages: {
          success: { title: "Payment received", description: "We're setting up your verification now. It may take a moment to appear below." },
          cancelled: { title: "Checkout cancelled", description: "No charge was made. You can start verification again anytime." },
        },
      },
      {
        param: "subscription",
        messages: {
          success: { title: "Welcome to Pro!", description: "Your subscription is active. It may take a moment to reflect below." },
          cancelled: { title: "Checkout cancelled", description: "No charge was made. You're still on the Free plan." },
        },
      },
    ];
    for (const { param, messages: msgs } of checkoutParams) {
      const result = searchParams.get(param);
      if (!result) continue;
      const msg = msgs[result];
      if (msg) toast(msg);
      searchParams.delete(param);
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    loadAll();
  }, [user]);

  useProNotifications({
    userId: user?.id || null,
    providerId: provider?.id || null,
    providerState: provider?.state || null,
    providerCategory: provider?.category || null,
  });

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);

    const { data: provData } = await supabase
      .from("providers")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!provData) {
      setLoading(false);
      return;
    }

    setProvider(provData as ProviderProfile);

    const [statsRes, bidsRes, reviewsRes, msgsRes] = await Promise.all([
      supabase.from("provider_stats").select("*").eq("provider_id", provData.id).maybeSingle(),
      supabase.from("job_bids")
        .select("*, job:jobs(title, category, city, state, status, description, homeowner_id)")
        .eq("provider_id", provData.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("reviews")
        .select("*")
        .eq("provider_id", provData.id)
        .order("created_at", { ascending: false }),
      supabase.from("messages")
        .select("*")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    setStats(statsRes.data as ProviderStats | null);
    const bidsData = (bidsRes.data as unknown as BidWithJob[]) || [];
    setBids(bidsData);
    setReviews((reviewsRes.data as ReviewRow[]) || []);
    setMessages((msgsRes.data as MessageRow[]) || []);

    const homeownerIds = Array.from(new Set(bidsData.map(b => b.job?.homeowner_id).filter(Boolean) as string[]));
    if (homeownerIds.length > 0) {
      const { data: unread } = await supabase
        .from("messages")
        .select("sender_id")
        .eq("recipient_id", user.id)
        .eq("read", false)
        .in("sender_id", homeownerIds);
      const counts: Record<string, number> = {};
      (unread || []).forEach((m: any) => {
        counts[m.sender_id] = (counts[m.sender_id] || 0) + 1;
      });
      setBidUnreadCounts(counts);
    } else {
      setBidUnreadCounts({});
    }
    setLoading(false);
  };

  const toggleAvailability = async () => {
    if (!provider) return;
    const newVal = !provider.available;
    await supabase.from("providers").update({ available: newVal }).eq("id", provider.id);
    setProvider({ ...provider, available: newVal });
    toast({ title: newVal ? "You're now available" : "You're now unavailable" });
  };

  const openEdit = () => {
    if (!provider) return;
    setEditForm({ ...provider });
    setEditOpen(true);
  };

  const saveProfile = async () => {
    if (!provider || !editForm) return;
    setSaving(true);
    const { error } = await supabase.from("providers").update({
      business_name: editForm.business_name,
      category: editForm.category,
      city: editForm.city,
      state: editForm.state,
      phone: editForm.phone || null,
      show_phone_publicly: editForm.show_phone_publicly ?? false,
      website: editForm.website || null,
      description: editForm.description || null,
      hourly_rate_min: editForm.hourly_rate_min,
      hourly_rate_max: editForm.hourly_rate_max,
      years_experience: editForm.years_experience,
      licensed: editForm.licensed,
      license_number: editForm.licensed ? editForm.license_number : null,
      insured: editForm.insured,
      insurance_details: editForm.insured ? editForm.insurance_details : null,
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

  const openLocation = () => {
    if (!provider) return;
    setLocCity(provider.city || "");
    setLocState(provider.state || "");
    setLocPostal(provider.postal_code || "");
    setLocCountry(provider.country || "US");
    setLocationOpen(true);
  };

  const saveLocation = async () => {
    if (!provider) return;
    const hasCityState = locCity.trim() && locState.trim();
    const hasPostal = locPostal.trim();
    if (!hasCityState && !hasPostal) {
      toast({ title: "Enter city + state or a ZIP/postal code", variant: "destructive" });
      return;
    }
    setSavingLoc(true);
    const updates = {
      city: locCity.trim(),
      state: locState.trim(),
      postal_code: locPostal.trim(),
      country: locCountry,
    };
    const { error } = await supabase.from("providers").update(updates).eq("id", provider.id);
    setSavingLoc(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setProvider({ ...provider, ...updates });
      setLocationOpen(false);
      toast({ title: "Location updated" });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background container mx-auto px-4 pt-16 pb-16 max-w-5xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Building2 className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-3xl font-bold mb-2">No Provider Profile</h1>
          <p className="text-muted-foreground mb-6">Create your business profile to start receiving jobs and bids.</p>
          <Button size="lg" onClick={() => navigate("/pro-register")}>Register as a Pro</Button>
        </div>
      </div>
    );
  }

  const displayName = profileName || provider.business_name;
  const avgRating = stats?.avg_rating ? Number(stats.avg_rating).toFixed(1) : "—";
  const reviewCount = stats?.review_count || 0;
  const pendingBids = bids.filter(b => b.status === "pending").length;
  const acceptedBids = bids.filter(b => b.status === "accepted").length;
  const unreadMessages = messages.filter(m => !m.read).length;

  const navItems: DashboardNavItem[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "bids", label: "Bids", icon: Briefcase, badge: pendingBids },
    { id: "tools", label: "Tools", icon: Sparkles },
    { id: "reviews", label: "Reviews", icon: Star },
    { id: "messages", label: "Messages", icon: MessageSquare, badge: unreadMessages },
    { id: "profile", label: "Profile", icon: Building2 },
    { id: "verification", label: "Verification", icon: Shield },
    { id: "equipment", label: "Equipment", icon: Sparkles, href: "/equipment" },
  ];

  return (
    <>
      <OnboardingTour
        storageKey={`hh-tour-pro-${user?.id ?? "anon"}`}
        intro={{
          title: `Welcome to Trimbly Pro, ${provider?.business_name || "there"}!`,
          body: "Here's a quick walkthrough of your Pro Dashboard so you can start landing jobs right away.",
        }}
        steps={[
          { title: "Overview", body: "Your at-a-glance stats: profile views, pending bids, unread messages, and reviews. Watch the credential alert banner — keep your license and insurance dates current to stay visible in search." },
          { title: "Bids Tab", body: "Browse open job posts from homeowners in your service area and submit bids. Accepted bids move into an active chat thread." },
          { title: "Tools Tab", body: "Grow My Business (marketing, referrals, AI leads) and Day-to-Day Work (quotes, plans, mileage). Your business info, service area, and app settings live on the Profile tab." },
          { title: "Reviews Tab", body: "Monitor your ratings and respond to homeowner reviews. Auto-review requests can be enabled in Tools." },
          { title: "Messages Tab", body: "Chat with homeowners in-app. Phone numbers stay private until the homeowner explicitly shares them — keep first contact in messaging." },
          { title: "Profile Tab", body: "Edit your business details, services, gallery, business hours, service area, license & insurance info, plus notification and app settings. A complete, up-to-date profile gets significantly more leads." },
          { title: "Go Pro for More", body: "Upgrade to Pro Provider for unlimited bids, priority placement, AI tools, and advanced analytics. Find pricing on the Pro Pricing page." },
        ]}
        onReplayReady={(replay) => setReplayTour(() => replay)}
      />
      <DashboardShell
        brandLabel="Pro Dashboard"
        navItems={navItems}
        activeItemId={activeTab}
        onNavigate={(item) => setActiveTab(item.id)}
        sidebarFooter={
          <SidebarMenuButton onClick={() => replayTour?.()}>
            <HelpCircle /> <span>Replay tour</span>
          </SidebarMenuButton>
        }
        header={{
          avatarIcon: Building2,
          displayName,
          subtitle: (
            <>
              <Badge variant="secondary" className="text-xs">{provider.category}</Badge>
              <button
                onClick={openLocation}
                className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 underline-offset-2 hover:underline"
              >
                <MapPin size={12} /> {provider.city}, {provider.state}
              </button>
              {provider.subscription_tier === "pro" && (
                <Badge className="bg-primary text-primary-foreground text-xs gap-1">
                  <Zap size={10} /> Verified Pro
                </Badge>
              )}
            </>
          ),
          available: provider.available,
          onToggleAvailable: toggleAvailability,
          onEditProfile: openEdit,
          onViewPublicProfile: () => navigate(`/pro/${provider.id}`),
          extraMenuItems: (
            <>
              <DropdownMenuItem onClick={openLocation}>
                <MapPinned size={14} className="mr-2" /> Change Location
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/my-qr")}>
                <QrCode size={14} className="mr-2" /> My QR Code
              </DropdownMenuItem>
            </>
          ),
        }}
      >
        <CredentialAlertBanner
          licenseExpiry={provider.license_expiry}
          insuranceExpiry={provider.insurance_expiry}
          onGoToTools={() => setActiveTab("tools")}
        />
        <div className="mt-6">
          {activeTab === "overview" && (
            <ProOverviewTab
              providerId={provider.id}
              avgRating={avgRating}
              reviewCount={reviewCount}
              pendingBids={pendingBids}
              acceptedBids={acceptedBids}
              unreadMessages={unreadMessages}
              recentBids={bids}
              onGoToTab={setActiveTab}
            />
          )}
          {activeTab === "bids" && <ProBidsTab bids={bids} bidUnreadCounts={bidUnreadCounts} />}
          {activeTab === "tools" && (
            <ProToolsTab provider={provider} userId={user!.id} onGoToProfile={() => setActiveTab("profile")} />
          )}
          {activeTab === "reviews" && <ProReviewsTab reviews={reviews} reviewCount={reviewCount} />}
          {activeTab === "messages" && <ProMessagesTab messages={messages} />}
          {activeTab === "profile" && (
            <ProProfileTab
              provider={provider}
              userId={user!.id}
              onEditProfile={openEdit}
              onUpdated={(patch) => setProvider((p) => p ? { ...p, ...patch } : p)}
            />
          )}
          {activeTab === "verification" && <VerificationTab providerId={provider.id} />}
        </div>
      </DashboardShell>

      <ChangeLocationDialog
        open={locationOpen}
        onOpenChange={setLocationOpen}
        city={locCity}
        state={locState}
        postal={locPostal}
        country={locCountry}
        onCityChange={setLocCity}
        onStateChange={setLocState}
        onPostalChange={setLocPostal}
        onCountryChange={setLocCountry}
        onSave={saveLocation}
        saving={savingLoc}
      />

      <EditProfileDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        form={editForm}
        onChange={setEditForm}
        onSave={saveProfile}
        saving={saving}
      />
    </>
  );
};

export default ProDashboard;
