import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useHomeLimit } from "@/hooks/useHomeLimit";
import { Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Wrench, Brain, CalendarCheck, FolderOpen, MessageSquare, Star,
  Lock, Crown, Home, AlertTriangle, CheckCircle2, Clock, Shield,
  MapPin, Ruler, Calendar, Thermometer, Plus, MoreVertical, Pencil, Trash2,
  Briefcase, BookOpen
} from "lucide-react";

// ─── Service definitions ───
const allServices = [
  { icon: Wrench, title: "Find Local Pros", description: "Search by service, distance, rating, and availability.", route: "/search", minTier: "free" },
  { icon: Brain, title: "AI Job Estimator", description: "Unlimited instant cost estimates, material lists, and DIY vs. pro recommendations.", route: "/estimator", minTier: "homeowner_pro" },
  { icon: CalendarCheck, title: "Maintenance Autopilot", description: "Advanced automated schedules based on your home profile.", route: "/maintenance", minTier: "free" },
  { icon: FolderOpen, title: "Digital Home Binder", description: "Store appliance info, warranties, past jobs, and documents (5 items).", route: "/binder", minTier: "homeowner_pro" },
  { icon: MessageSquare, title: "In-App Messaging", description: "Chat directly with pros, share photos, and track job status.", route: "/messages", minTier: "free" },
  { icon: Star, title: "Verified Reviews", description: "Read and leave honest reviews from real homeowners.", route: "/search", minTier: "free" },
  { icon: Shield, title: "Coverage Advisor", description: "Upload warranty & insurance docs and ask AI about your coverage.", route: "/coverage", minTier: "homeowner_pro" },
  { icon: Briefcase, title: "Post a Job", description: "Post job requests for pros to bid on. Control who can message and call you.", route: "/post-job", minTier: "free" },
  { icon: BookOpen, title: "User Manual Finder", description: "Enter brand & model — instantly find and download the user manual.", route: "/manual-search", minTier: "free" },
];

const tierOrder: Record<string, number> = { free: 0, homeowner_pro: 1, multi_pro: 2 };
const tierLabels: Record<string, string> = { free: "Free", homeowner_pro: "Homeowner Pro", multi_pro: "Multi-Homeowner Pro" };

const homeTypeLabels: Record<string, string> = {
  single_family: "Single Family",
  townhouse: "Townhouse",
  condo: "Condo",
  multi_family: "Multi-Family",
  mobile: "Mobile Home",
};

// ─── Types ───
type HomeData = {
  id: string;
  name: string;
  home_type: string;
  year_built: number | null;
  square_feet: number | null;
  city: string;
  state: string;
  hvac_type: string | null;
  roof_type: string | null;
  has_pool: boolean;
  has_septic: boolean;
  has_well_water: boolean;
};

type TaskRow = {
  home_id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  category: string;
};

type BinderRow = {
  home_id: string;
  name: string;
  warranty_expiry: string | null;
  item_type: string;
};

type HomeStats = {
  homeId: string;
  totalTasks: number;
  overdueTasks: number;
  upcomingTasks: number;
  completedTasks: number;
  highPriorityTasks: number;
  binderItemCount: number;
  expiringWarranties: number;
};

