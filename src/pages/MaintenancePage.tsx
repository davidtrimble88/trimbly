import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, CalendarCheck, Loader2, Home, Check, Clock,
  AlertTriangle, Leaf, Sun, Snowflake, CloudRain, RotateCcw, Trash2, Plus, CalendarPlus, Download, ShoppingCart, ExternalLink, Search, ArrowUpDown
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ProductQuestionnaireDialog } from "@/components/maintenance/ProductQuestionnaireDialog";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useHomeLimit } from "@/hooks/useHomeLimit";
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
  home_id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  due_date: string | null;
  recurrence_months: number;
  season: string;
  completed_at: string | null;
  products_search_term: string | null;
};

const emptyHome: HomeProfile = {
  name: "My Home", home_type: "single_family", year_built: null, square_feet: null,
  city: "", state: "", country: "US", hvac_type: "", roof_type: "",
  has_pool: false, has_septic: false, has_well_water: false, notes: "",
};

const seasonIcons: Record<string, typeof Sun> = { spring: Leaf, summer: Sun, fall: CloudRain, winter: Snowflake, any: Clock };
const priorityColors: Record<string, string> = { high: "destructive", medium: "default", low: "secondary" };

const formatICSDate = (date: string) => {
  const d = new Date(date);
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
};

const generateICSEvent = (task: { id: string; title: string; description: string; category: string; priority: string; due_date: string | null; recurrence_months: number; season: string }) => {
  const dueDate = task.due_date ? new Date(task.due_date) : new Date();
  const nextDay = new Date(dueDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const dtStart = `DTSTART;VALUE=DATE:${dueDate.toISOString().slice(0, 10).replace(/-/g, "")}`;
  const dtEnd = `DTEND;VALUE=DATE:${nextDay.toISOString().slice(0, 10).replace(/-/g, "")}`;

  const rrule = task.recurrence_months > 0
    ? `\nRRULE:FREQ=MONTHLY;INTERVAL=${task.recurrence_months}`
    : "";

  const alarm = `\nBEGIN:VALARM\nTRIGGER:${task.priority === "high" ? "-P1D" : "-P3D"}\nACTION:DISPLAY\nDESCRIPTION:${task.title} - HomeHero Maintenance\nEND:VALARM`;

  return `BEGIN:VEVENT\nUID:${task.id}@homehero\nSUMMARY:🏠 ${task.title}\nDESCRIPTION:${(task.description || "").replace(/\n/g, "\\n")}\\nCategory: ${task.category}\\nPriority: ${task.priority}\\nSeason: ${task.season}\n${dtStart}\n${dtEnd}${rrule}${alarm}\nEND:VEVENT`;
};

const downloadICS = (filename: string, content: string) => {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Wizard steps for quick setup
const baseWizardSteps = [
  { key: "address_lookup", question: "Enter your address to auto-fill home details", type: "address" as const, placeholder: "e.g. 123 Main St, Austin, TX 78701" },
  { key: "home_name", question: "Give this home a name", type: "text" as const, placeholder: "e.g. Lake House, Main Residence" },
  { key: "home_type", question: "What type of home do you have?", type: "select" as const, options: [
    { value: "single_family", label: "🏠 Single Family" },
    { value: "townhouse", label: "🏘️ Townhouse" },
    { value: "condo", label: "🏢 Condo" },
    { value: "duplex", label: "🏗️ Duplex" },
    { value: "mobile", label: "🏕️ Mobile Home" },
  ]},
  { key: "location", question: "Where is your home located?", type: "location" as const },
  { key: "year_built", question: "Approximately when was it built?", type: "select" as const, options: [
    { value: "2020", label: "2020+" },
    { value: "2010", label: "2010–2019" },
    { value: "2000", label: "2000–2009" },
    { value: "1990", label: "1990–1999" },
    { value: "1980", label: "1980–1989" },
    { value: "1960", label: "Before 1980" },
  ]},
  { key: "hvac_type", question: "What heating/cooling system do you have?", type: "select" as const, options: [
    { value: "central", label: "❄️ Central Air" },
    { value: "heat_pump", label: "🔄 Heat Pump" },
    { value: "furnace", label: "🔥 Furnace" },
    { value: "mini_split", label: "💨 Mini Split" },
    { value: "window", label: "🪟 Window Units" },
    { value: "none", label: "❌ None" },
  ]},
  { key: "roof_type", question: "What type of roof do you have?", type: "select" as const, options: [
    { value: "asphalt", label: "🏠 Asphalt Shingle" },
    { value: "metal", label: "🔩 Metal" },
    { value: "tile", label: "🧱 Tile" },
    { value: "slate", label: "🪨 Slate" },
    { value: "flat", label: "📐 Flat / TPO" },
  ]},
  { key: "extras", question: "Does your home have any of these?", type: "toggles" as const, options: [
    { value: "has_pool", label: "🏊 Pool" },
    { value: "has_septic", label: "🚽 Septic System" },
    { value: "has_well_water", label: "💧 Well Water" },
  ]},
];

const MaintenancePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { canAddHome, isPro, homeCount, loading: limitLoading, subscriptionTier } = useHomeLimit();
  const isMultiPro = subscriptionTier === "multi_pro";
  // For multi-home users, include the name step; for single-home, skip it
  const wizardSteps = isMultiPro ? baseWizardSteps : baseWizardSteps.filter(s => s.key !== "home_name");
  const [allHomesView, setAllHomesView] = useState(false);

  const [homes, setHomes] = useState<HomeProfile[]>([]);
  const [home, setHome] = useState<HomeProfile>(emptyHome);
  const [homeLoaded, setHomeLoaded] = useState(false);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loadingHome, setLoadingHome] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [savingHome, setSavingHome] = useState(false);
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed">("all");
  const [wizardStep, setWizardStep] = useState(0);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [productTask, setProductTask] = useState<MaintenanceTask | null>(null);
  const [addressInput, setAddressInput] = useState("");
  const [lookingUpAddress, setLookingUpAddress] = useState(false);
  const [addressLookedUp, setAddressLookedUp] = useState(false);

  const lookupAddress = async () => {
    if (!addressInput.trim()) return;
    setLookingUpAddress(true);
    try {
      const { data, error } = await supabase.functions.invoke("zillow-lookup", {
        body: { address: addressInput.trim() },
      });
      if (error) throw error;
      if (data?.success && data.data) {
        const z = data.data;
        setHome(h => ({
          ...h,
          home_type: z.home_type || h.home_type,
          year_built: z.year_built || h.year_built,
          square_feet: z.square_feet || h.square_feet,
          city: z.city || h.city,
          state: z.state || h.state,
          hvac_type: z.hvac_type || h.hvac_type,
          roof_type: z.roof_type || h.roof_type,
          has_pool: z.has_pool ?? h.has_pool,
        }));
        setAddressLookedUp(true);
        toast({ title: "Home details found!", description: "We've pre-filled your home info from Zillow. You can adjust anything in the following steps." });
      } else {
        toast({ title: "No results found", description: data?.error || "Couldn't find property details for that address. You can fill in details manually.", variant: "destructive" });
      }
    } catch (err) {
      console.error("Address lookup error:", err);
      toast({ title: "Lookup failed", description: "Something went wrong. You can still fill in details manually.", variant: "destructive" });
    } finally {
      setLookingUpAddress(false);
    }
  };

  // Load home profile and tasks
  useEffect(() => {
    if (!user) { setLoadingHome(false); return; }
    loadHomes();
  }, [user]);

  const loadHomes = async () => {
    setLoadingHome(true);
    const { data } = await supabase
      .from("homes")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: true });

    const allHomes = (data || []).map(h => ({ ...h, year_built: h.year_built ?? null, square_feet: h.square_feet ?? null }));
    setHomes(allHomes);

    if (allHomes.length > 0) {
      setHome(allHomes[0]);
      setHomeLoaded(true);
      loadTasks(allHomes[0].id!);
    } else {
      setShowSetup(true);
      setWizardStep(0);
    }
    setLoadingHome(false);
  };

  const selectHome = (h: HomeProfile) => {
    setHome(h);
    setHomeLoaded(true);
    setShowSetup(false);
    loadTasks(h.id!);
  };

  const startAddHome = () => {
    if (!canAddHome) {
      toast({ title: "Upgrade required", description: "Your plan only allows 1 home. Upgrade to Multi-Homeowner Pro to manage up to 10.", variant: "destructive" });
      return;
    }
    setHome(emptyHome);
    setIsAddingNew(true);
    setShowSetup(true);
    setWizardStep(0);
    setTasks([]);
    setHomeLoaded(false);
    setAddressInput("");
    setAddressLookedUp(false);
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

  const loadAllTasks = async () => {
    if (!user) return;
    setLoadingTasks(true);
    setAllHomesView(true);
    const homeIds = homes.map(h => h.id!).filter(Boolean);
    if (homeIds.length > 0) {
      const { data } = await supabase
        .from("maintenance_tasks")
        .select("*")
        .in("home_id", homeIds)
        .order("due_date", { ascending: true });
      setTasks((data as MaintenanceTask[]) || []);
    } else {
      setTasks([]);
    }
    setLoadingTasks(false);
  };

  const selectHomeAndLoad = (h: HomeProfile) => {
    setAllHomesView(false);
    selectHome(h);
  };

  const saveHome = async () => {
    if (!user) return;
    setSavingHome(true);
    try {
      if (home.id) {
        await supabase.from("homes").update({ ...home, updated_at: new Date().toISOString() }).eq("id", home.id);
      } else {
        const { data } = await supabase.from("homes").insert({ ...home, user_id: user.id }).select().single();
        if (data) {
          setHome({ ...home, id: data.id });
          setHomes(prev => [...prev, { ...home, id: data.id }]);
        }
      }
      setHomeLoaded(true);
      setShowSetup(false);
      setIsAddingNew(false);
      toast({ title: "Home saved", description: "Your home profile has been saved." });
    } catch {
      toast({ title: "Error", description: "Failed to save home profile.", variant: "destructive" });
    }
    setSavingHome(false);
  };

  const finishWizard = async () => {
    await saveHome();
    setTimeout(() => {
      generateSchedule();
    }, 500);
  };

  const handleWizardSelect = (key: string, value: string) => {
    if (key === "home_type") setHome(h => ({ ...h, home_type: value }));
    else if (key === "year_built") setHome(h => ({ ...h, year_built: Number(value) }));
    else if (key === "hvac_type") setHome(h => ({ ...h, hvac_type: value }));
    else if (key === "roof_type") setHome(h => ({ ...h, roof_type: value }));
    // Auto-advance after selection (except toggles & location)
    setTimeout(() => setWizardStep(s => Math.min(s + 1, wizardSteps.length - 1)), 200);
  };

  const handleToggle = (field: string) => {
    setHome(h => ({ ...h, [field]: !(h as any)[field] }));
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

      // Filter out duplicates: tasks with same title that already exist as upcoming
      const existingTitles = new Set(
        tasks.filter(t => t.status !== "completed").map(t => t.title.toLowerCase().trim())
      );

      const uniqueTasks = aiTasks.filter((t: any) => !existingTitles.has((t.title || "").toLowerCase().trim()));

      if (uniqueTasks.length === 0) {
        toast({ title: "No new tasks", description: "All generated tasks already exist in your schedule." });
        setGenerating(false);
        return;
      }

      // Insert tasks into DB
      const rows = uniqueTasks.map((t: any) => ({
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
        products_search_term: t.products_search_term || null,
      }));

      const { error: insertErr } = await supabase.from("maintenance_tasks").insert(rows);
      if (insertErr) throw insertErr;

      const skipped = aiTasks.length - uniqueTasks.length;

      await loadTasks(home.id!);
      toast({ title: "Schedule generated!", description: `${uniqueTasks.length} new tasks added.${skipped > 0 ? ` ${skipped} duplicates skipped.` : ""}` });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to generate schedule.", variant: "destructive" });
    }
    setGenerating(false);
  };

  const toggleTask = async (task: MaintenanceTask) => {
    const newStatus = task.status === "completed" ? "upcoming" : "completed";
    const completedAt = newStatus === "completed" ? new Date().toISOString() : null;

    // If undoing a completed recurring task, remove the next-cycle duplicate first
    if (newStatus === "upcoming" && task.recurrence_months > 0) {
      const nextCycleDup = tasks.find(t =>
        t.id !== task.id &&
        t.status !== "completed" &&
        t.title.toLowerCase().trim() === task.title.toLowerCase().trim()
      );
      if (nextCycleDup) {
        await supabase.from("maintenance_tasks").delete().eq("id", nextCycleDup.id);
        setTasks(prev => prev.filter(t => t.id !== nextCycleDup.id));
      }
    }

    await supabase.from("maintenance_tasks").update({ status: newStatus, completed_at: completedAt }).eq("id", task.id);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus, completed_at: completedAt } : t));

    // If marking complete and task is recurring, create next cycle task (no duplicates)
    if (newStatus === "completed" && task.recurrence_months > 0 && task.due_date && home.id && user) {
      const nextDue = new Date(task.due_date);
      nextDue.setMonth(nextDue.getMonth() + task.recurrence_months);
      const nextDueStr = nextDue.toISOString().slice(0, 10);

      // Check if an upcoming task with same title already exists
      const duplicate = tasks.find(t =>
        t.id !== task.id &&
        t.status !== "completed" &&
        t.title.toLowerCase().trim() === task.title.toLowerCase().trim()
      );

      if (duplicate) {
        toast({ title: "Task already scheduled", description: `"${task.title}" is already scheduled for ${nextDue.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.` });
        if (newStatus === "completed") setFilter("completed");
        return;
      }

      const newTask = {
        home_id: home.id,
        user_id: user.id,
        title: task.title,
        description: task.description,
        category: task.category,
        priority: task.priority,
        status: "upcoming",
        due_date: nextDueStr,
        recurrence_months: task.recurrence_months,
        season: task.season,
        products_search_term: task.products_search_term || null,
      };

      const { data: inserted } = await supabase.from("maintenance_tasks").insert(newTask).select().single();
      if (inserted) {
        setTasks(prev => [...prev, inserted as MaintenanceTask]);
        toast({ title: "Next cycle scheduled", description: `"${task.title}" rescheduled for ${nextDue.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.` });
      }
    }

    // Auto-switch to completed filter when marking complete
    if (newStatus === "completed") {
      setFilter("completed");
    }
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

  const addTaskToCalendar = (task: MaintenanceTask) => {
    if (!task.due_date) {
      toast({ title: "No due date", description: "This task has no due date to add to your calendar.", variant: "destructive" });
      return;
    }
    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//HomeHero//Maintenance//EN\nCALSCALE:GREGORIAN\n${generateICSEvent(task)}\nEND:VCALENDAR`;
    downloadICS(`${task.title.replace(/\s+/g, "-").toLowerCase()}.ics`, ics);
    toast({ title: "Calendar event downloaded", description: "Open the file to add it to your calendar app." });
  };

  const exportAllToCalendar = () => {
    const upcomingTasks = tasks.filter(t => t.status !== "completed" && t.due_date);
    if (upcomingTasks.length === 0) {
      toast({ title: "No tasks to export", description: "There are no upcoming tasks with due dates.", variant: "destructive" });
      return;
    }
    const events = upcomingTasks.map(t => generateICSEvent(t)).join("\n");
    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//HomeHero//Maintenance//EN\nCALSCALE:GREGORIAN\n${events}\nEND:VCALENDAR`;
    downloadICS("homehero-maintenance.ics", ics);
    toast({ title: "Calendar exported!", description: `${upcomingTasks.length} tasks exported. Open the file to add them to your calendar.` });
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
              <div className="flex items-center gap-2">
                {homeLoaded && (
                  <Button variant="outline" size="sm" onClick={() => { setShowSetup(!showSetup); setIsAddingNew(false); setWizardStep(0); }}>
                    <Home size={14} className="mr-1" /> Edit Home
                  </Button>
                )}
                {(isPro || homes.length === 0) && homes.length > 0 && (
                  <Button variant="outline" size="sm" onClick={startAddHome}>
                    <Plus size={14} className="mr-1" /> Add Home
                  </Button>
                )}
              </div>
            </div>

            {/* Home selector tabs */}
            {homes.length > 1 && (
              <div className="flex gap-2 mt-4 overflow-x-auto">
                {isMultiPro && (
                  <button
                    onClick={() => loadAllTasks()}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border whitespace-nowrap transition-all ${
                      allHomesView ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border hover:border-primary/30"
                    }`}
                  >
                    All Homes
                  </button>
                )}
                {homes.map(h => (
                  <button
                    key={h.id}
                    onClick={() => selectHomeAndLoad(h)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border whitespace-nowrap transition-all ${
                      !allHomesView && home.id === h.id ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border hover:border-primary/30"
                    }`}
                  >
                    <Home size={12} className="inline mr-1" /> {h.name}
                  </button>
                ))}
                {canAddHome && (
                  <button
                    onClick={startAddHome}
                    className="px-3 py-2 rounded-lg text-sm font-medium border border-dashed border-border text-muted-foreground hover:border-primary/30 whitespace-nowrap transition-all"
                  >
                    <Plus size={12} className="inline mr-1" /> Add Home
                  </button>
                )}
              </div>
            )}
          </div>

          {loadingHome ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Home Setup Wizard */}
              {(showSetup || !homeLoaded) && (
                <div className="rounded-xl border border-border bg-card p-6 mb-8 max-w-xl mx-auto">
                  {/* Progress bar */}
                  <div className="flex gap-1.5 mb-6">
                    {wizardSteps.map((_, i) => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= wizardStep ? "bg-primary" : "bg-border"}`} />
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground mb-1">Question {wizardStep + 1} of {wizardSteps.length}</p>
                  <h2 className="font-bold text-xl text-foreground mb-6">{wizardSteps[wizardStep].question}</h2>

                  {/* Select type: card-style options */}
                  {wizardSteps[wizardStep].type === "select" && (
                    <div className="grid grid-cols-2 gap-3">
                      {wizardSteps[wizardStep].options!.map(opt => {
                        const currentVal = wizardSteps[wizardStep].key === "home_type" ? home.home_type
                          : wizardSteps[wizardStep].key === "year_built" ? String(home.year_built || "")
                          : wizardSteps[wizardStep].key === "hvac_type" ? home.hvac_type
                          : home.roof_type;
                        const isSelected = currentVal === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => handleWizardSelect(wizardSteps[wizardStep].key, opt.value)}
                            className={`p-4 rounded-xl border text-left text-sm font-medium transition-all ${
                              isSelected
                                ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/20"
                                : "border-border bg-card text-muted-foreground hover:border-primary/30"
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Address lookup type */}
                  {wizardSteps[wizardStep].type === "address" && (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Input
                          value={addressInput}
                          onChange={e => setAddressInput(e.target.value)}
                          placeholder={(wizardSteps[wizardStep] as any).placeholder || "Enter your address"}
                          className="flex-1"
                          autoFocus
                          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); lookupAddress(); } }}
                          disabled={lookingUpAddress}
                        />
                        <Button onClick={lookupAddress} disabled={lookingUpAddress || !addressInput.trim()} size="sm" className="shrink-0">
                          {lookingUpAddress ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Search size={14} className="mr-1.5" />}
                          {lookingUpAddress ? "Looking up…" : "Look Up"}
                        </Button>
                      </div>
                      {addressLookedUp && (
                        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                          <Check size={16} />
                          Home details pre-filled from Zillow! Review and adjust in the next steps.
                        </div>
                      )}
                      {!addressLookedUp && (
                        <p className="text-xs text-muted-foreground">
                          We'll search Zillow to auto-fill your home details. You can skip this and enter everything manually.
                        </p>
                      )}
                    </div>
                  )}

                  {wizardSteps[wizardStep].type === "text" && (
                    <div className="space-y-3">
                      <Input
                        value={home.name}
                        onChange={e => setHome({ ...home, name: e.target.value })}
                        placeholder={(wizardSteps[wizardStep] as any).placeholder || "Enter a name"}
                        className="text-lg"
                        autoFocus
                      />
                    </div>
                  )}

                  {wizardSteps[wizardStep].type === "location" && (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm">City</Label>
                        <Input value={home.city} onChange={e => setHome({ ...home, city: e.target.value })} placeholder="e.g. Austin" className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-sm">State / Province</Label>
                        <Input value={home.state} onChange={e => setHome({ ...home, state: e.target.value })} placeholder="e.g. TX" maxLength={2} className="mt-1" />
                      </div>
                    </div>
                  )}

                  {/* Toggles type: multi-select toggles */}
                  {wizardSteps[wizardStep].type === "toggles" && (
                    <div className="space-y-3">
                      {wizardSteps[wizardStep].options!.map(opt => {
                        const isOn = !!(home as any)[opt.value];
                        return (
                          <button
                            key={opt.value}
                            onClick={() => handleToggle(opt.value)}
                            className={`w-full p-4 rounded-xl border text-left text-sm font-medium transition-all flex items-center justify-between ${
                              isOn
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-border bg-card text-muted-foreground hover:border-primary/30"
                            }`}
                          >
                            {opt.label}
                            {isOn && <Check size={16} className="text-primary" />}
                          </button>
                        );
                      })}
                      <p className="text-xs text-muted-foreground">Select all that apply, or skip to continue.</p>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex justify-between mt-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setWizardStep(s => Math.max(0, s - 1))}
                      disabled={wizardStep === 0}
                    >
                      Back
                    </Button>
                    {wizardStep < wizardSteps.length - 1 ? (
                      <Button size="sm" onClick={() => setWizardStep(s => s + 1)}>
                        {wizardSteps[wizardStep].type === "address" && !addressLookedUp ? "Skip" :
                         wizardSteps[wizardStep].type === "location" && !home.city ? "Skip" : "Next"}
                      </Button>
                    ) : (
                      <Button size="sm" onClick={finishWizard} disabled={savingHome || generating} className="gap-1">
                        {(savingHome || generating) ? <Loader2 size={14} className="animate-spin" /> : <CalendarCheck size={14} />}
                        Generate My Schedule
                      </Button>
                    )}
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
                        <>
                          <Button variant="outline" size="sm" onClick={exportAllToCalendar} className="gap-1">
                            <CalendarPlus size={14} /> Add to Calendar
                          </Button>
                          <Button variant="outline" size="sm" onClick={clearAllTasks}>
                            <Trash2 size={14} className="mr-1" /> Clear All
                          </Button>
                        </>
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
                                    {isOverdue && (
                                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-1 animate-pulse">
                                        <AlertTriangle size={10} /> OVERDUE
                                      </Badge>
                                    )}
                                    <Badge variant={priorityColors[task.priority] as any} className="text-[10px] px-1.5 py-0">
                                      {task.priority}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                                      <SeasonIcon size={10} /> {task.season}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{task.category}</span>
                                    {allHomesView && (
                                      <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                                        <Home size={10} /> {homes.find(h => h.id === (task as any).home_id)?.name || "Unknown"}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                                  {task.products_search_term && (
                                    <button
                                      onClick={() => setProductTask(task)}
                                      className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-primary hover:underline"
                                    >
                                      <ShoppingCart size={12} /> Shop on Amazon <ExternalLink size={10} />
                                    </button>
                                  )}
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
                                  {/* Mark Complete / Undo button */}
                                  {task.status !== "completed" ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="mt-3 gap-1 text-xs h-7"
                                      onClick={() => toggleTask(task)}
                                    >
                                      <Check size={12} /> Mark Complete
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="mt-3 gap-1 text-xs h-7 text-muted-foreground"
                                      onClick={() => toggleTask(task)}
                                    >
                                      <RotateCcw size={12} /> Undo
                                    </Button>
                                  )}
                                </div>
                                <div className="flex flex-col gap-1 shrink-0">
                                  {task.due_date && task.status !== "completed" && (
                                    <button onClick={() => addTaskToCalendar(task)} className="text-muted-foreground hover:text-primary transition-colors" title="Add to calendar">
                                      <CalendarPlus size={14} />
                                    </button>
                                  )}
                                  <button onClick={() => deleteTask(task.id)} className="text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
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

      {productTask && productTask.products_search_term && (
        <ProductQuestionnaireDialog
          open={!!productTask}
          onOpenChange={(open) => { if (!open) setProductTask(null); }}
          task={{
            id: productTask.id,
            title: productTask.title,
            category: productTask.category,
            products_search_term: productTask.products_search_term,
          }}
        />
      )}
    </div>
  );
};

export default MaintenancePage;
