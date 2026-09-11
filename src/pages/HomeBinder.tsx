import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FolderOpen, Plus, Loader2, Pencil, Trash2, FileText, Upload,
  X, Search, Package, Wrench, Shield, Receipt, Home as HomeIcon, Download, BookOpen, Crown, Sparkles, CalendarClock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DashboardShell from "@/components/dashboard/DashboardShell";
import UpgradeGate from "@/components/dashboard/UpgradeGate";
import { buildHomeownerSatelliteNavItems, homeownerNavGroups } from "@/components/dashboard/homeowner/navItems";
import { tierLabels } from "@/components/dashboard/homeowner/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useHomeLimit } from "@/hooks/useHomeLimit";
import { useGarageSubscription } from "@/hooks/useGarageSubscription";
import { useHomeAccess } from "@/hooks/useHomeAccess";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/EmptyState";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const buildManualProxy = (manualUrl: string, mode: "inline" | "download", filename: string) => {
  const params = new URLSearchParams({ url: manualUrl, mode, filename });
  return `${SUPABASE_URL}/functions/v1/manual-proxy?${params.toString()}`;
};

const itemTypes = [
  { value: "appliance", label: "Appliance", icon: Package },
  { value: "system", label: "Home System", icon: Wrench },
  { value: "warranty", label: "Warranty", icon: Shield },
  { value: "receipt", label: "Receipt / Invoice", icon: Receipt },
  { value: "document", label: "Document", icon: FileText },
  { value: "other", label: "Other", icon: FolderOpen },
];

const typeColors: Record<string, string> = {
  appliance: "bg-primary/10 text-primary",
  system: "bg-accent/10 text-accent",
  warranty: "bg-success/10 text-success",
  receipt: "bg-warning/10 text-warning",
  document: "bg-secondary text-secondary-foreground",
  other: "bg-secondary text-muted-foreground",
};

type BinderItem = {
  id: string;
  home_id: string;
  item_type: string;
  name: string;
  brand: string;
  model_number: string;
  serial_number: string;
  purchase_date: string | null;
  warranty_expiry: string | null;
  cost: number;
  location_in_home: string;
  notes: string;
  document_url: string | null;
  document_name: string | null;
  manual_url: string | null;
  manual_title: string | null;
};

type ManualResult = {
  title: string;
  url: string;
  description?: string;
  isPdf: boolean;
  source: string;
};

type SuggestedTask = {
  title: string;
  description: string;
  category: string;
  priority: string;
  due_date: string;
  recurrence_months: number;
  season: string;
  products_search_term: string;
};

const recurrenceLabel = (months: number): string => {
  if (!months || months <= 0) return "One-time";
  if (months === 1) return "Every month";
  if (months === 12) return "Every year";
  return `Every ${months} months`;
};

const emptyItem = {
  item_type: "appliance",
  name: "",
  brand: "",
  model_number: "",
  serial_number: "",
  purchase_date: "",
  warranty_expiry: "",
  cost: 0,
  location_in_home: "",
  notes: "",
};

