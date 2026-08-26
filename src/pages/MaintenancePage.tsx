import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  CalendarCheck, Loader2, Home, Check, Clock,
  AlertTriangle, Leaf, Sun, Snowflake, CloudRain, RotateCcw, Trash2, Plus, CalendarPlus, Download, ShoppingCart, ExternalLink, Search, Filter, Crown, Pencil, Lock
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ProductQuestionnaireDialog } from "@/components/maintenance/ProductQuestionnaireDialog";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { buildHomeownerSatelliteNavItems, homeownerNavGroups } from "@/components/dashboard/homeowner/navItems";
import { tierLabels } from "@/components/dashboard/homeowner/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useHomeLimit } from "@/hooks/useHomeLimit";
import { useGarageSubscription } from "@/hooks/useGarageSubscription";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/EmptyState";
import HomePhotoChoice, { type HomePhotoChoiceValue } from "@/components/maintenance/HomePhotoChoice";
import { parseDateOnly, formatYYYYMMDD, formatDateOnly, seasonForDate } from "@/lib/maintenanceDates";

type HomeProfile = {
  id?: string;
  user_id?: string;
  name: string;
  home_type: string;
  year_built: number | null;
  square_feet: number | null;
  street_address: string;
  city: string;
  state: string;
  country: string;
  hvac_type: string;
  roof_type: string;
  has_pool: boolean;
  has_septic: boolean;
  has_well_water: boolean;
  notes: string;
  photo_url?: string | null;
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
  binder_item_id: string | null;
};

const emptyHome: HomeProfile = {
  name: "My Home", home_type: "single_family", year_built: null, square_feet: null,
  street_address: "", city: "", state: "", country: "US", hvac_type: "", roof_type: "",
  has_pool: false, has_septic: false, has_well_water: false, notes: "",
};

const seasonIcons: Record<string, typeof Sun> = { spring: Leaf, summer: Sun, fall: CloudRain, winter: Snowflake, any: Clock };
const priorityColors: Record<string, string> = { high: "destructive", medium: "default", low: "secondary" };

// Rough elapsed-time checkpoints (seconds) for the address-lookup progress
// messages below — real stages of a Zillow scrape, timed to roughly match
// how long each part actually tends to take, not literal progress events.
const LOOKUP_STATUS_TIMINGS = [0, 3, 8, 15, 22];
const LOOKUP_STATUS_MESSAGES = [
  "Searching Zillow for your address…",
  "Found a listing — reading the details…",
  "Pulling year built, square footage, and home systems…",
  "Grabbing a photo of your home…",
  "Almost there — finishing up…",
];

const recurrenceOptions = [
  { value: "0", label: "One-time (no repeat)" },
  { value: "1", label: "Every month" },
  { value: "3", label: "Every 3 months" },
  { value: "6", label: "Every 6 months" },
  { value: "12", label: "Every year" },
];

// See src/lib/maintenanceDates.ts for the timezone-safety rationale
// (also unit-tested there) — kept as a single source of truth so page code
// and tests can't drift apart.