type DrilldownInfo = {
  title: string;
  homeId: string;
  filter: "overdue" | "high_priority" | "upcoming" | "completed" | "binder" | "expiring_warranties";
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, profileName } = useAuth();
  const { subscriptionTier, maxHomes, maxBinderItems, loading: limitLoading, homeCount } = useHomeLimit();
  const { toast } = useToast();
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
  const [jobStats, setJobStats] = useState({ total: 0, pending: 0, withBids: 0, accepted: 0, completed: 0 });

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

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

    if (homesList.length === 0) { setLoadingHomes(false); return; }

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user) return null;

  const userTierLevel = tierOrder[subscriptionTier] ?? 0;
  const displayName = profileName || user.user_metadata?.full_name || user.email;
  const isUnlocked = (minTier: string) => userTierLevel >= (tierOrder[minTier] ?? 0);
  const isPro = userTierLevel >= 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-2">
              Welcome back, {displayName}
            </h1>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-sm px-3 py-1">
                <Crown size={14} className="mr-1.5 text-primary" />
                {tierLabels[subscriptionTier] ?? "Free"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {maxHomes} home{maxHomes !== 1 ? "s" : ""} · {maxBinderItems === Infinity ? "Unlimited" : maxBinderItems} binder items
              </span>
            </div>
          </div>

          {/* ─── Home Analysis Section ─── */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Home size={20} className="text-primary" />
                Your Homes
                <span className="text-sm font-normal text-muted-foreground">({homes.length}/{maxHomes})</span>
              </h2>
              {homes.length < maxHomes && (
                <Button size="sm" onClick={() => navigate("/maintenance")}>
                  <Plus size={14} className="mr-1.5" /> Add Home
                </Button>
              )}
            </div>

            {loadingHomes ? (
              <div className="text-muted-foreground text-sm py-8 text-center">Loading home data…</div>
            ) : homes.length === 0 ? (
              <Card className="text-center py-10">
                <CardContent>
                  <Home size={40} className="mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">No homes added yet. Set up your first home to get personalized insights.</p>
                  <Button onClick={() => navigate("/maintenance")}>Add Your Home</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {homes.map((home) => {
                  const stats = homeStats[home.id];
                  const homeAge = home.year_built ? new Date().getFullYear() - home.year_built : null;

                  return (
                    <Card key={home.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      {/* Home header */}
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Home size={18} className="text-primary" />
                              {home.name}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-1 mt-1">
                              <MapPin size={13} />
                              {home.city}, {home.state?.toUpperCase()}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-xs shrink-0">
                              {homeTypeLabels[home.home_type] || home.home_type}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical size={14} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => startEdit(home)}>
                                  <Pencil size={14} className="mr-2" /> Edit Home
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDeletingHome(home)} className="text-destructive focus:text-destructive">
                                  <Trash2 size={14} className="mr-2" /> Remove Home
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Home details row */}
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {home.year_built && (
                            <span className="flex items-center gap-1">
                              <Calendar size={12} /> Built {home.year_built} {homeAge ? `(${homeAge} yrs)` : ""}
                            </span>
                          )}
                          {home.square_feet && (
                            <span className="flex items-center gap-1">
                              <Ruler size={12} /> {home.square_feet.toLocaleString()} sq ft
                            </span>
                          )}
                          {home.hvac_type && (
                            <span className="flex items-center gap-1">
                              <Thermometer size={12} /> {home.hvac_type}
                            </span>
                          )}
                        </div>

                        {/* Feature badges */}
                        <div className="flex flex-wrap gap-1.5">
                          {home.roof_type && <Badge variant="secondary" className="text-xs">{home.roof_type} roof</Badge>}
                          {home.has_pool && <Badge variant="secondary" className="text-xs">Pool</Badge>}
                          {home.has_septic && <Badge variant="secondary" className="text-xs">Septic</Badge>}
                          {home.has_well_water && <Badge variant="secondary" className="text-xs">Well Water</Badge>}
                        </div>

                        {/* Maintenance stats - clickable */}
                        {stats && (
                          <div className="grid grid-cols-2 gap-2">
                            {stats.overdueTasks > 0 && (
                              <button onClick={() => setDrilldown({ title: `${home.name} — Overdue`, homeId: home.id, filter: "overdue" })} className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 hover:ring-2 hover:ring-destructive/30 transition-all text-left">
                                <AlertTriangle size={14} className="text-destructive" />
                                <span className="text-sm font-medium text-destructive">{stats.overdueTasks} overdue</span>
                              </button>
                            )}
                            {stats.highPriorityTasks > 0 && (
                              <button onClick={() => setDrilldown({ title: `${home.name} — High Priority`, homeId: home.id, filter: "high_priority" })} className="flex items-center gap-2 rounded-lg bg-orange-100 dark:bg-orange-900/20 px-3 py-2 hover:ring-2 hover:ring-orange-300 dark:hover:ring-orange-700 transition-all text-left">
                                <Clock size={14} className="text-orange-600 dark:text-orange-400" />
                                <span className="text-sm font-medium text-orange-700 dark:text-orange-400">{stats.highPriorityTasks} high priority</span>
                              </button>
                            )}
                            <button onClick={() => setDrilldown({ title: `${home.name} — Upcoming`, homeId: home.id, filter: "upcoming" })} className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 hover:ring-2 hover:ring-primary/30 transition-all text-left">
                              <CalendarCheck size={14} className="text-primary" />
                              <span className="text-sm font-medium text-primary">{stats.upcomingTasks} upcoming</span>
                            </button>
                            <button onClick={() => setDrilldown({ title: `${home.name} — Completed`, homeId: home.id, filter: "completed" })} className="flex items-center gap-2 rounded-lg bg-green-100 dark:bg-green-900/20 px-3 py-2 hover:ring-2 hover:ring-green-300 dark:hover:ring-green-700 transition-all text-left">
                              <CheckCircle2 size={14} className="text-green-600 dark:text-green-400" />
                              <span className="text-sm font-medium text-green-700 dark:text-green-400">{stats.completedTasks} completed</span>
                            </button>
                          </div>
                        )}

                        {/* Pro-only: Binder & warranty stats - clickable */}
                        {isPro && stats && (
                          <div className="border-t border-border pt-3 space-y-2">
                            <button onClick={() => setDrilldown({ title: `${home.name} — Binder Items`, homeId: home.id, filter: "binder" })} className="flex items-center justify-between text-sm w-full hover:bg-muted/50 rounded-lg px-2 py-1 transition-colors">
                              <span className="text-muted-foreground flex items-center gap-1.5">
                                <FolderOpen size={14} /> Binder items
                              </span>
                              <span className="font-medium text-foreground">{stats.binderItemCount}</span>
                            </button>
                            {stats.expiringWarranties > 0 && (
                              <button onClick={() => setDrilldown({ title: `${home.name} — Expiring Warranties`, homeId: home.id, filter: "expiring_warranties" })} className="flex items-center justify-between text-sm w-full hover:bg-muted/50 rounded-lg px-2 py-1 transition-colors">
                                <span className="text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                                  <Shield size={14} /> Warranties expiring soon
                                </span>
                                <span className="font-medium text-orange-600 dark:text-orange-400">{stats.expiringWarranties}</span>
                              </button>
                            )}
                          </div>
                        )}

                        {!isPro && (
                          <div className="border-t border-border pt-3 flex items-center gap-2 text-xs text-muted-foreground">
                            <Lock size={12} />
                            Upgrade to Pro to see binder & warranty insights
                          </div>
                        )}
                      </CardContent>

                      <CardFooter className="gap-2">
                        <Button variant="default" size="sm" className="flex-1" onClick={() => navigate("/maintenance")}>
                          <CalendarCheck size={14} className="mr-1.5" /> Maintenance
                        </Button>
                        {isPro && (
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate("/binder")}>
                            <FolderOpen size={14} className="mr-1.5" /> Binder
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => navigate("/estimator")}>
                          <Brain size={14} />
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── My Job Posts Section ─── */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Briefcase size={20} className="text-primary" />
                My Job Posts
                <span className="text-sm font-normal text-muted-foreground">({jobStats.total})</span>
              </h2>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => navigate("/job-board")}>View Board</Button>
                <Button size="sm" onClick={() => navigate("/post-job")}>
                  <Plus size={14} className="mr-1.5" /> Post Job
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <button onClick={() => navigate("/post-job")} className="rounded-lg border border-border bg-card p-4 text-left hover:border-primary/40 hover:shadow-sm transition-all">
                <div className="text-2xl font-bold text-foreground">{jobStats.total}</div>
                <div className="text-xs text-muted-foreground mt-1">Total Posts</div>
              </button>
              <button onClick={() => navigate("/post-job")} className="rounded-lg border border-border bg-orange-50 dark:bg-orange-900/10 p-4 text-left hover:ring-2 hover:ring-orange-300 dark:hover:ring-orange-700 transition-all">
                <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">{jobStats.pending}</div>
                <div className="text-xs text-orange-700/80 dark:text-orange-400/80 mt-1">Pending</div>
              </button>
              <button onClick={() => navigate("/post-job")} className="rounded-lg border border-border bg-primary/10 p-4 text-left hover:ring-2 hover:ring-primary/30 transition-all">
                <div className="text-2xl font-bold text-primary">{jobStats.withBids}</div>
                <div className="text-xs text-primary/80 mt-1">With Bids</div>
              </button>
              <button onClick={() => navigate("/post-job")} className="rounded-lg border border-border bg-blue-50 dark:bg-blue-900/10 p-4 text-left hover:ring-2 hover:ring-blue-300 dark:hover:ring-blue-700 transition-all">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{jobStats.accepted}</div>
                <div className="text-xs text-blue-700/80 dark:text-blue-400/80 mt-1">Accepted</div>
              </button>
              <button onClick={() => navigate("/post-job")} className="rounded-lg border border-border bg-green-50 dark:bg-green-900/10 p-4 text-left hover:ring-2 hover:ring-green-300 dark:hover:ring-green-700 transition-all">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">{jobStats.completed}</div>
                <div className="text-xs text-green-700/80 dark:text-green-400/80 mt-1">Completed</div>
              </button>
            </div>
          </div>


          {subscriptionTier !== "multi_pro" && (() => {
            const nextTier = subscriptionTier === "free" ? "homeowner_pro" : "multi_pro";
            const upgradeConfig: Record<string, { name: string; price: string; period: string; cta: string; newFeatures: string[]; }> = {
              homeowner_pro: {
                name: "Homeowner Pro",
                price: "$5",
                period: "/month",
                cta: "Start Free Trial",
                newFeatures: [
                  "Unlimited job requests",
                  "AI job estimator (unlimited)",
                  "Advanced maintenance schedules",
                  "Priority pro matching",
                  "Emergency support channel",
                  "Digital Home Binder (5 items) + export",
                  "Coverage Advisor (AI-powered)",
                  "Seasonal checklists",
                ],
              },
              multi_pro: {
                name: "Multi-Homeowner Pro",
                price: "$20",
                period: "/month",
                cta: "Upgrade Now",
                newFeatures: [
                  "Up to 10 home profiles",
                  "View homes individually or all together",
                  "Unlimited Digital Home Binder entries",
                ],
              },
            };
            const cfg = upgradeConfig[nextTier];
            return (
              <Card className="mb-12 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden">
                <CardContent className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row md:items-center gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Crown size={20} className="text-primary" />
                        <h3 className="text-lg font-bold text-foreground">Unlock {cfg.name}</h3>
                        <Badge className="bg-primary text-primary-foreground text-xs">{cfg.price}{cfg.period}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">Here's what you'll get by upgrading:</p>
                      <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                        {cfg.newFeatures.map(f => (
                          <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                            <Check size={15} className="text-primary mt-0.5 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="shrink-0">
                      <Button size="lg" onClick={() => navigate("/#pricing")} className="w-full md:w-auto">
                        <Crown size={16} className="mr-2" /> {cfg.cta}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* ─── Services Section ─── */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">Services</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {allServices.map((service) => {
                const unlocked = isUnlocked(service.minTier);
                const comingSoon = !service.route;

                return (
                  <Card
                    key={service.title}
                    className={`relative transition-all duration-200 ${
                      unlocked && !comingSoon
                        ? "hover:border-primary/30 hover:shadow-lg cursor-pointer"
                        : "opacity-60"
                    }`}
                  >
                    {!unlocked && (
                      <div className="absolute top-4 right-4">
                        <Lock size={18} className="text-muted-foreground" />
                      </div>
                    )}
                    <CardHeader>
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                        <service.icon size={24} className="text-primary" />
                      </div>
                      <CardTitle className="text-lg">{service.title}</CardTitle>
                      <CardDescription>{service.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {comingSoon ? (
                        <Badge variant="outline" className="text-muted-foreground">Coming Soon</Badge>
                      ) : unlocked ? (
                        <Button onClick={() => navigate(service.route!)} className="w-full">
                          Open
                        </Button>
                      ) : (
                        <Button variant="outline" className="w-full" onClick={() => navigate("/#pricing")}>
                          Upgrade to Unlock
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </main>

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
                    <CheckCircle2 size={14} className="text-green-600 dark:text-green-400" />
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
                    <Shield size={14} className="text-orange-600 dark:text-orange-400" />
                  </div>
                ));
              }
              return null;
            })()}
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Dashboard;
