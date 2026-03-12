import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useHomeLimit } from "@/hooks/useHomeLimit";
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
  MapPin, Ruler, Calendar, Thermometer, Plus, MoreVertical, Pencil, Trash2
} from "lucide-react";

// ─── Service definitions ───
const allServices = [
  { icon: Wrench, title: "Find Local Pros", description: "Search by service, distance, rating, and availability.", route: "/search", minTier: "free" },
  { icon: Brain, title: "AI Job Estimator", description: "Get instant cost estimates, material lists, and DIY vs. pro recommendations.", route: "/estimator", minTier: "pro" },
  { icon: CalendarCheck, title: "Maintenance Autopilot", description: "Automated schedules based on your home profile.", route: "/maintenance", minTier: "free" },
  { icon: FolderOpen, title: "Digital Home Binder", description: "Store appliance info, warranties, past jobs, and documents.", route: "/binder", minTier: "pro" },
  { icon: MessageSquare, title: "In-App Messaging", description: "Chat directly with pros, share photos, and track job status.", route: null, minTier: "pro" },
  { icon: Star, title: "Verified Reviews", description: "Read and leave honest reviews from real homeowners.", route: "/search", minTier: "free" },
];

const tierOrder: Record<string, number> = { free: 0, pro: 1, multi_pro: 2 };
const tierLabels: Record<string, string> = { free: "Free", pro: "Homeowner Pro", multi_pro: "Multi-Homeowner Pro" };

const homeTypeLabels: Record<string, string> = {
  single_family: "Single Family",
  townhouse: "Townhouse",
  condo: "Condo",
  multi_family: "Multi-Family",
  mobile: "Mobile Home",
};

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

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    loadHomesAndStats();
  }, [user]);

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
      supabase.from("maintenance_tasks").select("home_id, status, priority, due_date").in("home_id", homeIds),
      supabase.from("home_binder_items").select("home_id, warranty_expiry").in("home_id", homeIds),
    ]);

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
              {subscriptionTier === "multi_pro" && homes.length < maxHomes && (
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
                          <Badge variant="outline" className="text-xs shrink-0">
                            {homeTypeLabels[home.home_type] || home.home_type}
                          </Badge>
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

                        {/* Maintenance stats */}
                        {stats && (
                          <div className="grid grid-cols-2 gap-2">
                            {stats.overdueTasks > 0 && (
                              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2">
                                <AlertTriangle size={14} className="text-destructive" />
                                <span className="text-sm font-medium text-destructive">{stats.overdueTasks} overdue</span>
                              </div>
                            )}
                            {stats.highPriorityTasks > 0 && (
                              <div className="flex items-center gap-2 rounded-lg bg-orange-100 dark:bg-orange-900/20 px-3 py-2">
                                <Clock size={14} className="text-orange-600 dark:text-orange-400" />
                                <span className="text-sm font-medium text-orange-700 dark:text-orange-400">{stats.highPriorityTasks} high priority</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
                              <CalendarCheck size={14} className="text-primary" />
                              <span className="text-sm font-medium text-primary">{stats.upcomingTasks} upcoming</span>
                            </div>
                            <div className="flex items-center gap-2 rounded-lg bg-green-100 dark:bg-green-900/20 px-3 py-2">
                              <CheckCircle2 size={14} className="text-green-600 dark:text-green-400" />
                              <span className="text-sm font-medium text-green-700 dark:text-green-400">{stats.completedTasks} completed</span>
                            </div>
                          </div>
                        )}

                        {/* Pro-only: Binder & warranty stats */}
                        {isPro && stats && (
                          <div className="border-t border-border pt-3 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground flex items-center gap-1.5">
                                <FolderOpen size={14} /> Binder items
                              </span>
                              <span className="font-medium text-foreground">{stats.binderItemCount}</span>
                            </div>
                            {stats.expiringWarranties > 0 && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                                  <Shield size={14} /> Warranties expiring soon
                                </span>
                                <span className="font-medium text-orange-600 dark:text-orange-400">{stats.expiringWarranties}</span>
                              </div>
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
      <Footer />
    </div>
  );
};

export default Dashboard;