const generateICSEvent = (task: { id: string; title: string; description: string; category: string; priority: string; due_date: string | null; recurrence_months: number; season: string }) => {
  const dueDate = task.due_date ? parseDateOnly(task.due_date) : new Date();
  const nextDay = new Date(dueDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const dtStart = `DTSTART;VALUE=DATE:${formatYYYYMMDD(dueDate)}`;
  const dtEnd = `DTEND;VALUE=DATE:${formatYYYYMMDD(nextDay)}`;

  const rrule = task.recurrence_months > 0
    ? `\nRRULE:FREQ=MONTHLY;INTERVAL=${task.recurrence_months}`
    : "";

  const alarm = `\nBEGIN:VALARM\nTRIGGER:${task.priority === "high" ? "-P1D" : "-P3D"}\nACTION:DISPLAY\nDESCRIPTION:${task.title} - Trimbly Maintenance\nEND:VALARM`;

  return `BEGIN:VEVENT\nUID:${task.id}@trimbly\nSUMMARY:🏠 ${task.title}\nDESCRIPTION:${(task.description || "").replace(/\n/g, "\\n")}\\nCategory: ${task.category}\\nPriority: ${task.priority}\\nSeason: ${seasonForDate(task.due_date)}\n${dtStart}\n${dtEnd}${rrule}${alarm}\nEND:VEVENT`;
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
  const { user, profileName } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canAddHome, isPro, homeCount, loading: limitLoading, subscriptionTier } = useHomeLimit();
  const { active: hasGarage } = useGarageSubscription();
  const isMultiPro = subscriptionTier === "multi_pro";
  // For multi-home users, include the name step; for single-home, skip it
  const wizardSteps = isMultiPro ? baseWizardSteps : baseWizardSteps.filter(s => s.key !== "home_name");
  const [searchParams] = useSearchParams();
  const onboarding = searchParams.get("onboarding") === "1";
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
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed">("upcoming");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [seasonFilter, setSeasonFilter] = useState<string>("all");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [productTask, setProductTask] = useState<MaintenanceTask | null>(null);
  const [editingTask, setEditingTask] = useState<MaintenanceTask | null>(null);
  const [editDueDate, setEditDueDate] = useState("");
  const [editRecurrence, setEditRecurrence] = useState("0");
  const [savingEdit, setSavingEdit] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskRecurrence, setNewTaskRecurrence] = useState("0");
  const [savingNewTask, setSavingNewTask] = useState(false);
  const [addressInput, setAddressInput] = useState("");
  const [lookingUpAddress, setLookingUpAddress] = useState(false);
  const [addressLookedUp, setAddressLookedUp] = useState(false);
  const [zillowPhotoUrl, setZillowPhotoUrl] = useState<string | null>(null);
  const [photoChoice, setPhotoChoice] = useState<HomePhotoChoiceValue | null>(null);
  const [lookupProgress, setLookupProgress] = useState(0);
  const [lookupStatus, setLookupStatus] = useState(LOOKUP_STATUS_MESSAGES[0]);

  const lookupAddress = async () => {
    if (!addressInput.trim()) return;
    setLookingUpAddress(true);
    setLookupProgress(0);
    setLookupStatus(LOOKUP_STATUS_MESSAGES[0]);
    const startedAt = Date.now();
    // The lookup is one opaque ~15-30s network call with no real progress
    // events to report — this simulates steady, ever-slowing progress (an
    // asymptotic curve that approaches but never quite reaches 100% on its
    // own) purely so the wait *feels* alive instead of a frozen spinner.
    // Actual completion below always snaps it to 100 for real.
    const progressTimer = window.setInterval(() => {
      const elapsedSeconds = (Date.now() - startedAt) / 1000;
      setLookupProgress(92 * (1 - Math.exp(-elapsedSeconds / 11)));
      for (let i = LOOKUP_STATUS_TIMINGS.length - 1; i >= 0; i--) {
        if (elapsedSeconds >= LOOKUP_STATUS_TIMINGS[i]) {
          setLookupStatus(LOOKUP_STATUS_MESSAGES[i]);
          break;
        }
      }
    }, 300);
    try {
      const { data, error } = await supabase.functions.invoke("zillow-lookup", {
        body: { address: addressInput.trim() },
      });
      if (error) throw error;
      if (data?.success && data.data) {
        const z = data.data;
        // Zillow's scrape doesn't always come back with city/state (e.g. for
        // less-common addresses) — fall back to parsing them straight out of
        // what the user typed rather than leaving fields blank they already answered.
        const addrMatch = addressInput.match(/,\s*([^,]+?),\s*([A-Za-z]{2})\s*\d{0,5}\s*$/);
        const streetMatch = addressInput.match(/^([^,]+)/);
        setHome(h => ({
          ...h,
          home_type: z.home_type || h.home_type,
          year_built: z.year_built || h.year_built,
          square_feet: z.square_feet || h.square_feet,
          street_address: z.address || streetMatch?.[1]?.trim() || h.street_address,
          city: z.city || addrMatch?.[1]?.trim() || h.city,
          state: z.state || addrMatch?.[2]?.toUpperCase() || h.state,
          hvac_type: z.hvac_type || h.hvac_type,
          roof_type: z.roof_type || h.roof_type,
          has_pool: z.has_pool ?? h.has_pool,
          photo_url: z.photo_url || h.photo_url,
        }));
        // Zillow's photo is only a starting suggestion — default to it but let
        // the review screen offer uploading their own or a generic icon instead.
        if (z.photo_url) {
          setZillowPhotoUrl(z.photo_url);
          setPhotoChoice("found");
        }
        setAddressLookedUp(true);
        toast({ title: "Home details found!", description: "We've pre-filled your home info from Zillow. You can review and adjust it on the next screen." });
      } else {
        toast({ title: "No results found", description: data?.error || "Couldn't find property details for that address. You can fill in details manually.", variant: "destructive" });
      }
    } catch (err) {
      console.error("Address lookup error:", err);
      toast({ title: "Lookup failed", description: "Something went wrong. You can still fill in details manually.", variant: "destructive" });
    } finally {
      window.clearInterval(progressTimer);
      // Snap to 100 and hold for a beat so the bar visibly finishes instead
      // of jumping straight from ~80% to gone — a small thing, but a bar
      // that never completes reads as broken, not as "still working."
      setLookupProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 250));
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
    // No .eq("user_id", ...) filter — RLS returns owned homes plus any
    // shared with this user, so shared properties just show up in the picker.
    const { data } = await supabase
      .from("homes")
      .select("*")
      .order("created_at", { ascending: true });

    const allHomes = (data || []).map(h => ({ ...h, year_built: h.year_built ?? null, square_feet: h.square_feet ?? null })) as unknown as HomeProfile[];
    setHomes(allHomes);

    if (onboarding) {
      // Force setup wizard for onboarding flow
      setShowSetup(true);
      setWizardStep(0);
      setHome(emptyHome);
      setHomeLoaded(false);
      setIsAddingNew(true);
      setLoadingHome(false);
      return;
    }

    // Prefer the user's own home as the default selection over a shared one.
    const defaultHome = allHomes.find(h => h.user_id === user!.id) || allHomes[0];
    if (defaultHome) {
      setHome(defaultHome);
      setHomeLoaded(true);
      loadTasks(defaultHome.id!);
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
      toast({ title: "Upgrade required", description: "Your plan only allows 1 home. Upgrade to Home Super Hero to manage up to 10.", variant: "destructive" });
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
      let error;
      if (home.id) {
        ({ error } = await supabase.from("homes").update({ ...home, updated_at: new Date().toISOString() }).eq("id", home.id));
      } else {
        const { data, error: insertErr } = await supabase.from("homes").insert({ ...home, user_id: user.id }).select().single();
        error = insertErr;
        if (data) {
          setHome({ ...home, id: data.id });
          setHomes(prev => [...prev, { ...home, id: data.id }]);
        }
      }
      if (error) {
        if ((error as any).code === "23505") {
          toast({
            title: "Address already claimed",
            description: "This address is already registered on Trimbly. If you believe this is an error, contact Support.",
            variant: "destructive",
          });
        } else {
          toast({ title: "Error", description: "Failed to save home profile.", variant: "destructive" });
        }
        setSavingHome(false);
        return;
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
    setTimeout(async () => {
      await generateSchedule();
      // First-time setup (arrived here via signup's onboarding=1 redirect)
      // used to leave the user sitting on the bare task list with no nav
      // context — they'd never actually visit /dashboard, which also meant
      // OnboardingTour (only rendered on Dashboard.tsx) never got a chance
      // to run. Send them there now that their home and schedule exist.
      if (onboarding) navigate("/dashboard");
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

      // Filter out duplicates: tasks with the same title AND a due date close to an
      // existing upcoming task's. Matching on title alone meant that once a task's
      // due date drifted years out (e.g. from a bad AI-generated date or repeated
      // completions), Regenerate could never insert the correct near-term occurrence
      // for that title again — it always looked like a "duplicate" of the stray one.
      const existingByTitle = new Map<string, MaintenanceTask[]>();
      tasks.filter(t => t.status !== "completed").forEach(t => {
        const key = t.title.toLowerCase().trim();
        const group = existingByTitle.get(key);
        if (group) group.push(t); else existingByTitle.set(key, [t]);
      });

      const isDuplicate = (t: any) => {
        const matches = existingByTitle.get((t.title || "").toLowerCase().trim());
        if (!matches) return false;
        if (!t.due_date) return true;
        const newDue = parseDateOnly(t.due_date).getTime();
        return matches.some(m => {
          if (!m.due_date) return true;
          const daysApart = Math.abs(parseDateOnly(m.due_date).getTime() - newDue) / 86_400_000;
          return daysApart <= 60;
        });
      };

      const uniqueTasks = aiTasks.filter((t: any) => !isDuplicate(t));
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

    // .select() so a write blocked by RLS (a shared, non-owner viewer —
    // maintenance_tasks is owner-only for writes) comes back as an empty
    // array instead of silently "succeeding" with 0 rows affected, which
    // was letting the UI show the task as toggled until the next reload.
    const { data: updated, error: updateErr } = await supabase
      .from("maintenance_tasks")
      .update({ status: newStatus, completed_at: completedAt })
      .eq("id", task.id)
      .select("id");
    if (updateErr || !updated || updated.length === 0) {
      toast({ title: "Couldn't update task", description: "Only the home's owner can change tasks on a shared home.", variant: "destructive" });
      return;
    }
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus, completed_at: completedAt } : t));

    // If marking complete and task is recurring, create next cycle task (no duplicates)
    if (newStatus === "completed" && task.recurrence_months > 0 && task.due_date && home.id && user) {
      const nextDue = parseDateOnly(task.due_date);
      nextDue.setMonth(nextDue.getMonth() + task.recurrence_months);
      const nextDueStr = formatDateOnly(nextDue);

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
        season: seasonForDate(nextDueStr),
        products_search_term: task.products_search_term || null,
        binder_item_id: task.binder_item_id || null,
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
    const { data: deleted, error } = await supabase.from("maintenance_tasks").delete().eq("id", taskId).select("id");
    if (error || !deleted || deleted.length === 0) {
      toast({ title: "Couldn't delete task", description: "Only the home's owner can delete tasks on a shared home.", variant: "destructive" });
      return;
    }
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const toggleTaskSelected = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedTaskIds(new Set());
  };

  const bulkDelete = async () => {
    if (selectedTaskIds.size === 0) return;
    const ids = Array.from(selectedTaskIds);
    setBulkWorking(true);
    const { error } = await supabase.from("maintenance_tasks").delete().in("id", ids);
    setBulkWorking(false);
    if (error) {
      toast({ title: "Couldn't delete tasks", description: error.message, variant: "destructive" });
      return;
    }
    setTasks(prev => prev.filter(t => !selectedTaskIds.has(t.id)));
    toast({ title: `${ids.length} task${ids.length > 1 ? "s" : ""} deleted` });
    exitSelectMode();
  };

  const bulkComplete = async () => {
    if (selectedTaskIds.size === 0) return;
    setBulkWorking(true);
    const targets = tasks.filter(t => selectedTaskIds.has(t.id) && t.status !== "completed");
    for (const task of targets) {
      await toggleTask(task);
    }
    setBulkWorking(false);
    toast({ title: `${targets.length} task${targets.length > 1 ? "s" : ""} marked complete` });
    exitSelectMode();
  };

  const openEditTask = (task: MaintenanceTask) => {
    setEditingTask(task);
    setEditDueDate(task.due_date || "");
    setEditRecurrence(String(task.recurrence_months || 0));
  };

  const saveTaskEdit = async () => {
    if (!editingTask || !editDueDate) return;
    setSavingEdit(true);
    const recurrenceMonths = parseInt(editRecurrence, 10) || 0;
    const season = seasonForDate(editDueDate);
    const { error } = await supabase
      .from("maintenance_tasks")
      .update({ due_date: editDueDate, recurrence_months: recurrenceMonths, season })
      .eq("id", editingTask.id);
    setSavingEdit(false);
    if (error) {
      toast({ title: "Couldn't update task", description: error.message, variant: "destructive" });
      return;
    }
    setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, due_date: editDueDate, recurrence_months: recurrenceMonths, season } : t));
    toast({ title: "Task updated" });
    setEditingTask(null);
  };

  const addCustomTask = async () => {
    if (!newTaskTitle.trim() || !newTaskDueDate || !home.id || !user) return;
    setSavingNewTask(true);
    const recurrenceMonths = parseInt(newTaskRecurrence, 10) || 0;
    const { data, error } = await supabase
      .from("maintenance_tasks")
      .insert({
        home_id: home.id,
        user_id: user.id,
        title: newTaskTitle.trim(),
        description: "",
        category: "Custom",
        priority: "medium",
        status: "upcoming",
        due_date: newTaskDueDate,
        recurrence_months: recurrenceMonths,
        season: seasonForDate(newTaskDueDate),
      } as any)
      .select()
      .single();
    setSavingNewTask(false);
    if (error) {
      toast({ title: "Couldn't add task", description: error.message, variant: "destructive" });
      return;
    }
    setTasks(prev => [...prev, data as MaintenanceTask]);
    toast({ title: "Task added" });
    setShowAddTask(false);
    setNewTaskTitle("");
    setNewTaskDueDate("");
    setNewTaskRecurrence("0");
  };

  const clearAllTasks = async () => {
    if (!home.id) return;
    const { data: deleted, error } = await supabase.from("maintenance_tasks").delete().eq("home_id", home.id).select("id");
    if (error) {
      toast({ title: "Couldn't clear tasks", description: error.message, variant: "destructive" });
      return;
    }
    if (!deleted || deleted.length === 0) {
      toast({ title: "Couldn't clear tasks", description: "Only the home's owner can clear tasks on a shared home.", variant: "destructive" });
      return;
    }
    setTasks([]);
    toast({ title: "Tasks cleared", description: "All maintenance tasks have been removed." });
  };

  const shopForTask = (task: MaintenanceTask) => {
    if (!task.products_search_term) return;
    // Tasks linked to a specific binder appliance already have brand/model
    // baked into the search term by the AI that generated them — skip the
    // clarifying-questions dialog and go straight to a targeted search
    // instead of re-asking for info the app already has.
    if (task.binder_item_id) {
      window.open(`https://www.amazon.com/s?k=${encodeURIComponent(task.products_search_term)}`, "_blank");
      return;
    }
    setProductTask(task);
  };

  const addTaskToCalendar = (task: MaintenanceTask) => {
    if (!task.due_date) {
      toast({ title: "No due date", description: "This task has no due date to add to your calendar.", variant: "destructive" });
      return;
    }
    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Trimbly//Maintenance//EN\nCALSCALE:GREGORIAN\n${generateICSEvent(task)}\nEND:VCALENDAR`;
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
    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Trimbly//Maintenance//EN\nCALSCALE:GREGORIAN\n${events}\nEND:VCALENDAR`;
    downloadICS("trimbly-maintenance.ics", ics);
    toast({ title: "Calendar exported!", description: `${upcomingTasks.length} tasks exported. Open the file to add them to your calendar.` });
  };

  const taskCategories = Array.from(new Set(tasks.map(t => t.category))).sort();

  const filteredTasks = tasks
    .filter(t => {
      if (filter === "upcoming" && t.status === "completed") return false;
      if (filter === "completed" && t.status !== "completed") return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (seasonFilter !== "all" && seasonForDate(t.due_date) !== seasonFilter) return false;
      return true;
    })
    .sort((a, b) => {
      // Completed tasks always sink to the bottom in the "all" view; within
      // each group, always soonest due date first.
      const aDone = a.status === "completed" ? 1 : 0;
      const bDone = b.status === "completed" ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return parseDateOnly(a.due_date).getTime() - parseDateOnly(b.due_date).getTime();
    });

  const upcomingCount = tasks.filter(t => t.status !== "completed").length;
  const overdueCount = tasks.filter(t => t.status !== "completed" && t.due_date && parseDateOnly(t.due_date) < new Date()).length;

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

  const displayName = profileName || user.user_metadata?.full_name || user.email;
  const navItems = buildHomeownerSatelliteNavItems(hasGarage);

  return (
    <DashboardShell
      brandLabel="My Home"
      navItems={navItems}
      groups={homeownerNavGroups}
      activeItemId="maintenance"
      onNavigate={() => {}}
      header={{
        avatarIcon: Home,
        displayName,
        subtitle: (
          <Badge variant="secondary" className="text-xs gap-1">
            <Crown size={12} className="text-primary" /> {tierLabels[subscriptionTier] ?? "Free"}
          </Badge>
        ),
        onEditProfile: () => navigate("/dashboard?tab=profile"),
      }}
    >
        <div className="max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
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
                {addressLookedUp && wizardStep >= 1 ? (
                  <>
                    {/* Everything Zillow found, on one screen, all editable — instead of
                        re-asking each field as its own blank-looking question. */}
                    <p className="text-xs text-muted-foreground mb-1">Review your home details</p>
                    <h2 className="font-bold text-xl text-foreground mb-1">We found your home on Zillow</h2>
                    <p className="text-sm text-muted-foreground mb-6">Double-check everything below and fix anything that's off.</p>

                    <div className="space-y-4">
                      {user && (
                        <HomePhotoChoice
                          userId={user.id}
                          foundPhotoUrl={zillowPhotoUrl}
                          photoUrl={home.photo_url ?? null}
                          choice={photoChoice}
                          onChange={(photoUrl, choiceValue) => {
                            setHome(h => ({ ...h, photo_url: photoUrl }));
                            setPhotoChoice(choiceValue);
                          }}
                        />
                      )}

                      {isMultiPro && (
                        <div>
                          <Label className="text-sm">Home name</Label>
                          <Input value={home.name} onChange={e => setHome({ ...home, name: e.target.value })} placeholder="e.g. Lake House" className="mt-1" />
                        </div>
                      )}

                      <div>
                        <Label className="text-sm">Home type</Label>
                        <Select value={home.home_type} onValueChange={v => setHome(h => ({ ...h, home_type: v }))}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single_family">🏠 Single Family</SelectItem>
                            <SelectItem value="townhouse">🏘️ Townhouse</SelectItem>
                            <SelectItem value="condo">🏢 Condo</SelectItem>
                            <SelectItem value="duplex">🏗️ Duplex</SelectItem>
                            <SelectItem value="mobile">🏕️ Mobile Home</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm">Street address</Label>
                        <Input value={home.street_address} onChange={e => setHome({ ...home, street_address: e.target.value })} placeholder="e.g. 123 Main St" className="mt-1" />
                        <p className="text-xs text-muted-foreground mt-1">Only one Trimbly account can claim a given address.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm">City</Label>
                          <Input value={home.city} onChange={e => setHome({ ...home, city: e.target.value })} placeholder="e.g. Austin" className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-sm">State</Label>
                          <Input value={home.state} onChange={e => setHome({ ...home, state: e.target.value })} placeholder="e.g. TX" maxLength={2} className="mt-1" />
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm">Year built</Label>
                        <Input
                          type="number"
                          value={home.year_built ?? ""}
                          onChange={e => setHome(h => ({ ...h, year_built: e.target.value ? Number(e.target.value) : null }))}
                          placeholder="e.g. 1998"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-sm">Heating / cooling</Label>
                        <Select value={home.hvac_type || undefined} onValueChange={v => setHome(h => ({ ...h, hvac_type: v }))}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="central">❄️ Central Air</SelectItem>
                            <SelectItem value="heat_pump">🔄 Heat Pump</SelectItem>
                            <SelectItem value="furnace">🔥 Furnace</SelectItem>
                            <SelectItem value="mini_split">💨 Mini Split</SelectItem>
                            <SelectItem value="window">🪟 Window Units</SelectItem>
                            <SelectItem value="none">❌ None</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm">Roof type</Label>
                        <Select value={home.roof_type || undefined} onValueChange={v => setHome(h => ({ ...h, roof_type: v }))}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="asphalt">🏠 Asphalt Shingle</SelectItem>
                            <SelectItem value="metal">🔩 Metal</SelectItem>
                            <SelectItem value="tile">🧱 Tile</SelectItem>
                            <SelectItem value="slate">🪨 Slate</SelectItem>
                            <SelectItem value="flat">📐 Flat / TPO</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm mb-2 block">Does your home have any of these?</Label>
                        <div className="space-y-2">
                          {[
                            { value: "has_pool", label: "🏊 Pool" },
                            { value: "has_septic", label: "🚽 Septic System" },
                            { value: "has_well_water", label: "💧 Well Water" },
                          ].map(opt => {
                            const isOn = !!(home as any)[opt.value];
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => handleToggle(opt.value)}
                                className={`w-full p-3 rounded-lg border text-left text-sm font-medium transition-all flex items-center justify-between ${
                                  isOn ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/30"
                                }`}
                              >
                                {opt.label}
                                {isOn && <Check size={16} className="text-primary" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between mt-6">
                      <Button variant="ghost" size="sm" onClick={() => { setWizardStep(0); setAddressLookedUp(false); }}>
                        ← Edit address
                      </Button>
                      <Button size="sm" onClick={finishWizard} disabled={savingHome || generating} className="gap-1">
                        {(savingHome || generating) ? <Loader2 size={14} className="animate-spin" /> : <CalendarCheck size={14} />}
                        Confirm & Generate My Schedule
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
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
                      {lookingUpAddress && (
                        <div className="space-y-1.5">
                          <Progress value={lookupProgress} className="h-1.5" />
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Loader2 size={12} className="animate-spin shrink-0" />
                            {lookupStatus}
                          </p>
                        </div>
                      )}
                      {addressLookedUp && (
                        <div className="space-y-2">
                          {home.photo_url && (
                            <img src={home.photo_url} alt={home.name || "Home preview"} className="w-full h-32 object-cover rounded-lg" />
                          )}
                          <div className="rounded-lg bg-success/10 border border-success/30 p-3 text-sm text-success flex items-center gap-2">
                            <Check size={16} />
                            Home details pre-filled from Zillow! Review and adjust on the next screen.
                          </div>
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
                        <Label className="text-sm">Street address</Label>
                        <Input value={home.street_address} onChange={e => setHome({ ...home, street_address: e.target.value })} placeholder="e.g. 123 Main St" className="mt-1" />
                        <p className="text-xs text-muted-foreground mt-1">Only one Trimbly account can claim a given address.</p>
                      </div>
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
                  </>
                )}
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
                    <div className="ml-auto flex flex-wrap gap-2">
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => {
                          if (isPro) { setShowAddTask(true); return; }
                          toast({ title: "Custom tasks are a paid feature", description: "Upgrade your plan to add your own maintenance items.", variant: "destructive" });
                        }}
                      >
                        {isPro ? <Plus size={14} /> : <Lock size={14} />} Add Task
                      </Button>
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
                    <div className="rounded-xl border border-border bg-card">
                      <EmptyState
                        icon={CalendarCheck}
                        title="No maintenance tasks yet"
                        description="Generate an AI-powered maintenance schedule tailored to your home profile, climate, and systems."
                        actionLabel="Generate My Schedule"
                        onAction={generateSchedule}
                      />
                    </div>
                  )}

                  {tasks.length > 0 && (
                    <>
                      {/* Filter tabs + Sort */}
                      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                        <div className="flex flex-wrap gap-2">
                          {(["upcoming", "completed", "all"] as const).map(f => (
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
                        <div className="flex items-center gap-2">
                          <Filter size={14} className="text-muted-foreground" />
                          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="h-10 w-[130px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All categories</SelectItem>
                              {taskCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Select value={seasonFilter} onValueChange={setSeasonFilter}>
                            <SelectTrigger className="h-10 w-[120px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All seasons</SelectItem>
                              <SelectItem value="spring">Spring</SelectItem>
                              <SelectItem value="summer">Summer</SelectItem>
                              <SelectItem value="fall">Fall</SelectItem>
                              <SelectItem value="winter">Winter</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant={selectMode ? "secondary" : "outline"}
                            size="sm"
                            className="h-10"
                            onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
                          >
                            {selectMode ? "Cancel" : "Select"}
                          </Button>
                        </div>
                      </div>

                      {selectMode && (
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 rounded-lg border border-border bg-secondary/40 px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={filteredTasks.length > 0 && filteredTasks.every(t => selectedTaskIds.has(t.id))}
                              onCheckedChange={(checked) => {
                                setSelectedTaskIds(checked ? new Set(filteredTasks.map(t => t.id)) : new Set());
                              }}
                              aria-label="Select all visible tasks"
                            />
                            <span className="text-sm text-muted-foreground">
                              {selectedTaskIds.size > 0 ? `${selectedTaskIds.size} selected` : "Select all"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" disabled={selectedTaskIds.size === 0 || bulkWorking} onClick={bulkComplete} className="gap-1.5">
                              <Check size={14} /> Mark Complete
                            </Button>
                            <Button size="sm" variant="destructive" disabled={selectedTaskIds.size === 0 || bulkWorking} onClick={bulkDelete} className="gap-1.5">
                              <Trash2 size={14} /> Delete
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Task List */}
                      <div className="space-y-3">
                        {filteredTasks.map(task => {
                          // Shared (non-owner) viewers only have read access to a
                          // home's tasks at the database level — hide the write
                          // actions here instead of letting them click through to
                          // a silently-denied, then-reverted write.
                          const isOwnHome = !user || home.user_id === user.id;
                          const isOverdue = task.status !== "completed" && task.due_date && parseDateOnly(task.due_date) < new Date();
                          const taskSeason = seasonForDate(task.due_date);
                          const SeasonIcon = seasonIcons[taskSeason] || Clock;
                          return (
                            <div
                              key={task.id}
                              className={`rounded-xl border bg-card p-4 transition-all ${
                                task.status === "completed" ? "opacity-60 border-border" : isOverdue ? "border-destructive/30" : "border-border hover:border-primary/30"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {selectMode && (
                                  <Checkbox
                                    checked={selectedTaskIds.has(task.id)}
                                    onCheckedChange={() => toggleTaskSelected(task.id)}
                                    aria-label={`Select "${task.title}"`}
                                    className="mt-1.5 shrink-0"
                                  />
                                )}
                                <button
                                  onClick={() => isOwnHome && toggleTask(task)}
                                  disabled={!isOwnHome}
                                  aria-label={!isOwnHome ? `"${task.title}" — read-only on a shared home` : task.status === "completed" ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
                                  aria-pressed={task.status === "completed"}
                                  title={!isOwnHome ? "Only the home's owner can update tasks" : undefined}
                                  className={`mt-1 -m-2 p-2 shrink-0 ${!isOwnHome ? "cursor-default" : ""}`}
                                >
                                  <span
                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                      task.status === "completed"
                                        ? "bg-primary border-primary text-primary-foreground"
                                        : "border-muted-foreground hover:border-primary"
                                    }`}
                                  >
                                    {task.status === "completed" && <Check size={12} />}
                                  </span>
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
                                    <span className="text-[10px] text-secondary-foreground bg-secondary px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                                      <SeasonIcon size={10} /> {taskSeason}
                                    </span>
                                    <span className="text-[10px] text-secondary-foreground bg-secondary px-1.5 py-0.5 rounded">{task.category}</span>
                                    {allHomesView && (
                                      <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                                        <Home size={10} /> {homes.find(h => h.id === (task as any).home_id)?.name || "Unknown"}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                                  {task.products_search_term && (
                                    <button
                                      onClick={() => shopForTask(task)}
                                      className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-primary hover:underline"
                                    >
                                      <ShoppingCart size={12} /> Shop on Amazon <ExternalLink size={10} />
                                    </button>
                                  )}
                                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                    {task.due_date && (
                                      <span className={isOverdue ? "text-destructive font-medium" : ""}>
                                        {isOverdue ? "Overdue: " : "Due: "}
                                        {parseDateOnly(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                      </span>
                                    )}
                                    {task.recurrence_months > 0 && (
                                      <span className="flex items-center gap-1">
                                        <RotateCcw size={10} /> Every {task.recurrence_months} mo
                                      </span>
                                    )}
                                  </div>
                                  {/* Mark Complete / Undo button — read-only for a shared, non-owner home */}
                                  {isOwnHome && (task.status !== "completed" ? (
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
                                  ))}
                                </div>
                                <div className="flex flex-col gap-1 shrink-0">
                                  {isOwnHome && task.status !== "completed" && (
                                    <button onClick={() => openEditTask(task)} aria-label={`Edit due date and frequency for "${task.title}"`} title="Edit due date / frequency" className="text-muted-foreground hover:text-primary transition-colors p-1.5 -m-1.5">
                                      <Pencil size={14} />
                                    </button>
                                  )}
                                  {task.due_date && task.status !== "completed" && (
                                    <button onClick={() => addTaskToCalendar(task)} aria-label={`Add "${task.title}" to calendar`} title="Add to calendar" className="text-muted-foreground hover:text-primary transition-colors p-1.5 -m-1.5">
                                      <CalendarPlus size={14} />
                                    </button>
                                  )}
                                  {isOwnHome && (
                                    <button onClick={() => deleteTask(task.id)} aria-label={`Delete "${task.title}"`} title="Delete" className="text-muted-foreground hover:text-destructive transition-colors p-1.5 -m-1.5">
                                      <Trash2 size={14} />
                                    </button>
                                  )}
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

      <Dialog open={!!editingTask} onOpenChange={(open) => { if (!open) setEditingTask(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit "{editingTask?.title}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Next occurrence date</Label>
              <Input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
              {editDueDate && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {(() => { const Icon = seasonIcons[seasonForDate(editDueDate)] || Clock; return <Icon size={12} />; })()}
                  Season: {seasonForDate(editDueDate)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={editRecurrence} onValueChange={setEditRecurrence}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {recurrenceOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTask(null)}>Cancel</Button>
            <Button onClick={saveTaskEdit} disabled={savingEdit || !editDueDate}>
              {savingEdit ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add a maintenance task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="e.g. Clean gutters" autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Next occurrence date</Label>
              <Input type="date" value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)} />
              {newTaskDueDate && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {(() => { const Icon = seasonIcons[seasonForDate(newTaskDueDate)] || Clock; return <Icon size={12} />; })()}
                  Season: {seasonForDate(newTaskDueDate)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={newTaskRecurrence} onValueChange={setNewTaskRecurrence}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {recurrenceOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTask(false)}>Cancel</Button>
            <Button onClick={addCustomTask} disabled={savingNewTask || !newTaskTitle.trim() || !newTaskDueDate}>
              {savingNewTask ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
};

export default MaintenancePage;
