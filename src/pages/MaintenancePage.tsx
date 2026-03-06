import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, CalendarCheck, Loader2, Plus, Home, Check, Clock,
  AlertTriangle, Leaf, Sun, Snowflake, CloudRain, RotateCcw, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type HomeProfile = {
  id?: string;
  name: string;
  home_type: string;
  year_built: number | null;
  square_feet: number | null;
  city: string;
  state: string;
  country: string;
  hvac_type: string;
  roof_type: string;
  has_pool: boolean;
  has_septic: boolean;
  has_well_water: boolean;
  notes: string;
};

type MaintenanceTask = {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  due_date: string | null;
  recurrence_months: number;
  season: string;
  completed_at: string | null;
};

const emptyHome: HomeProfile = {
  name: "My Home", home_type: "single_family", year_built: null, square_feet: null,
  city: "", state: "", country: "US", hvac_type: "", roof_type: "",
  has_pool: false, has_septic: false, has_well_water: false, notes: "",
};

const seasonIcons: Record<string, typeof Sun> = { spring: Leaf, summer: Sun, fall: CloudRain, winter: Snowflake, any: Clock };
const priorityColors: Record<string, string> = { high: "destructive", medium: "default", low: "secondary" };

const MaintenancePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [home, setHome] = useState<HomeProfile>(emptyHome);
  const [homeLoaded, setHomeLoaded] = useState(false);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loadingHome, setLoadingHome] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [savingHome, setSavingHome] = useState(false);
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed">("all");

  // Load home profile and tasks
  useEffect(() => {
    if (!user) { setLoadingHome(false); return; }
    loadHome();
  }, [user]);

  const loadHome = async () => {
    setLoadingHome(true);
    const { data } = await supabase
      .from("homes")
      .select("*")
      .eq("user_id", user!.id)
      .limit(1)
      .maybeSingle();

    if (data) {
      setHome({ ...data, year_built: data.year_built ?? null, square_feet: data.square_feet ?? null });
      setHomeLoaded(true);
      loadTasks(data.id);
    } else {
      setShowSetup(true);
    }
    setLoadingHome(false);
  };

  const loadTasks = async (homeId: string) => {
    setLoadingTasks(true);
    const { data } = await supabase
      .from("maintenance_tasks")
      .select("*")
      .eq("home_id", homeId)
      .order("due_date", { ascending: true });
    setTasks((data as MaintenanceTask[]) || []);
    setLoadingTasks(false);
  };

  const saveHome = async () => {
    if (!user) return;
    setSavingHome(true);
    try {
      if (home.id) {
        await supabase.from("homes").update({ ...home, updated_at: new Date().toISOString() }).eq("id", home.id);
      } else {
        const { data } = await supabase.from("homes").insert({ ...home, user_id: user.id }).select().single();
        if (data) setHome({ ...home, id: data.id });
      }
      setHomeLoaded(true);
      setShowSetup(false);
      toast({ title: "Home saved", description: "Your home profile has been saved." });
    } catch {
      toast({ title: "Error", description: "Failed to save home profile.", variant: "destructive" });
    }
    setSavingHome(false);
  };

  const generateSchedule = async () => {
    if (!home.id || !user) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-maintenance", {
        body: { home },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const aiTasks = data.tasks || [];

      // Insert tasks into DB
      const rows = aiTasks.map((t: any) => ({
        home_id: home.id!,
        user_id: user.id,
        title: t.title,
        description: t.description || "",
        category: t.category || "General",
        priority: t.priority || "medium",
        status: "upcoming",
        due_date: t.due_date || null,
        recurrence_months: t.recurrence_months || 0,
        season: t.season || "any",
      }));

      const { error: insertErr } = await supabase.from("maintenance_tasks").insert(rows);
      if (insertErr) throw insertErr;

      await loadTasks(home.id!);
      toast({ title: "Schedule generated!", description: `${aiTasks.length} maintenance tasks added to your calendar.` });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to generate schedule.", variant: "destructive" });
    }
    setGenerating(false);
  };

  const toggleTask = async (task: MaintenanceTask) => {
    const newStatus = task.status === "completed" ? "upcoming" : "completed";
    const completedAt = newStatus === "completed" ? new Date().toISOString() : null;
    await supabase.from("maintenance_tasks").update({ status: newStatus, completed_at: completedAt }).eq("id", task.id);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus, completed_at: completedAt } : t));
  };

  const deleteTask = async (taskId: string) => {
    await supabase.from("maintenance_tasks").delete().eq("id", taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const clearAllTasks = async () => {
    if (!home.id) return;
    await supabase.from("maintenance_tasks").delete().eq("home_id", home.id);
    setTasks([]);
    toast({ title: "Tasks cleared", description: "All maintenance tasks have been removed." });
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === "upcoming") return t.status !== "completed";
    if (filter === "completed") return t.status === "completed";
    return true;
  });

  const upcomingCount = tasks.filter(t => t.status !== "completed").length;
  const overdueCount = tasks.filter(t => t.status !== "completed" && t.due_date && new Date(t.due_date) < new Date()).length;

  if (!user) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-2xl text-center py-20">
            <CalendarCheck size={48} className="mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Sign in to use Maintenance Autopilot</h2>
            <p className="text-muted-foreground mb-6">Create an account to set up your home profile and get a personalized maintenance schedule.</p>
            <Button asChild><Link to="/auth">Sign In / Sign Up</Link></Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
              <ArrowLeft size={16} /> Back to home
            </Link>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CalendarCheck size={22} className="text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-foreground font-display">Maintenance Autopilot</h1>
                  <p className="text-muted-foreground text-sm">AI-powered maintenance schedules for your home</p>
                </div>
              </div>
              {homeLoaded && (
                <Button variant="outline" size="sm" onClick={() => setShowSetup(!showSetup)}>
                  <Home size={14} className="mr-1" /> Edit Home
                </Button>
              )}
            </div>
          </div>

          {loadingHome ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Home Profile Form */}
              {(showSetup || !homeLoaded) && (
                <div className="rounded-xl border border-border bg-card p-6 mb-8">
                  <h2 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                    <Home size={18} className="text-primary" /> {home.id ? "Edit Home Profile" : "Set Up Your Home"}
                  </h2>
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Home Name</Label>
                        <Input value={home.name} onChange={e => setHome({ ...home, name: e.target.value })} placeholder="My Home" />
                      </div>
                      <div>
                        <Label>Home Type</Label>
                        <Select value={home.home_type} onValueChange={v => setHome({ ...home, home_type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single_family">Single Family</SelectItem>
                            <SelectItem value="townhouse">Townhouse</SelectItem>
                            <SelectItem value="condo">Condo</SelectItem>
                            <SelectItem value="duplex">Duplex</SelectItem>
                            <SelectItem value="mobile">Mobile Home</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <Label>Year Built</Label>
                        <Input type="number" value={home.year_built ?? ""} onChange={e => setHome({ ...home, year_built: e.target.value ? Number(e.target.value) : null })} placeholder="2005" />
                      </div>
                      <div>
                        <Label>Square Feet</Label>
                        <Input type="number" value={home.square_feet ?? ""} onChange={e => setHome({ ...home, square_feet: e.target.value ? Number(e.target.value) : null })} placeholder="2000" />
                      </div>
                      <div>
                        <Label>City</Label>
                        <Input value={home.city} onChange={e => setHome({ ...home, city: e.target.value })} placeholder="Austin" />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <Label>State</Label>
                        <Input value={home.state} onChange={e => setHome({ ...home, state: e.target.value })} placeholder="TX" maxLength={2} />
                      </div>
                      <div>
                        <Label>HVAC Type</Label>
                        <Select value={home.hvac_type || "central"} onValueChange={v => setHome({ ...home, hvac_type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="central">Central Air</SelectItem>
                            <SelectItem value="heat_pump">Heat Pump</SelectItem>
                            <SelectItem value="furnace">Furnace</SelectItem>
                            <SelectItem value="mini_split">Mini Split</SelectItem>
                            <SelectItem value="window">Window Units</SelectItem>
                            <SelectItem value="none">None</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Roof Type</Label>
                        <Select value={home.roof_type || "asphalt"} onValueChange={v => setHome({ ...home, roof_type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="asphalt">Asphalt Shingle</SelectItem>
                            <SelectItem value="metal">Metal</SelectItem>
                            <SelectItem value="tile">Tile</SelectItem>
                            <SelectItem value="slate">Slate</SelectItem>
                            <SelectItem value="flat">Flat / TPO</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-6">
                      <div className="flex items-center gap-2">
                        <Switch checked={home.has_pool} onCheckedChange={v => setHome({ ...home, has_pool: v })} />
                        <Label>Pool</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={home.has_septic} onCheckedChange={v => setHome({ ...home, has_septic: v })} />
                        <Label>Septic System</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={home.has_well_water} onCheckedChange={v => setHome({ ...home, has_well_water: v })} />
                        <Label>Well Water</Label>
                      </div>
                    </div>
                    <div>
                      <Label>Additional Notes</Label>
                      <Textarea value={home.notes} onChange={e => setHome({ ...home, notes: e.target.value })} placeholder="e.g. Finished basement, cedar deck, gas water heater..." className="resize-none" />
                    </div>
                    <Button onClick={saveHome} disabled={savingHome}>
                      {savingHome ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                      {home.id ? "Update Home" : "Save Home Profile"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Task Dashboard */}
              {homeLoaded && !showSetup && (
                <>
                  {/* Stats + Actions */}
                  <div className="flex flex-wrap items-center gap-4 mb-6">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock size={14} className="text-primary" />
                      <span className="font-medium text-foreground">{upcomingCount}</span>
                      <span className="text-muted-foreground">upcoming</span>
                    </div>
                    {overdueCount > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <AlertTriangle size={14} className="text-destructive" />
                        <span className="font-medium text-destructive">{overdueCount}</span>
                        <span className="text-muted-foreground">overdue</span>
                      </div>
                    )}
                    <div className="ml-auto flex gap-2">
                      {tasks.length > 0 && (
                        <Button variant="outline" size="sm" onClick={clearAllTasks}>
                          <Trash2 size={14} className="mr-1" /> Clear All
                        </Button>
                      )}
                      <Button onClick={generateSchedule} disabled={generating} size="sm" className="gap-1">
                        {generating ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                        {tasks.length === 0 ? "Generate Schedule" : "Regenerate"}
                      </Button>
                    </div>
                  </div>

                  {generating && tasks.length === 0 && (
                    <div className="flex flex-col items-center py-16 gap-3">
                      <Loader2 size={36} className="animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">AI is building your personalized maintenance schedule...</p>
                    </div>
                  )}

                  {!generating && tasks.length === 0 && (
                    <div className="text-center py-16 rounded-xl border border-border bg-card">
                      <CalendarCheck size={40} className="mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-bold text-lg text-foreground mb-2">No maintenance tasks yet</h3>
                      <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
                        Generate an AI-powered maintenance schedule based on your home profile.
                      </p>
                      <Button onClick={generateSchedule} disabled={generating} className="gap-2">
                        <CalendarCheck size={16} /> Generate My Schedule
                      </Button>
                    </div>
                  )}

                  {tasks.length > 0 && (
                    <>
                      {/* Filter tabs */}
                      <div className="flex gap-2 mb-4">
                        {(["all", "upcoming", "completed"] as const).map(f => (
                          <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                              filter === f
                                ? "bg-primary text-primary-foreground border-primary"
                                : "text-muted-foreground border-transparent hover:bg-secondary"
                            }`}
                          >
                            {f.charAt(0).toUpperCase() + f.slice(1)} {f === "all" ? `(${tasks.length})` : f === "upcoming" ? `(${upcomingCount})` : `(${tasks.length - upcomingCount})`}
                          </button>
                        ))}
                      </div>

                      {/* Task List */}
                      <div className="space-y-3">
                        {filteredTasks.map(task => {
                          const isOverdue = task.status !== "completed" && task.due_date && new Date(task.due_date) < new Date();
                          const SeasonIcon = seasonIcons[task.season] || Clock;
                          return (
                            <div
                              key={task.id}
                              className={`rounded-xl border bg-card p-4 transition-all ${
                                task.status === "completed" ? "opacity-60 border-border" : isOverdue ? "border-destructive/30" : "border-border hover:border-primary/30"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <button
                                  onClick={() => toggleTask(task)}
                                  className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                    task.status === "completed"
                                      ? "bg-primary border-primary text-primary-foreground"
                                      : "border-muted-foreground hover:border-primary"
                                  }`}
                                >
                                  {task.status === "completed" && <Check size={12} />}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className={`font-semibold text-sm ${task.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                      {task.title}
                                    </h4>
                                    <Badge variant={priorityColors[task.priority] as any} className="text-[10px] px-1.5 py-0">
                                      {task.priority}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                                      <SeasonIcon size={10} /> {task.season}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{task.category}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                    {task.due_date && (
                                      <span className={isOverdue ? "text-destructive font-medium" : ""}>
                                        {isOverdue ? "Overdue: " : "Due: "}
                                        {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                      </span>
                                    )}
                                    {task.recurrence_months > 0 && (
                                      <span className="flex items-center gap-1">
                                        <RotateCcw size={10} /> Every {task.recurrence_months} mo
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <button onClick={() => deleteTask(task.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MaintenancePage;