const HomeBinder = () => {
  const { user, profileName } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canAddHome, isPro, maxBinderItems, subscriptionTier, loading: limitLoading } = useHomeLimit();
  const { active: hasGarage } = useGarageSubscription();
  const isMultiPro = subscriptionTier === "multi_pro";

  const [items, setItems] = useState<BinderItem[]>([]);
  const [homes, setHomes] = useState<{ id: string; name: string; user_id?: string }[]>([]);
  const [homeId, setHomeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BinderItem | null>(null);
  const [form, setForm] = useState(emptyItem);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [findingManual, setFindingManual] = useState(false);
  const [manualResults, setManualResults] = useState<ManualResult[]>([]);
  const [selectedManual, setSelectedManual] = useState<{ url: string; title: string } | null>(null);
  const [uploadingManual, setUploadingManual] = useState(false);
  const [loadingApplianceTasks, setLoadingApplianceTasks] = useState(false);
  const [applianceTaskItem, setApplianceTaskItem] = useState<{ id: string | null; name: string; home_id: string } | null>(null);
  const [suggestedTasks, setSuggestedTasks] = useState<SuggestedTask[]>([]);
  const [selectedTaskIndices, setSelectedTaskIndices] = useState<Set<number>>(new Set());
  const [addingSuggestedTasks, setAddingSuggestedTasks] = useState(false);

  // Effective tier for the currently-selected home: the viewer's own tier
  // if they own it, otherwise the home owner's tier — a shared member's
  // binder cap rides on whatever the owner is paying for, on that one home.
  const { isOwner: isOwnHome, effectiveTier: sharedTier } = useHomeAccess(homeId && homeId !== "all" ? homeId : null);
  const effectiveMaxBinderItems = (homeId !== "all" && isOwnHome === false && sharedTier)
    ? (sharedTier === "free" ? 0 : sharedTier === "multi_pro" ? Infinity : 5)
    : maxBinderItems;

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadData();
  }, [user]);

  const loadData = async (selectedHomeId?: string | null) => {
    setLoading(true);
    // No .eq("user_id", ...) filter — RLS returns owned homes plus any
    // shared with this user.
    const { data: allHomes } = await supabase
      .from("homes")
      .select("id, name, user_id")
      .order("created_at", { ascending: true });

    const homesList = allHomes || [];
    setHomes(homesList);

    const activeHomeId = selectedHomeId !== undefined ? selectedHomeId : homesList[0]?.id || null;

    if (activeHomeId === "all") {
      setHomeId("all");
      const homeIds = homesList.map(h => h.id);
      if (homeIds.length > 0) {
        const { data: binderItems } = await supabase
          .from("home_binder_items")
          .select("*")
          .in("home_id", homeIds)
          .order("created_at", { ascending: false });
        setItems((binderItems as BinderItem[]) || []);
      } else {
        setItems([]);
      }
    } else if (activeHomeId) {
      setHomeId(activeHomeId);
      const { data: binderItems } = await supabase
        .from("home_binder_items")
        .select("*")
        .eq("home_id", activeHomeId)
        .order("created_at", { ascending: false });
      setItems((binderItems as BinderItem[]) || []);
    } else {
      const { data: newHome } = await supabase
        .from("homes")
        .insert({ user_id: user!.id, name: "My Home" })
        .select("id, name")
        .single();
      if (newHome) {
        setHomeId(newHome.id);
        setHomes([newHome]);
      }
    }
    setLoading(false);
  };

  const switchHome = (id: string) => {
    setHomeId(id);
    loadData(id);
  };

  const canAddBinderItem = items.length < effectiveMaxBinderItems;

  const openNew = () => {
    if (!canAddBinderItem) {
      toast({ title: "Binder limit reached", description: `This home's plan allows up to ${effectiveMaxBinderItems} binder items. Upgrade to Home Super Hero for unlimited entries.`, variant: "destructive" });
      return;
    }
    setEditingItem(null);
    setForm(emptyItem);
    setFile(null);
    setManualResults([]);
    setSelectedManual(null);
    setDialogOpen(true);
  };

  const openEdit = (item: BinderItem) => {
    setEditingItem(item);
    setForm({
      item_type: item.item_type,
      name: item.name,
      brand: item.brand || "",
      model_number: item.model_number || "",
      serial_number: item.serial_number || "",
      purchase_date: item.purchase_date || "",
      warranty_expiry: item.warranty_expiry || "",
      cost: item.cost || 0,
      location_in_home: item.location_in_home || "",
      notes: item.notes || "",
    });
    setFile(null);
    setManualResults([]);
    setSelectedManual(item.manual_url ? { url: item.manual_url, title: item.manual_title || "User Manual" } : null);
    setDialogOpen(true);
  };

  const findManual = async () => {
    if (!form.brand.trim() || !form.model_number.trim()) {
      toast({ title: "Brand & model needed", description: "Enter brand and model number to find the manual.", variant: "destructive" });
      return;
    }
    setFindingManual(true);
    setManualResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("find-manual", {
        body: { brand: form.brand, model: form.model_number, productType: form.item_type },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const results: ManualResult[] = data?.results || [];
      setManualResults(results);
      if (results.length === 0) {
        toast({ title: "No manuals found", description: "Try a different model number." });
      } else if (results[0].isPdf) {
        // Auto-select top PDF result
        setSelectedManual({ url: results[0].url, title: results[0].title });
        toast({ title: "Manual found", description: results[0].title });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Search failed";
      toast({ title: "Search error", description: msg, variant: "destructive" });
    } finally {
      setFindingManual(false);
    }
  };

  // The User Manual section only ever offered "search the web for it" —
  // there was no way to attach a manual you already have as a PDF. This
  // mirrors manual_url's existing contract (a plain fetchable URL that
  // manual-proxy fetches server-side) by generating a long-lived signed URL
  // for the private binder-docs bucket, so it's viewed exactly like a
  // manual found via search — no schema or proxy changes needed.
  const uploadOwnManual = async (uploadedFile: File) => {
    if (!user) return;
    if (uploadedFile.size > 15 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 15MB.", variant: "destructive" });
      return;
    }
    setUploadingManual(true);
    try {
      const path = `${user.id}/manuals/${Date.now()}-${uploadedFile.name}`;
      const { error: upErr } = await supabase.storage.from("binder-docs").upload(path, uploadedFile);
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from("binder-docs")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signErr || !signed?.signedUrl) throw signErr || new Error("Could not create a link to the file");
      setSelectedManual({ url: signed.signedUrl, title: uploadedFile.name });
      setManualResults([]);
      toast({ title: "Manual attached", description: uploadedFile.name });
    } catch (err) {
      toast({ title: "Upload failed", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    } finally {
      setUploadingManual(false);
    }
  };

  const saveItem = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    if (!homeId || !user) return;

    setSaving(true);
    try {
      let documentUrl = editingItem?.document_url || null;
      let documentName = editingItem?.document_name || null;

      // Upload file if provided
      if (file) {
        const path = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadErr } = await supabase.storage
          .from("binder-docs")
          .upload(path, file);
        if (uploadErr) throw uploadErr;
        documentUrl = path;
        documentName = file.name;
      }

      // Auto-find manual if brand+model present and none selected yet
      let manualUrl = selectedManual?.url || null;
      let manualTitle = selectedManual?.title || null;
      if (!manualUrl && form.brand.trim() && form.model_number.trim()) {
        try {
          const { data } = await supabase.functions.invoke("find-manual", {
            body: { brand: form.brand, model: form.model_number, productType: form.item_type },
          });
          const top = (data?.results || []).find((r: ManualResult) => r.isPdf) || (data?.results || [])[0];
          if (top) {
            manualUrl = top.url;
            manualTitle = top.title;
          }
        } catch { /* ignore manual lookup failures */ }
      }

      const row = {
        home_id: homeId,
        user_id: user.id,
        item_type: form.item_type,
        name: form.name.trim(),
        brand: form.brand,
        model_number: form.model_number,
        serial_number: form.serial_number,
        purchase_date: form.purchase_date || null,
        warranty_expiry: form.warranty_expiry || null,
        cost: form.cost || 0,
        location_in_home: form.location_in_home,
        notes: form.notes,
        document_url: documentUrl,
        document_name: documentName,
        manual_url: manualUrl,
        manual_title: manualTitle,
        updated_at: new Date().toISOString(),
      };

      const isNewAppliance = !editingItem && row.item_type === "appliance";
      let newItemId: string | null = null;

      if (editingItem) {
        // .select() so a write blocked by RLS (a shared, non-owner viewer —
        // home_binder_items is owner-only for writes) comes back as an empty
        // array instead of silently "succeeding" with 0 rows affected.
        const { data: updated, error: updateErr } = await supabase.from("home_binder_items").update(row).eq("id", editingItem.id).select("id");
        if (updateErr || !updated || updated.length === 0) {
          toast({ title: "Couldn't update item", description: "Only the home's owner can edit binder items on a shared home.", variant: "destructive" });
          setSaving(false);
          return;
        }
        toast({ title: "Item updated" });
      } else if (isNewAppliance && isPro) {
        // Need the new row's id back so the maintenance tasks it generates
        // can link to it (skips re-asking brand/model at "Shop on Amazon" time).
        const { data: inserted } = await supabase.from("home_binder_items").insert(row).select("id").single();
        newItemId = inserted?.id || null;
        toast({ title: "Item added" });
      } else {
        await supabase.from("home_binder_items").insert(row);
        toast({ title: "Item added" });
      }

      setDialogOpen(false);
      await loadData();

      // Paid tiers only: offer AI-suggested maintenance tasks for a newly
      // added appliance, picked from a checklist rather than auto-added.
      if (isNewAppliance && isPro) {
        suggestApplianceMaintenance({ id: newItemId, name: row.name, brand: row.brand, model_number: row.model_number, home_id: row.home_id });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to save.", variant: "destructive" });
    }
    setSaving(false);
  };

  const suggestApplianceMaintenance = async (item: { id: string | null; name: string; brand: string; model_number: string; home_id: string }) => {
    setApplianceTaskItem({ id: item.id, name: item.name, home_id: item.home_id });
    setLoadingApplianceTasks(true);
    setSuggestedTasks([]);
    setSelectedTaskIndices(new Set());
    try {
      const { data: homeRow } = await supabase.from("homes").select("city, state").eq("id", item.home_id).maybeSingle();
      const { data, error } = await supabase.functions.invoke("generate-appliance-maintenance", {
        body: {
          appliance: { name: item.name, brand: item.brand, model_number: item.model_number },
          home: homeRow || {},
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Failed to get suggestions");
      const tasks: SuggestedTask[] = data?.tasks || [];
      setSuggestedTasks(tasks);
      setSelectedTaskIndices(new Set(tasks.map((_, i) => i)));
    } catch {
      // Fail quietly — this is a bonus suggestion on top of a save that
      // already succeeded, not something worth alarming the user about.
      setSuggestedTasks([]);
    }
    setLoadingApplianceTasks(false);
  };

  const toggleSuggestedTask = (index: number) => {
    setSelectedTaskIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const addSelectedApplianceTasks = async () => {
    if (!applianceTaskItem || !user) return;
    const chosen = suggestedTasks.filter((_, i) => selectedTaskIndices.has(i));
    if (chosen.length === 0) {
      setApplianceTaskItem(null);
      return;
    }
    setAddingSuggestedTasks(true);
    const rows = chosen.map(t => ({
      home_id: applianceTaskItem.home_id,
      user_id: user.id,
      binder_item_id: applianceTaskItem.id,
      title: t.title,
      description: t.description || "",
      category: t.category || "Appliances",
      priority: t.priority || "medium",
      status: "upcoming",
      due_date: t.due_date || null,
      recurrence_months: t.recurrence_months || 0,
      season: t.season || "any",
      products_search_term: t.products_search_term || null,
    }));
    const { error } = await supabase.from("maintenance_tasks").insert(rows);
    setAddingSuggestedTasks(false);
    if (error) {
      toast({ title: "Couldn't add tasks", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `${chosen.length} maintenance task${chosen.length > 1 ? "s" : ""} added`, description: "Find them in Maintenance Autopilot." });
    setApplianceTaskItem(null);
  };

  const deleteItem = async (item: BinderItem) => {
    // Delete the row first — a shared, non-owner viewer's delete is blocked
    // by RLS (empty array back, no error), and this used to unconditionally
    // remove the storage document and show "Item deleted" regardless,
    // orphaning the still-existing row's document.
    const { data: deleted, error } = await supabase.from("home_binder_items").delete().eq("id", item.id).select("id");
    if (error || !deleted || deleted.length === 0) {
      toast({ title: "Couldn't delete item", description: "Only the home's owner can delete binder items on a shared home.", variant: "destructive" });
      return;
    }
    if (item.document_url) {
      await supabase.storage.from("binder-docs").remove([item.document_url]);
    }
    setItems(prev => prev.filter(i => i.id !== item.id));
    toast({ title: "Item deleted" });
  };

  const downloadDoc = async (item: BinderItem) => {
    if (!item.document_url) return;
    const { data } = await supabase.storage.from("binder-docs").createSignedUrl(item.document_url, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const filteredItems = items.filter(item => {
    const matchesType = filterType === "all" || item.item_type === filterType;
    const matchesSearch = !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location_in_home?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const isWarrantyExpiring = (date: string | null) => {
    if (!date) return false;
    const diff = new Date(date).getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000; // within 30 days
  };

  const isWarrantyExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  if (!user) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-2xl text-center py-20">
            <FolderOpen size={48} className="mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Sign in to use Digital Home Binder</h2>
            <p className="text-muted-foreground mb-6">Keep track of all your appliances, warranties, and home documents in one place.</p>
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
      activeItemId="binder"
      onNavigate={() => {}}
      header={{
        avatarIcon: HomeIcon,
        displayName,
        subtitle: (
          <Badge variant="secondary" className="text-xs gap-1">
            <Crown size={12} className="text-primary" /> {tierLabels[subscriptionTier] ?? "Free"}
          </Badge>
        ),
        onEditProfile: () => navigate("/dashboard?tab=profile"),
      }}
    >
      {limitLoading ? (
        <div className="max-w-4xl rounded-xl border border-border bg-card p-6 h-48 animate-pulse" />
      ) : (
      <UpgradeGate
        hasAccess={isPro || homes.some(h => h.user_id && h.user_id !== user.id)}
        featureName="Digital Home Binder"
        description="Track appliances, warranties, receipts, and documents all in one place."
        benefits={["Store appliance manuals & warranties", "Track receipts and documents", "Warranty expiration alerts"]}
        pricingRoute="/#pricing"
        icon={Crown}
      >
        <div className="max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FolderOpen size={22} className="text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-foreground font-display">Digital Home Binder</h1>
                  <p className="text-muted-foreground text-sm">Appliances, warranties, receipts & documents — all in one place</p>
                </div>
              </div>
              {homeId !== "all" && (
                <Button onClick={openNew} className="gap-1">
                  <Plus size={16} /> Add Item
                </Button>
              )}
            </div>

            {/* Home selector tabs */}
            {homes.length > 1 && (
              <div className="flex gap-2 mt-4 overflow-x-auto">
                {isMultiPro && (
                  <button
                    onClick={() => switchHome("all")}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border whitespace-nowrap transition-all flex items-center gap-1 ${
                      homeId === "all" ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border hover:border-primary/30"
                    }`}
                  >
                    All Homes
                  </button>
                )}
                {homes.map(h => (
                  <button
                    key={h.id}
                    onClick={() => switchHome(h.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border whitespace-nowrap transition-all flex items-center gap-1 ${
                      homeId === h.id ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border hover:border-primary/30"
                    }`}
                  >
                    <HomeIcon size={12} /> {h.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Search + Filter */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-1.5 overflow-x-auto">
                  <button
                    onClick={() => setFilterType("all")}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border whitespace-nowrap transition-all ${
                      filterType === "all" ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-transparent hover:bg-secondary"
                    }`}
                  >
                    All ({items.length})
                  </button>
                  {itemTypes.map(t => {
                    const count = items.filter(i => i.item_type === t.value).length;
                    if (count === 0) return null;
                    return (
                      <button
                        key={t.value}
                        onClick={() => setFilterType(t.value)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border whitespace-nowrap transition-all ${
                          filterType === t.value ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-transparent hover:bg-secondary"
                        }`}
                      >
                        {t.label} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Empty state */}
              {items.length === 0 && (
                <div className="rounded-xl border border-border bg-card">
                  <EmptyState
                    icon={FolderOpen}
                    title="Your binder is empty"
                    description="Start adding appliances, warranties, receipts, and documents to keep everything organized."
                    actionLabel="Add Your First Item"
                    onAction={openNew}
                  />
                </div>
              )}
              {items.length > 0 && filteredItems.length === 0 && (
                <div className="rounded-xl border border-border bg-card">
                  <EmptyState
                    icon={Search}
                    title="No items match your search"
                    description="Try clearing your filters or searching for a different keyword."
                    actionLabel="Clear filters"
                    onAction={() => { setSearchQuery(""); setFilterType("all"); }}
                  />
                </div>
              )}

              {/* Items Grid */}
              {filteredItems.length > 0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredItems.map(item => {
                    const typeInfo = itemTypes.find(t => t.value === item.item_type) || itemTypes[5];
                    const TypeIcon = typeInfo.icon;
                    const expiring = isWarrantyExpiring(item.warranty_expiry);
                    const expired = isWarrantyExpired(item.warranty_expiry);

                    return (
                      <div key={item.id} className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-lg transition-all group">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${typeColors[item.item_type] || typeColors.other}`}>
                              <TypeIcon size={16} />
                            </span>
                            <Badge variant="secondary" className="text-[10px]">{typeInfo.label}</Badge>
                          </div>
                          {/* isOwnHome is only ever definitively false for a real
                              shared, non-owner viewer of a single home — hide
                              the write actions there instead of letting them
                              click through to a silently-denied write. Leave
                              them visible in the "all homes" / loading cases
                              (undefined), where per-item ownership isn't known
                              here and the backend write check still protects
                              the data either way. */}
                          <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            {isOwnHome !== false && (
                              <button onClick={() => openEdit(item)} aria-label={`Edit ${item.name}`} className="text-muted-foreground hover:text-foreground p-1.5 -m-0.5">
                                <Pencil size={14} />
                              </button>
                            )}
                            {isOwnHome !== false && (
                              <button onClick={() => deleteItem(item)} aria-label={`Delete ${item.name}`} className="text-muted-foreground hover:text-destructive p-1.5 -m-0.5">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        <h4 className="font-semibold text-foreground text-sm mb-1">{item.name}</h4>
                        {homeId === "all" && (
                          <p className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded inline-flex items-center gap-1 mb-1">
                            <HomeIcon size={10} /> {homes.find(h => h.id === item.home_id)?.name || "Unknown"}
                          </p>
                        )}
                        {item.brand && <p className="text-xs text-muted-foreground">{item.brand}{item.model_number ? ` · ${item.model_number}` : ""}</p>}
                        {item.location_in_home && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <HomeIcon size={10} /> {item.location_in_home}
                          </p>
                        )}

                        {item.warranty_expiry && (
                          <div className={`mt-2 text-xs font-medium px-2 py-1 rounded inline-block ${
                            expired ? "bg-destructive/10 text-destructive" : expiring ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"
                          }`}>
                            {expired ? "Warranty expired" : expiring ? "Warranty expiring soon" : `Warranty until ${new Date(item.warranty_expiry).toLocaleDateString()}`}
                          </div>
                        )}

                        {item.cost > 0 && (
                          <p className="text-xs text-muted-foreground mt-2">Cost: ${Number(item.cost).toLocaleString()}</p>
                        )}

                        {item.document_name && (
                          <button onClick={() => downloadDoc(item)} className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline">
                            <Download size={12} /> {item.document_name}
                          </button>
                        )}

                        {item.manual_url && (() => {
                          const fname = `${item.brand || "manual"}-${item.model_number || item.name}`.replace(/\s+/g, "-").toLowerCase();
                          return (
                            <div className="mt-2 flex items-center gap-3 text-xs">
                              <a
                                href={buildManualProxy(item.manual_url, "inline", fname)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-primary hover:underline"
                              >
                                <BookOpen size={12} /> View Manual
                              </a>
                              <a
                                href={buildManualProxy(item.manual_url, "download", fname)}
                                download={`${fname}.pdf`}
                                className="flex items-center gap-1 text-primary hover:underline"
                              >
                                <Download size={12} /> Download
                              </a>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Add/Edit Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingItem ? "Edit Item" : "Add Item"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <Select value={form.item_type} onValueChange={v => setForm({ ...form, item_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {itemTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Name *</Label>
                    <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Samsung Refrigerator" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Brand</Label>
                    <Input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="Samsung" />
                  </div>
                  <div>
                    <Label>Model Number</Label>
                    <Input value={form.model_number} onChange={e => { setForm({ ...form, model_number: e.target.value }); setSelectedManual(null); setManualResults([]); }} placeholder="RF28R7351SR" />
                  </div>
                </div>

                {/* User Manual */}
                <div className="rounded-lg border border-border bg-secondary/30 p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Label className="flex items-center gap-1.5 text-sm">
                      <BookOpen size={14} className="text-primary" /> User Manual
                    </Label>
                    <div className="flex items-center gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={findManual} disabled={findingManual || !form.brand.trim() || !form.model_number.trim()}>
                        {findingManual ? <><Loader2 size={12} className="animate-spin mr-1.5" /> Searching</> : <><Search size={12} className="mr-1.5" /> Find Manual</>}
                      </Button>
                      <label className={`inline-flex items-center text-xs font-medium border border-border rounded-md px-3 py-1.5 cursor-pointer hover:border-primary/30 ${uploadingManual ? "opacity-60 pointer-events-none" : ""}`}>
                        {uploadingManual ? <Loader2 size={12} className="animate-spin mr-1.5" /> : <Upload size={12} className="mr-1.5" />}
                        Upload your own
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          disabled={uploadingManual}
                          onChange={e => { const f = e.target.files?.[0]; if (f) uploadOwnManual(f); e.target.value = ""; }}
                        />
                      </label>
                    </div>
                  </div>
                  {selectedManual ? (
                    <div className="flex items-center gap-2 text-xs bg-card border border-border rounded px-2 py-1.5">
                      <FileText size={12} className="text-primary shrink-0" />
                      <a href={selectedManual.url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline flex-1">{selectedManual.title}</a>
                      <button onClick={() => setSelectedManual(null)} aria-label="Remove selected manual" className="text-muted-foreground hover:text-destructive shrink-0"><X size={12} /></button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {form.brand && form.model_number
                        ? "We'll auto-attach the manual when you save, or click Find Manual to choose — or upload your own if you already have it."
                        : "Enter brand + model to search for the manual, or upload your own."}
                    </p>
                  )}
                  {manualResults.length > 0 && (
                    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                      {manualResults.slice(0, 6).map((r, i) => {
                        const isSelected = selectedManual?.url === r.url;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedManual({ url: r.url, title: r.title })}
                            className={`w-full text-left text-xs rounded px-2 py-1.5 border flex items-start gap-2 ${
                              isSelected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"
                            }`}
                          >
                            <FileText size={12} className={`mt-0.5 shrink-0 ${r.isPdf ? "text-primary" : "text-muted-foreground"}`} />
                            <span className="flex-1 min-w-0">
                              <span className="block truncate font-medium text-foreground">{r.title}</span>
                              <span className="block text-[10px] text-muted-foreground">{r.source}{r.isPdf ? " · PDF" : ""}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Serial Number</Label>
                    <Input value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} />
                  </div>
                  <div>
                    <Label>Location in Home</Label>
                    <Input value={form.location_in_home} onChange={e => setForm({ ...form, location_in_home: e.target.value })} placeholder="Kitchen" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label>Purchase Date</Label>
                    <Input type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>Warranty Expiry</Label>
                    <Input type="date" value={form.warranty_expiry} onChange={e => setForm({ ...form, warranty_expiry: e.target.value })} />
                  </div>
                  <div>
                    <Label>Cost ($)</Label>
                    <Input type="number" value={form.cost || ""} onChange={e => setForm({ ...form, cost: Number(e.target.value) })} />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="resize-none" placeholder="Any additional info..." />
                </div>
                <div>
                  <Label>Attach Document</Label>
                  <div className="mt-1">
                    {file ? (
                      <div className="flex items-center gap-2 text-sm text-foreground bg-secondary px-3 py-2 rounded-lg">
                        <FileText size={14} /> {file.name}
                        <button onClick={() => setFile(null)} aria-label="Remove attached file" className="ml-auto text-muted-foreground hover:text-destructive"><X size={14} /></button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/30 text-sm text-muted-foreground">
                        <Upload size={16} /> Choose file (PDF, image, etc.)
                        <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" />
                      </label>
                    )}
                    {editingItem?.document_name && !file && (
                      <p className="text-xs text-muted-foreground mt-1">Current: {editingItem.document_name}</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={saveItem} disabled={saving}>
                    {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                    {editingItem ? "Update" : "Add Item"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={!!applianceTaskItem} onOpenChange={(open) => { if (!open) setApplianceTaskItem(null); }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles size={18} className="text-primary" /> Maintenance for "{applianceTaskItem?.name}"
                </DialogTitle>
                <DialogDescription>
                  {loadingApplianceTasks
                    ? "Checking what routine maintenance this item typically needs..."
                    : suggestedTasks.length > 0
                      ? "Pick which of these to add to Maintenance Autopilot."
                      : "No routine maintenance is typically needed for this item."}
                </DialogDescription>
              </DialogHeader>

              {loadingApplianceTasks ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={28} className="animate-spin text-primary" />
                </div>
              ) : suggestedTasks.length > 0 ? (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto py-1">
                  {suggestedTasks.map((t, i) => (
                    <label
                      key={i}
                      className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:border-primary/30 transition-colors"
                    >
                      <Checkbox checked={selectedTaskIndices.has(i)} onCheckedChange={() => toggleSuggestedTask(i)} className="mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">{t.title}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                            <CalendarClock size={10} /> {recurrenceLabel(t.recurrence_months)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setApplianceTaskItem(null)}>
                  {suggestedTasks.length > 0 ? "Skip" : "Close"}
                </Button>
                {suggestedTasks.length > 0 && (
                  <Button onClick={addSelectedApplianceTasks} disabled={addingSuggestedTasks || selectedTaskIndices.size === 0}>
                    {addingSuggestedTasks ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
                    Add {selectedTaskIndices.size > 0 ? selectedTaskIndices.size : ""} to Autopilot
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </UpgradeGate>
      )}
    </DashboardShell>
  );
};

export default HomeBinder;
