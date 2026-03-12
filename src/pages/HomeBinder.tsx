import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, FolderOpen, Plus, Loader2, Pencil, Trash2, FileText, Upload,
  X, Search, Package, Wrench, Shield, Receipt, Home as HomeIcon, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useHomeLimit } from "@/hooks/useHomeLimit";
import { useToast } from "@/hooks/use-toast";

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
  warranty: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  receipt: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  document: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
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
  const { user } = useAuth();
  const { toast } = useToast();
  const { canAddHome, isPro, maxBinderItems, subscriptionTier } = useHomeLimit();
  const isMultiPro = subscriptionTier === "multi_pro";

  const [items, setItems] = useState<BinderItem[]>([]);
  const [homes, setHomes] = useState<{ id: string; name: string }[]>([]);
  const [homeId, setHomeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BinderItem | null>(null);
  const [form, setForm] = useState(emptyItem);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadData();
  }, [user]);

  const loadData = async (selectedHomeId?: string | null) => {
    setLoading(true);
    const { data: allHomes } = await supabase
      .from("homes")
      .select("id, name")
      .eq("user_id", user!.id)
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

  const canAddBinderItem = items.length < maxBinderItems;

  const openNew = () => {
    if (!canAddBinderItem) {
      toast({ title: "Binder limit reached", description: `Your plan allows up to ${maxBinderItems} binder items. Upgrade to Multi-Homeowner Pro for unlimited entries.`, variant: "destructive" });
      return;
    }
    setEditingItem(null);
    setForm(emptyItem);
    setFile(null);
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
    setDialogOpen(true);
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
        updated_at: new Date().toISOString(),
      };

      if (editingItem) {
        await supabase.from("home_binder_items").update(row).eq("id", editingItem.id);
        toast({ title: "Item updated" });
      } else {
        await supabase.from("home_binder_items").insert(row);
        toast({ title: "Item added" });
      }

      setDialogOpen(false);
      await loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to save.", variant: "destructive" });
    }
    setSaving(false);
  };

  const deleteItem = async (item: BinderItem) => {
    if (item.document_url) {
      await supabase.storage.from("binder-docs").remove([item.document_url]);
    }
    await supabase.from("home_binder_items").delete().eq("id", item.id);
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

  if (!isPro) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-2xl text-center py-20">
            <FolderOpen size={48} className="mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Upgrade to Access Digital Home Binder</h2>
            <p className="text-muted-foreground mb-6">
              The Digital Home Binder is available on Homeowner Pro ($5/mo) and Multi-Homeowner Pro ($20/mo) plans.
              Track appliances, warranties, receipts, and documents all in one place.
            </p>
            <div className="flex gap-3 justify-center">
              <Button asChild variant="outline"><Link to="/#pricing">View Plans</Link></Button>
              <Button asChild><Link to="/dashboard">Back to Dashboard</Link></Button>
            </div>
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
                  <FolderOpen size={22} className="text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-foreground font-display">Digital Home Binder</h1>
                  <p className="text-muted-foreground text-sm">Appliances, warranties, receipts & documents — all in one place</p>
                </div>
              </div>
              <Button onClick={openNew} className="gap-1">
                <Plus size={16} /> Add Item
              </Button>
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
                <div className="text-center py-16 rounded-xl border border-border bg-card">
                  <FolderOpen size={40} className="mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-bold text-lg text-foreground mb-2">Your binder is empty</h3>
                  <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
                    Start adding appliances, warranties, receipts, and documents to keep everything organized.
                  </p>
                  <Button onClick={openNew} className="gap-2">
                    <Plus size={16} /> Add Your First Item
                  </Button>
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
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(item)} className="text-muted-foreground hover:text-foreground p-1">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => deleteItem(item)} className="text-muted-foreground hover:text-destructive p-1">
                              <Trash2 size={14} />
                            </button>
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
                <div className="grid grid-cols-2 gap-4">
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Brand</Label>
                    <Input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="Samsung" />
                  </div>
                  <div>
                    <Label>Model Number</Label>
                    <Input value={form.model_number} onChange={e => setForm({ ...form, model_number: e.target.value })} placeholder="RF28R7351SR" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Serial Number</Label>
                    <Input value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} />
                  </div>
                  <div>
                    <Label>Location in Home</Label>
                    <Input value={form.location_in_home} onChange={e => setForm({ ...form, location_in_home: e.target.value })} placeholder="Kitchen" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
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
                        <button onClick={() => setFile(null)} className="ml-auto text-muted-foreground hover:text-destructive"><X size={14} /></button>
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
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default HomeBinder;
