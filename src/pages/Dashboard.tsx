import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useHomeLimit } from "@/hooks/useHomeLimit";
import { useGarageSubscription } from "@/hooks/useGarageSubscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { NotificationPermissionPrompt } from "@/components/NotificationPermissionPrompt";
import { ReviewPromptDialog } from "@/components/ReviewPromptDialog";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { DashboardNavItem } from "@/components/dashboard/types";
import HomeownerOverviewTab from "@/components/dashboard/homeowner/HomeownerOverviewTab";
import MyHomesTab from "@/components/dashboard/homeowner/MyHomesTab";
import HomeToolsTab from "@/components/dashboard/homeowner/HomeToolsTab";
import HomeownerProfileTab from "@/components/dashboard/homeowner/HomeownerProfileTab";
import { tierOrder, tierLabels, homeTypeLabels, type HomeData, type TaskRow, type BinderRow, type HomeStats, type DrilldownInfo, type JobStats } from "@/components/dashboard/homeowner/types";
import { taskUrgencyIconClasses } from "@/components/dashboard/homeowner/status";
import {
  Wrench, Brain, CalendarCheck, FolderOpen, MessageSquare,
  Crown, Home, CheckCircle2, Shield, HelpCircle,
  Briefcase,
  LayoutDashboard, Sparkles, UserCircle, Car,
} from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading, profileName } = useAuth();
  const { subscriptionTier, maxHomes, maxBinderItems, loading: limitLoading, homeCount } = useHomeLimit();
  const { active: hasGarage } = useGarageSubscription();
  const { toast } = useToast();
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
  const [homes, setHomes] = useState<HomeData[]>([]);
  const [homeStats, setHomeStats] = useState<Record<string, HomeStats>>({});
  const [loadingHomes, setLoadingHomes] = useState(true);
  const [editingHome, setEditingHome] = useState<HomeData | null>(null);
  const [deletingHome, setDeletingHome] = useState<HomeData | null>(null);
  const [editForm, setEditForm] = useState<Partial<HomeData>>({});
  const [saving, setSaving] = useState(false);
  const [allTasks, setAllTasks] = useState<TaskRow[]>([]);
  const [allBinderItems, setAllBinderItems] = useState<BinderRow[]>([]);
  const [drilldown, setDrilldown] = useState<DrilldownInfo | null>(null);
  const [jobStats, setJobStats] = useState<JobStats>({ total: 0, pending: 0, withBids: 0, accepted: 0, completed: 0 });
  const [showWizard, setShowWizard] = useState(false);
  const [replayTour, setReplayTour] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  // Redirect providers to their own dashboard so they don't see the homeowner UI
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("user_type").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data?.user_type === "provider") navigate("/pro-dashboard", { replace: true });
    });
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    loadHomesAndStats();
    loadJobStats();
  }, [user]);

  const loadJobStats = async () => {
    if (!user) return;
    const { data: jobs } = await supabase
      .from("jobs")
      .select("id, status")
      .eq("homeowner_id", user.id);
    const jobList = jobs || [];
    const ids = jobList.map(j => j.id);
    let bidJobIds = new Set<string>();
    if (ids.length) {
      const { data: bids } = await supabase
        .from("job_bids")
        .select("job_id")
        .in("job_id", ids);
      bidJobIds = new Set((bids || []).map(b => b.job_id));
    }
    setJobStats({
      total: jobList.length,
      pending: jobList.filter(j => j.status === "pending" || j.status === "open").length,
      withBids: jobList.filter(j => bidJobIds.has(j.id)).length,
      accepted: jobList.filter(j => j.status === "accepted" || j.status === "in_progress").length,
      completed: jobList.filter(j => j.status === "completed").length,
    });
  };

  const loadHomesAndStats = async () => {
    if (!user) return;
    setLoadingHomes(true);

    const { data: homesData } = await supabase
      .from("homes")
      .select("id, name, home_type, year_built, square_feet, city, state, hvac_type, roof_type, has_pool, has_septic, has_well_water")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    const homesList = (homesData as HomeData[]) || [];
    setHomes(homesList);

    if (homesList.length === 0) {
      const skipped = localStorage.getItem("hh_wizard_skipped");
      if (!skipped) setShowWizard(true);
      setLoadingHomes(false);
      return;
    }

    const homeIds = homesList.map(h => h.id);

    const [{ data: tasks }, { data: binderItems }] = await Promise.all([
      supabase.from("maintenance_tasks").select("home_id, title, status, priority, due_date, category").in("home_id", homeIds),
      supabase.from("home_binder_items").select("home_id, name, warranty_expiry, item_type").in("home_id", homeIds),
    ]);

    setAllTasks((tasks as TaskRow[]) || []);
    setAllBinderItems((binderItems as BinderRow[]) || []);

    const now = new Date();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const statsMap: Record<string, HomeStats> = {};

    for (const home of homesList) {
      const homeTasks = (tasks || []).filter(t => t.home_id === home.id);
      const homeItems = (binderItems || []).filter(i => i.home_id === home.id);

      statsMap[home.id] = {
        homeId: home.id,
        totalTasks: homeTasks.length,
        overdueTasks: homeTasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== "completed").length,
        upcomingTasks: homeTasks.filter(t => t.status === "upcoming").length,
        completedTasks: homeTasks.filter(t => t.status === "completed").length,
        highPriorityTasks: homeTasks.filter(t => t.priority === "high" && t.status !== "completed").length,
        binderItemCount: homeItems.length,
        expiringWarranties: homeItems.filter(i => {
          if (!i.warranty_expiry) return false;
          const diff = new Date(i.warranty_expiry).getTime() - now.getTime();
          return diff > 0 && diff < thirtyDays;
        }).length,
      };
    }

    setHomeStats(statsMap);
    setLoadingHomes(false);
  };

  const startEdit = (h: HomeData) => {
    setEditingHome(h);
    setEditForm({ ...h });
  };

  const saveEdit = async () => {
    if (!editingHome || !editForm) return;
    setSaving(true);
    const { error } = await supabase.from("homes").update({
      name: editForm.name,
      home_type: editForm.home_type,
      year_built: editForm.year_built,
      square_feet: editForm.square_feet,
      city: editForm.city,
      state: editForm.state,
      hvac_type: editForm.hvac_type,
      roof_type: editForm.roof_type,
      has_pool: editForm.has_pool,
      has_septic: editForm.has_septic,
      has_well_water: editForm.has_well_water,
      updated_at: new Date().toISOString(),
    }).eq("id", editingHome.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: "Failed to update home.", variant: "destructive" });
    } else {
      setHomes(prev => prev.map(h => h.id === editingHome.id ? { ...h, ...editForm } as HomeData : h));
      setEditingHome(null);
      toast({ title: "Home updated" });
    }
  };

  const deleteHome = async () => {
    if (!deletingHome) return;
    setSaving(true);
    // Delete related data first
    await Promise.all([
      supabase.from("maintenance_tasks").delete().eq("home_id", deletingHome.id),
      supabase.from("home_binder_items").delete().eq("home_id", deletingHome.id),
    ]);
    const { error } = await supabase.from("homes").delete().eq("id", deletingHome.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: "Failed to delete home.", variant: "destructive" });
    } else {
      setHomes(prev => prev.filter(h => h.id !== deletingHome.id));
      const newStats = { ...homeStats };
      delete newStats[deletingHome.id];
      setHomeStats(newStats);
      setDeletingHome(null);
      toast({ title: "Home removed", description: `"${deletingHome.name}" and its data have been deleted.` });
    }
  };

  if (authLoading || limitLoading) {
    return (
      <div className="min-h-screen bg-background container mx-auto px-4 pt-16 pb-16 max-w-5xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const userTierLevel = tierOrder[subscriptionTier] ?? 0;
  const displayName = profileName || user.user_metadata?.full_name || user.email;
  const isPro = userTierLevel >= 1;

  const navItems: DashboardNavItem[] = [
    { id: "overview", label: "Home Base", icon: LayoutDashboard, group: "Dashboard" },
    { id: "homes", label: "My Homes", icon: Home, badge: homes.length, group: "Dashboard" },
    { id: "tools", label: "Home Tools", icon: Sparkles, group: "Dashboard" },
    { id: "profile", label: "Profile", icon: UserCircle, group: "Dashboard" },
    { id: "maintenance", label: "Maintenance Autopilot", icon: CalendarCheck, href: "/maintenance", group: "Quick Links" },
    { id: "binder-link", label: "Home Binder", icon: FolderOpen, href: "/binder", group: "Quick Links" },
    { id: "find-pro", label: "Find a Pro", icon: Wrench, href: "/search", group: "Quick Links" },
    { id: "estimator-link", label: "AI Estimator", icon: Brain, href: "/estimator", group: "Quick Links" },
    { id: "messages-link", label: "Messages", icon: MessageSquare, href: "/messages", group: "Quick Links" },
    { id: "coverage", label: "Coverage Advisor", icon: Shield, href: "/coverage", group: "Quick Links" },
    { id: "post-job-link", label: "Post a Job", icon: Briefcase, href: "/post-job", group: "Quick Links" },
    { id: "garage", label: hasGarage ? "Garage" : "Add Garage", icon: Car, href: hasGarage ? "/garage" : "/garage/upsell", group: "Quick Links" },
  ];

  return (
    <>
      <OnboardingTour
        storageKey={`hh-tour-homeowner-${user.id}`}
        intro={{
          title: `Welcome to Trimbly, ${displayName?.split(" ")[0] || "friend"}!`,
          body: "Let's take a quick tour of your dashboard so you know where everything lives. It'll only take a minute.",
        }}
        steps={[
          { title: "Your Public Profile", body: "Personalize your name, photo, and bio. Other homeowners and pros can see this when you connect with them." },
          { title: "Your Homes", body: "Add and manage your home profiles here. Each home gets its own maintenance schedule, binder, and AI insights tailored to its size, age, and systems." },
          { title: "Job Posts", body: "Post a job to get bids from local pros. Track pending, accepted, and completed jobs at a glance — tap any tile to jump to the job board." },
          { title: "Home Care Tools", body: "Generate a maintenance schedule, get AI symptom triage when something breaks, and keep your Digital Home Binder of manuals and warranties up to date." },
          { title: "Get Help", body: "Search trusted pros, post a job, use the AI Job Estimator for cost ranges, and the Coverage Advisor to check what your warranty or insurance covers." },
          { title: "Messages & Reviews", body: "Chat with pros directly in-app — your phone number stays private until you approve sharing it. Leave reviews after a job is complete." },
          { title: "Upgrade Anytime", body: "Free covers the basics. Upgrade to Home Hero for unlimited estimates, AI tools, and binder items, or Home Super Hero to manage up to 10 properties." },
        ]}
        onReplayReady={(replay) => setReplayTour(() => replay)}
      />
      {user && (
        <OnboardingWizard
          open={showWizard}
          userId={user.id}
          onComplete={(id) => { setShowWizard(false); loadHomesAndStats(); }}
          onSkip={() => { setShowWizard(false); localStorage.setItem("hh_wizard_skipped", "1"); }}
        />
      )}
      <DashboardShell
        brandLabel="My Home"
        navItems={navItems}
        groups={["Dashboard", "Quick Links"]}
        activeItemId={activeTab}
        onNavigate={(item) => setActiveTab(item.id)}
        sidebarFooter={
          <SidebarMenuButton onClick={() => replayTour?.()}>
            <HelpCircle /> <span>Replay tour</span>
          </SidebarMenuButton>
        }
        header={{
          avatarIcon: Home,
          displayName,
          subtitle: (
            <>
              <Badge variant="secondary" className="text-xs gap-1">
                <Crown size={12} className="text-primary" /> {tierLabels[subscriptionTier] ?? "Free"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {maxHomes} home{maxHomes !== 1 ? "s" : ""} · {maxBinderItems === Infinity ? "Unlimited" : maxBinderItems} binder items
              </span>
            </>
          ),
          onEditProfile: () => setActiveTab("profile"),
        }}
      >
        <NotificationPermissionPrompt />
        <ReviewPromptDialog />

        {activeTab === "overview" && (
          <div className="mt-2">
            <HomeownerOverviewTab
              jobStats={jobStats}
              subscriptionTier={subscriptionTier}
              homes={homes}
              homeStats={homeStats}
              allTasks={allTasks}
              isPro={isPro}
              onGoToHomes={() => setActiveTab("homes")}
            />
          </div>
        )}

        {activeTab === "homes" && (
          <div className="mt-2">
            <MyHomesTab
              homes={homes}
              homeStats={homeStats}
              allTasks={allTasks}
              loadingHomes={loadingHomes}
              maxHomes={maxHomes}
              isPro={isPro}
              onAddHome={() => setShowWizard(true)}
              onEditHome={startEdit}
              onDeleteHome={setDeletingHome}
              onDrilldown={setDrilldown}
            />
          </div>
        )}

        {activeTab === "tools" && (
          <div className="mt-2">
            <HomeToolsTab subscriptionTier={subscriptionTier} />
          </div>
        )}

        {activeTab === "profile" && (
          <div className="mt-2">
            <HomeownerProfileTab userId={user.id} displayName={displayName} />
          </div>
        )}
      </DashboardShell>

      {/* Edit Home Dialog */}
      <Dialog open={!!editingHome} onOpenChange={open => !open && setEditingHome(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Home</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Home Name</Label>
              <Input value={editForm.name || ""} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">City</Label>
                <Input value={editForm.city || ""} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">State</Label>
                <Input value={editForm.state || ""} onChange={e => setEditForm(f => ({ ...f, state: e.target.value }))} maxLength={2} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Year Built</Label>
                <Input type="number" value={editForm.year_built || ""} onChange={e => setEditForm(f => ({ ...f, year_built: e.target.value ? Number(e.target.value) : null }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Square Feet</Label>
                <Input type="number" value={editForm.square_feet || ""} onChange={e => setEditForm(f => ({ ...f, square_feet: e.target.value ? Number(e.target.value) : null }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-sm">Home Type</Label>
              <select
                value={editForm.home_type || "single_family"}
                onChange={e => setEditForm(f => ({ ...f, home_type: e.target.value }))}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {Object.entries(homeTypeLabels).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">HVAC Type</Label>
                <Input value={editForm.hvac_type || ""} onChange={e => setEditForm(f => ({ ...f, hvac_type: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Roof Type</Label>
                <Input value={editForm.roof_type || ""} onChange={e => setEditForm(f => ({ ...f, roof_type: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editForm.has_pool || false} onChange={e => setEditForm(f => ({ ...f, has_pool: e.target.checked }))} /> Pool
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editForm.has_septic || false} onChange={e => setEditForm(f => ({ ...f, has_septic: e.target.checked }))} /> Septic
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editForm.has_well_water || false} onChange={e => setEditForm(f => ({ ...f, has_well_water: e.target.checked }))} /> Well Water
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingHome(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Home Confirmation */}
      <AlertDialog open={!!deletingHome} onOpenChange={open => !open && setDeletingHome(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove "{deletingHome?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this home and all its maintenance tasks and binder items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteHome} disabled={saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {saving ? "Removing…" : "Remove Home"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Drilldown Dialog */}
      <Dialog open={!!drilldown} onOpenChange={open => !open && setDrilldown(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{drilldown?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {drilldown && (() => {
              const now = new Date();
              const thirtyDays = 30 * 24 * 60 * 60 * 1000;
              const homeTasks = allTasks.filter(t => t.home_id === drilldown.homeId);
              const homeItems = allBinderItems.filter(i => i.home_id === drilldown.homeId);

              if (drilldown.filter === "overdue") {
                const items = homeTasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== "completed");
                return items.length === 0 ? <p className="text-sm text-muted-foreground">No overdue tasks.</p> : items.map((t, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.category} · Due {t.due_date}</p>
                    </div>
                    <Badge variant="destructive" className="text-xs">{t.priority}</Badge>
                  </div>
                ));
              }
              if (drilldown.filter === "high_priority") {
                const items = homeTasks.filter(t => t.priority === "high" && t.status !== "completed");
                return items.length === 0 ? <p className="text-sm text-muted-foreground">No high priority tasks.</p> : items.map((t, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.category} · {t.status}{t.due_date ? ` · Due ${t.due_date}` : ""}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">High</Badge>
                  </div>
                ));
              }
              if (drilldown.filter === "upcoming") {
                const items = homeTasks.filter(t => t.status === "upcoming");
                return items.length === 0 ? <p className="text-sm text-muted-foreground">No upcoming tasks.</p> : items.map((t, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.category}{t.due_date ? ` · Due ${t.due_date}` : ""}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{t.priority}</Badge>
                  </div>
                ));
              }
              if (drilldown.filter === "completed") {
                const items = homeTasks.filter(t => t.status === "completed");
                return items.length === 0 ? <p className="text-sm text-muted-foreground">No completed tasks.</p> : items.map((t, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.category}</p>
                    </div>
                    <CheckCircle2 size={14} className={taskUrgencyIconClasses.completed} />
                  </div>
                ));
              }
              if (drilldown.filter === "binder") {
                return homeItems.length === 0 ? <p className="text-sm text-muted-foreground">No binder items.</p> : homeItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.item_type}{item.warranty_expiry ? ` · Warranty: ${item.warranty_expiry}` : ""}</p>
                    </div>
                    <FolderOpen size={14} className="text-muted-foreground" />
                  </div>
                ));
              }
              if (drilldown.filter === "expiring_warranties") {
                const items = homeItems.filter(i => {
                  if (!i.warranty_expiry) return false;
                  const diff = new Date(i.warranty_expiry).getTime() - now.getTime();
                  return diff > 0 && diff < thirtyDays;
                });
                return items.length === 0 ? <p className="text-sm text-muted-foreground">No expiring warranties.</p> : items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.item_type} · Expires {item.warranty_expiry}</p>
                    </div>
                    <Shield size={14} className={taskUrgencyIconClasses.high_priority} />
                  </div>
                ));
              }
              return null;
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Dashboard;
