import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/EmptyState";
import JobPhotoUploader from "@/components/JobPhotoUploader";
import RentalAgreementDialog, { RentalForAgreement } from "@/components/equipment/RentalAgreementDialog";
import { Search, MapPin, DollarSign, Plus, MessageSquare, FileSignature, Wrench, Loader2, Trash2, Pencil, Send, Inbox, Printer } from "lucide-react";
import { format } from "date-fns";

type RentalMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  rental_id: string | null;
  subject: string;
  body: string;
  read: boolean;
  created_at: string;
};


type Rental = {
  id: string;
  owner_user_id: string;
  owner_provider_id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  price_hour: number | null;
  price_day: number | null;
  price_week: number | null;
  deposit_amount: number;
  currency: string;
  city: string;
  state: string;
  postal_code: string;
  pickup_notes: string;
  photo_urls: string[];
  available: boolean;
  min_rental_hours: number;
  max_rental_days: number;
  insurance_required: boolean;
  terms: string;
  rentable_to: "pros_only" | "homeowners_and_pros";
  created_at: string;
};


type Agreement = {
  id: string;
  rental_id: string;
  owner_user_id: string;
  renter_user_id: string;
  start_date: string;
  end_date: string;
  rate_basis: string;
  rate_amount: number;
  quantity: number;
  subtotal: number;
  deposit: number;
  total: number;
  currency: string;
  terms_snapshot: string;
  insurance_acknowledged: boolean;
  status: string;
  owner_signature: string | null;
  renter_signature: string | null;
  owner_signed_at: string | null;
  renter_signed_at: string | null;
  created_at: string;
  updated_at: string;
  terms_hash?: string | null;
};

const CATEGORIES = ["General", "Power tools", "Heavy equipment", "Ladders & scaffolding", "Plumbing", "Electrical", "Landscaping", "Painting", "Concrete", "HVAC", "Cleaning", "Other"];

const EMPTY_FORM: Partial<Rental> = {
  title: "",
  description: "",
  category: "General",
  condition: "good",
  price_hour: null,
  price_day: null,
  price_week: null,
  deposit_amount: 0,
  city: "",
  state: "",
  postal_code: "",
  pickup_notes: "",
  photo_urls: [],
  available: true,
  min_rental_hours: 1,
  max_rental_days: 30,
  insurance_required: false,
  terms: "",
};

export default function EquipmentRentals() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [providerId, setProviderId] = useState<string | null>(null);
  const [providerLoading, setProviderLoading] = useState(true);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [myRentals, setMyRentals] = useState<Rental[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [rentalTitles, setRentalTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [q, setQ] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterMaxPrice, setFilterMaxPrice] = useState("");

  // Form
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Rental>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Detail / message / agreement
  const [detail, setDetail] = useState<Rental | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [agreementDialogOpen, setAgreementDialogOpen] = useState(false);
  const [agreementRental, setAgreementRental] = useState<RentalForAgreement | null>(null);
  const [viewingAgreement, setViewingAgreement] = useState<Agreement | null>(null);
  const [agreementRenterId, setAgreementRenterId] = useState<string | null>(null);

  // Renter picker (owner picks from people who messaged about a rental)
  const [renterPickerOpen, setRenterPickerOpen] = useState(false);
  const [renterPickerRental, setRenterPickerRental] = useState<Rental | null>(null);
  const [renterCandidates, setRenterCandidates] = useState<{ id: string; name: string }[]>([]);
  const [renterPickerLoading, setRenterPickerLoading] = useState(false);

  // Manage listing dialog (messages + agreements for one of my rentals)
  const [manageRental, setManageRental] = useState<Rental | null>(null);
  const [rentalMessages, setRentalMessages] = useState<RentalMessage[]>([]);
  const [partyNames, setPartyNames] = useState<Record<string, string>>({});
  const [activeThreadUserId, setActiveThreadUserId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [sendingReply, setSendingReply] = useState(false);


  // Agreements filter
  const [agreementStatusFilter, setAgreementStatusFilter] = useState<"all" | "accepted" | "sent" | "declined">("all");
  const [agreementRoleFilter, setAgreementRoleFilter] = useState<"all" | "owner" | "renter">("all");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);


  // Load provider
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("providers").select("id").eq("user_id", user.id).maybeSingle();
      setProviderId(data?.id ?? null);
      setProviderLoading(false);
    })();
  }, [user]);

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [browse, mine, ags] = await Promise.all([
      supabase.from("equipment_rentals").select("*").eq("available", true).order("created_at", { ascending: false }),
      supabase.from("equipment_rentals").select("*").eq("owner_user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("rental_agreements").select("*").or(`owner_user_id.eq.${user.id},renter_user_id.eq.${user.id}`).order("created_at", { ascending: false }),
    ]);
    setRentals((browse.data as any) || []);
    setMyRentals((mine.data as any) || []);
    setAgreements((ags.data as any) || []);

    const myIds = ((mine.data as any[]) || []).map((r) => r.id);
    let msgs: RentalMessage[] = [];
    if (myIds.length) {
      const { data: msgData } = await supabase
        .from("messages")
        .select("id, sender_id, recipient_id, rental_id, subject, body, read, created_at")
        .in("rental_id", myIds)
        .order("created_at", { ascending: true });
      msgs = (msgData as any) || [];
    }
    setRentalMessages(msgs);

    const partyIds = Array.from(new Set([
      ...msgs.flatMap((m) => [m.sender_id, m.recipient_id]),
      ...((ags.data as any[]) || []).flatMap((a) => [a.owner_user_id, a.renter_user_id]),
    ]));
    if (partyIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", partyIds);
      const pmap: Record<string, string> = {};
      (profs || []).forEach((p: any) => { pmap[p.id] = p.full_name || "Unknown"; });
      setPartyNames(pmap);
    }


    const ids = Array.from(new Set([...(ags.data || []).map((a: any) => a.rental_id)]));
    if (ids.length) {
      const { data: titles } = await supabase.from("equipment_rentals").select("id, title").in("id", ids);
      const map: Record<string, string> = {};
      (titles || []).forEach((t: any) => { map[t.id] = t.title; });
      setRentalTitles(map);
    }
    setLoading(false);

  }, [user]);

  useEffect(() => { if (user) loadAll(); }, [user, loadAll]);

  const printAgreementRecord = useCallback((a: Agreement) => {
    const title = rentalTitles[a.rental_id] || "Equipment rental";
    const ownerName = partyNames[a.owner_user_id] || "Owner";
    const renterName = partyNames[a.renter_user_id] || "Renter";
    const fmtTs = (s: string | null | undefined) => s ? new Date(s).toLocaleString() : "—";
    const header =
`Equipment Rental Agreement
Item: ${title}
Owner: ${ownerName}
Renter: ${renterName}
Period: ${a.start_date} → ${a.end_date}
Rate: $${Number(a.rate_amount).toFixed(2)} / ${a.rate_basis} × ${a.quantity}
Subtotal: $${Number(a.subtotal).toFixed(2)}  Deposit: $${Number(a.deposit).toFixed(2)}  Total: $${Number(a.total).toFixed(2)} ${a.currency}
Status: ${a.status.toUpperCase()}
Created: ${fmtTs(a.created_at)}
Last updated: ${fmtTs(a.updated_at)}

`;
    const body = a.terms_snapshot || "(No terms recorded)";
    const ownerSig = a.owner_signature
      ? `Owner: ${a.owner_signature}  (signed ${fmtTs(a.owner_signed_at)})`
      : "Owner: __________________________  (unsigned)";
    const renterSig = a.renter_signature
      ? `Renter: ${a.renter_signature}  (signed ${fmtTs(a.renter_signed_at)})`
      : "Renter: __________________________  (unsigned)";
    const hashLine = a.terms_hash ? `\n\nDocument integrity (SHA-256): ${a.terms_hash}` : "";
    const escaped = (header + body + hashLine).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
    const html = `<!doctype html><html><head><title>Rental Agreement — ${title}</title><style>body{font-family:ui-sans-serif,system-ui,sans-serif;padding:32px;max-width:780px;margin:auto;color:#111}h1{font-size:18px;margin:0 0 12px}pre{white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:11px;line-height:1.5}.sig{margin-top:32px;display:flex;justify-content:space-between;gap:24px;font-size:12px}.foot{margin-top:24px;font-size:10px;color:#555;border-top:1px solid #ccc;padding-top:8px}</style></head><body><h1>Equipment Rental Agreement</h1><pre>${escaped}</pre><div class="sig"><div>${ownerSig}</div><div>${renterSig}</div></div><div class="foot">Printed ${new Date().toLocaleString()}. This document was electronically signed under the U.S. ESIGN Act (15 U.S.C. § 7001) and UETA.</div><script>window.onload=()=>window.print()</script></body></html>`;
    const w = window.open("", "_blank");
    if (!w) {
      toast({ title: "Pop-up blocked", description: "Allow pop-ups to print.", variant: "destructive" });
      return;
    }
    w.document.write(html);
    w.document.close();
  }, [rentalTitles, partyNames, toast]);


  const filtered = useMemo(() => {
    return rentals.filter((r) => {
      if (user && r.owner_user_id === user.id) return false; // hide my own from browse
      if (q.trim()) {
        const t = q.trim().toLowerCase();
        if (!`${r.title} ${r.description} ${r.category}`.toLowerCase().includes(t)) return false;
      }
      if (filterCategory && r.category !== filterCategory) return false;
      if (filterLocation.trim()) {
        const l = filterLocation.trim().toLowerCase();
        if (!`${r.city} ${r.state} ${r.postal_code}`.toLowerCase().includes(l)) return false;
      }
      if (filterMaxPrice) {
        const max = Number(filterMaxPrice);
        const cheapest = Math.min(...[r.price_hour, r.price_day, r.price_week].filter((v): v is number => v != null && v > 0));
        if (Number.isFinite(cheapest) && cheapest > max) return false;
      }
      return true;
    });
  }, [rentals, q, filterCategory, filterLocation, filterMaxPrice, user]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };
  const openEdit = (r: Rental) => {
    setEditingId(r.id);
    setForm(r);
    setFormOpen(true);
  };

  const saveRental = async () => {
    if (!user || !providerId) {
      toast({ title: "Pro profile required", description: "Register as a service provider to list equipment.", variant: "destructive" });
      return;
    }
    if (!form.title?.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    if (!form.price_hour && !form.price_day && !form.price_week) {
      toast({ title: "Set at least one price (hour / day / week)", variant: "destructive" }); return;
    }
    if (!form.city?.trim() || !form.state?.trim()) {
      toast({ title: "City and state required", variant: "destructive" }); return;
    }
    setSaving(true);
    const payload = {
      ...form,
      owner_user_id: user.id,
      owner_provider_id: providerId,
      price_hour: form.price_hour || null,
      price_day: form.price_day || null,
      price_week: form.price_week || null,
      photo_urls: form.photo_urls || [],
    };
    const { error } = editingId
      ? await supabase.from("equipment_rentals").update(payload).eq("id", editingId)
      : await supabase.from("equipment_rentals").insert(payload as any);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }
    toast({ title: editingId ? "Listing updated" : "Listing posted" });
    setFormOpen(false);
    setSaving(false);
    loadAll();
  };

  const toggleAvailable = async (r: Rental) => {
    const { error } = await supabase.from("equipment_rentals").update({ available: !r.available }).eq("id", r.id);
    if (error) { toast({ title: "Could not update", variant: "destructive" }); return; }
    loadAll();
  };

  const deleteRental = async (r: Rental) => {
    if (!confirm(`Delete "${r.title}"?`)) return;
    const { error } = await supabase.from("equipment_rentals").delete().eq("id", r.id);
    if (error) { toast({ title: "Could not delete", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Deleted" });
    loadAll();
  };

  const sendMessage = async () => {
    if (!user || !detail || !messageBody.trim()) return;
    setSendingMsg(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: detail.owner_user_id,
      subject: `Re: ${detail.title}`,
      body: messageBody.trim(),
      rental_id: detail.id,
    } as any);
    if (error) {
      toast({ title: "Could not send", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Message sent" });
      setMessageBody("");
    }
    setSendingMsg(false);
  };

  // Owner picks a renter (from people who have messaged about this rental) before sending an agreement
  const openRenterPicker = async (r: Rental) => {
    if (!user) return;
    setRenterPickerRental(r);
    setRenterPickerOpen(true);
    setRenterPickerLoading(true);
    setRenterCandidates([]);
    const { data: msgs } = await supabase
      .from("messages")
      .select("sender_id")
      .eq("rental_id", r.id)
      .eq("recipient_id", user.id);
    const ids = Array.from(new Set((msgs || []).map((m: any) => m.sender_id).filter((id: string) => id !== user.id)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      setRenterCandidates(
        ids.map((id) => ({
          id,
          name: (profs || []).find((p: any) => p.id === id)?.full_name || "Unknown pro",
        }))
      );
    }
    setRenterPickerLoading(false);
  };

  const startAgreementForRenter = async (renterId: string) => {
    if (!renterPickerRental) return;
    const r = renterPickerRental;
    // Find renter's provider id (optional)
    const { data: prov } = await supabase.from("providers").select("id").eq("user_id", renterId).maybeSingle();
    setAgreementRental({
      id: r.id,
      title: r.title,
      owner_user_id: r.owner_user_id,
      owner_provider_id: r.owner_provider_id,
      price_hour: r.price_hour,
      price_day: r.price_day,
      price_week: r.price_week,
      deposit_amount: r.deposit_amount,
      currency: r.currency,
      terms: r.terms,
      insurance_required: r.insurance_required,
    });
    setAgreementRenterId(renterId);
    setViewingAgreement(null);
    setRenterPickerOpen(false);
    setAgreementDialogOpen(true);
  };

  const openAgreementView = async (a: Agreement) => {
    const rentalMatch = [...rentals, ...myRentals].find((r) => r.id === a.rental_id);
    let rentalForAg: RentalForAgreement | null = null;
    if (rentalMatch) {
      rentalForAg = {
        id: rentalMatch.id,
        title: rentalMatch.title,
        owner_user_id: rentalMatch.owner_user_id,
        owner_provider_id: rentalMatch.owner_provider_id,
        price_hour: rentalMatch.price_hour,
        price_day: rentalMatch.price_day,
        price_week: rentalMatch.price_week,
        deposit_amount: rentalMatch.deposit_amount,
        currency: rentalMatch.currency,
        terms: rentalMatch.terms,
        insurance_required: rentalMatch.insurance_required,
      };
    } else {
      const { data } = await supabase.from("equipment_rentals").select("*").eq("id", a.rental_id).maybeSingle();
      if (data) {
        rentalForAg = {
          id: data.id, title: data.title, owner_user_id: data.owner_user_id, owner_provider_id: data.owner_provider_id,
          price_hour: data.price_hour, price_day: data.price_day, price_week: data.price_week,
          deposit_amount: data.deposit_amount, currency: data.currency, terms: data.terms, insurance_required: data.insurance_required,
        };
      }
    }
    setAgreementRental(rentalForAg);
    setAgreementRenterId(null);
    setViewingAgreement(a);
    setAgreementDialogOpen(true);
  };

  const messageStatsByRental = useMemo(() => {
    const stats: Record<string, { total: number; unread: number; partners: Set<string> }> = {};
    rentalMessages.forEach((m) => {
      if (!m.rental_id) return;
      const s = stats[m.rental_id] || (stats[m.rental_id] = { total: 0, unread: 0, partners: new Set() });
      s.total += 1;
      if (!m.read && user && m.recipient_id === user.id) s.unread += 1;
      const other = user && m.sender_id === user.id ? m.recipient_id : m.sender_id;
      if (other) s.partners.add(other);
    });
    return stats;
  }, [rentalMessages, user]);

  const totalUnreadOnMyListings = useMemo(
    () => Object.values(messageStatsByRental).reduce((sum, s) => sum + s.unread, 0),
    [messageStatsByRental]
  );


  const openManage = (r: Rental) => {
    setManageRental(r);
    const partners = Array.from(messageStatsByRental[r.id]?.partners || []);
    setActiveThreadUserId(partners[0] || null);
    setReplyBody("");
    // mark this rental's inbound msgs read
    if (user) {
      const unreadIds = rentalMessages
        .filter((m) => m.rental_id === r.id && m.recipient_id === user.id && !m.read)
        .map((m) => m.id);
      if (unreadIds.length) {
        supabase.from("messages").update({ read: true }).in("id", unreadIds).then(() => {
          setRentalMessages((prev) => prev.map((m) => unreadIds.includes(m.id) ? { ...m, read: true } : m));
        });
      }
    }
  };

  const sendReply = async () => {
    if (!user || !manageRental || !activeThreadUserId || !replyBody.trim()) return;
    setSendingReply(true);
    const { data, error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: activeThreadUserId,
      subject: `Re: ${manageRental.title}`,
      body: replyBody.trim(),
      rental_id: manageRental.id,
    } as any).select().single();
    if (error) {
      toast({ title: "Could not send", description: error.message, variant: "destructive" });
    } else {
      setRentalMessages((prev) => [...prev, data as any]);
      setReplyBody("");
    }
    setSendingReply(false);
  };

  const renderPrices = (r: Rental) => (
    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3">
      {r.price_hour ? <span>${r.price_hour}/hr</span> : null}
      {r.price_day ? <span>${r.price_day}/day</span> : null}
      {r.price_week ? <span>${r.price_week}/wk</span> : null}
    </div>
  );


  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Wrench size={22} /> Equipment Marketplace</h1>
            <p className="text-sm text-muted-foreground">Pro-to-pro tool & equipment rentals. Sign legally-binding agreements in app.</p>
          </div>
          <Button onClick={openCreate} disabled={!providerId && !providerLoading}>
            <Plus size={16} className="mr-1" /> List equipment
          </Button>
        </div>

        {!providerLoading && !providerId && (
          <Card className="border-orange-500/40 bg-orange-500/5">
            <CardContent className="p-4 text-sm">
              You need a service provider profile to list equipment.{" "}
              <button className="text-primary underline" onClick={() => navigate("/pro-register")}>Register as a pro</button>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="browse">
          <TabsList>
            <TabsTrigger value="browse">Browse <Badge variant="secondary" className="ml-2">{filtered.length}</Badge></TabsTrigger>
            <TabsTrigger value="mine" className="relative">
              My listings <Badge variant="secondary" className="ml-2">{myRentals.length}</Badge>
              {totalUnreadOnMyListings > 0 && (
                <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold animate-pulse">
                  {totalUnreadOnMyListings}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="agreements">Agreements <Badge variant="secondary" className="ml-2">{agreements.length}</Badge></TabsTrigger>
          </TabsList>

          {/* BROWSE */}
          <TabsContent value="browse" className="space-y-4">
            <Card>
              <CardContent className="p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-8" placeholder="Search title, description…" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">All categories</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <Input placeholder="City, state, or ZIP" value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} />
                <Input placeholder="Max price ($)" type="number" value={filterMaxPrice} onChange={(e) => setFilterMaxPrice(e.target.value)} />
              </CardContent>
            </Card>

            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={Wrench} title="No equipment matches your filters" description="Try widening your search or check back soon." />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((r) => (
                  <Card key={r.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setDetail(r)}>
                    {r.photo_urls?.[0] && (
                      <img src={r.photo_urls[0]} alt={r.title} className="w-full h-40 object-cover rounded-t-lg" loading="lazy" />
                    )}
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm leading-tight line-clamp-2">{r.title}</h3>
                        <Badge variant="outline" className="text-xs shrink-0">{r.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>
                      {renderPrices(r)}
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin size={12} /> {r.city}, {r.state}
                      </div>
                      {r.insurance_required && <Badge variant="outline" className="text-xs">Insurance required</Badge>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* MINE */}
          <TabsContent value="mine" className="space-y-3">
            {myRentals.length === 0 ? (
              <EmptyState icon={Wrench} title="You haven't listed any equipment yet" description="Earn extra revenue by renting your gear to other pros." actionLabel="List equipment" onAction={openCreate} />
            ) : (
              myRentals.map((r) => {
                const stats = messageStatsByRental[r.id];
                const msgCount = stats?.total || 0;
                const unread = stats?.unread || 0;
                return (
                <Card key={r.id} className={unread > 0 ? "border-primary border-2 shadow-md" : ""}>
                  <CardContent className="p-4 flex flex-wrap gap-3 items-center">
                    {r.photo_urls?.[0] && <img src={r.photo_urls[0]} alt="" className="w-20 h-20 object-cover rounded" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm truncate">{r.title}</h3>
                        <Badge variant={r.available ? "default" : "secondary"} className="text-xs">{r.available ? "Available" : "Hidden"}</Badge>
                        {unread > 0 && (
                          <Badge className="text-xs bg-primary text-primary-foreground gap-1 animate-pulse">
                            <MessageSquare size={12} /> {unread} new
                          </Badge>
                        )}
                        {msgCount > 0 && unread === 0 && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <MessageSquare size={12} /> {msgCount} message{msgCount === 1 ? "" : "s"}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{r.category} · {r.city}, {r.state}</div>
                      {renderPrices(r)}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-2 text-xs">
                        <span>Available</span>
                        <Switch checked={r.available} onCheckedChange={() => toggleAvailable(r)} />
                      </div>
                      <Button
                        size="sm"
                        variant={unread > 0 ? "default" : "outline"}
                        onClick={() => openManage(r)}
                      >
                        <Inbox size={14} className="mr-1" />
                        Manage {msgCount > 0 && <span className="ml-1 opacity-80">({msgCount})</span>}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => openRenterPicker(r)}>
                        <FileSignature size={14} className="mr-1" /> Send to renter or print

                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(r)}><Pencil size={14} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteRental(r)}><Trash2 size={14} /></Button>
                    </div>
                  </CardContent>
                </Card>
                );
              })

            )}
          </TabsContent>

          {/* AGREEMENTS — record keeping */}
          <TabsContent value="agreements" className="space-y-3">
            {agreements.length === 0 ? (
              <EmptyState icon={FileSignature} title="No rental agreements yet" description="Agreements you send or receive will appear here as a permanent record." />
            ) : (
              <>
                <Card>
                  <CardContent className="p-3 flex flex-wrap gap-2 items-center">
                    <span className="text-xs font-semibold text-muted-foreground mr-1">Filter:</span>
                    {(["all", "accepted", "sent", "declined"] as const).map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={agreementStatusFilter === s ? "default" : "outline"}
                        onClick={() => setAgreementStatusFilter(s)}
                        className="capitalize h-7 text-xs"
                      >
                        {s === "all" ? "All status" : s}
                      </Button>
                    ))}
                    <span className="mx-2 text-muted-foreground">·</span>
                    {(["all", "owner", "renter"] as const).map((r) => (
                      <Button
                        key={r}
                        size="sm"
                        variant={agreementRoleFilter === r ? "default" : "outline"}
                        onClick={() => setAgreementRoleFilter(r)}
                        className="capitalize h-7 text-xs"
                      >
                        {r === "all" ? "All roles" : `As ${r}`}
                      </Button>
                    ))}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {agreements.filter((a) => {
                        if (agreementStatusFilter !== "all" && a.status !== agreementStatusFilter) return false;
                        const role = user?.id === a.owner_user_id ? "owner" : "renter";
                        if (agreementRoleFilter !== "all" && role !== agreementRoleFilter) return false;
                        return true;
                      }).length} of {agreements.length}
                    </span>
                  </CardContent>
                </Card>

                {agreements
                  .filter((a) => {
                    if (agreementStatusFilter !== "all" && a.status !== agreementStatusFilter) return false;
                    const role = user?.id === a.owner_user_id ? "owner" : "renter";
                    if (agreementRoleFilter !== "all" && role !== agreementRoleFilter) return false;
                    return true;
                  })
                  .map((a) => {
                    const isOwner = user?.id === a.owner_user_id;
                    const role = isOwner ? "Owner" : "Renter";
                    const counterpartyId = isOwner ? a.renter_user_id : a.owner_user_id;
                    const counterpartyName = partyNames[counterpartyId] || "Unknown party";
                    const fullySigned = !!a.owner_signature && !!a.renter_signature;
                    const statusColor =
                      a.status === "accepted" ? "bg-primary text-primary-foreground"
                      : a.status === "declined" ? "bg-destructive text-destructive-foreground"
                      : "bg-secondary text-secondary-foreground";

                    return (
                      <Card key={a.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => openAgreementView(a)}>
                        <CardContent className="p-4 space-y-2">
                          <div className="flex flex-wrap gap-2 items-start">
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm flex items-center gap-2">
                                <FileSignature size={14} className="text-primary shrink-0" />
                                {rentalTitles[a.rental_id] || "Equipment rental"}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {role === "Owner" ? "Rented to" : "Rented from"}: <span className="font-medium text-foreground">{counterpartyName}</span>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">{role}</Badge>
                            <Badge className={`text-[10px] uppercase tracking-wide capitalize ${statusColor}`}>{a.status}</Badge>
                          </div>

                          <div className="grid sm:grid-cols-3 gap-2 text-xs bg-muted/30 rounded p-2">
                            <div>
                              <div className="text-muted-foreground">Rental period</div>
                              <div className="font-medium">{a.start_date} → {a.end_date}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Rate</div>
                              <div className="font-medium">${Number(a.rate_amount).toFixed(2)} / {a.rate_basis} × {a.quantity}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Total</div>
                              <div className="font-medium">${Number(a.total).toFixed(2)} {a.currency} <span className="text-muted-foreground">(dep ${Number(a.deposit).toFixed(2)})</span></div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground pt-1">
                            <span>
                              Owner sig: {a.owner_signed_at ? <span className="text-foreground">✓ {format(new Date(a.owner_signed_at), "MMM d, yyyy h:mm a")}</span> : <span className="text-orange-600">pending</span>}
                            </span>
                            <span>
                              Renter sig: {a.renter_signed_at ? <span className="text-foreground">✓ {format(new Date(a.renter_signed_at), "MMM d, yyyy h:mm a")}</span> : <span className="text-orange-600">pending</span>}
                            </span>
                            {fullySigned && <span className="text-primary font-medium">Fully executed</span>}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50 mt-1">
                            <span className="text-[11px] text-muted-foreground">
                              Created {format(new Date(a.created_at), "MMM d, yyyy h:mm a")}
                              {a.updated_at && a.updated_at !== a.created_at && (
                                <> · Updated {format(new Date(a.updated_at), "MMM d, yyyy h:mm a")}</>
                              )}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="ml-auto h-7 text-xs"
                              onClick={(e) => { e.stopPropagation(); printAgreementRecord(a); }}
                            >
                              <Printer size={12} className="mr-1" /> Print
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                <p className="text-[11px] text-muted-foreground text-center pt-2">
                  All signed agreements are permanently stored. Click any record to view the full terms, signatures, and print a copy for your files.
                </p>
              </>
            )}
          </TabsContent>

        </Tabs>
      </main>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(v) => { if (!v) { setDetail(null); setMessageBody(""); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.title}</DialogTitle>
                <DialogDescription>{detail.category} · {detail.city}, {detail.state}</DialogDescription>
              </DialogHeader>

              {detail.photo_urls?.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {detail.photo_urls.map((u) => (
                    <img key={u} src={u} alt="" className="w-full h-24 object-cover rounded" loading="lazy" />
                  ))}
                </div>
              )}

              <div className="space-y-3 text-sm">
                <p className="whitespace-pre-wrap">{detail.description}</p>
                <div className="rounded-md border border-border p-3 bg-muted/30 text-xs space-y-1">
                  <div className="flex items-center gap-2"><DollarSign size={12} /> {[detail.price_hour && `$${detail.price_hour}/hr`, detail.price_day && `$${detail.price_day}/day`, detail.price_week && `$${detail.price_week}/wk`].filter(Boolean).join(" · ")}</div>
                  <div>Security deposit: ${Number(detail.deposit_amount).toFixed(2)}</div>
                  <div>Min: {detail.min_rental_hours}h · Max: {detail.max_rental_days} days</div>
                  {detail.insurance_required && <div className="text-orange-600 dark:text-orange-400 font-medium">Insurance required</div>}
                  {detail.pickup_notes && <div>Pickup: {detail.pickup_notes}</div>}
                </div>
                {detail.terms && (
                  <div>
                    <div className="text-xs font-semibold mb-1">Owner's terms</div>
                    <p className="text-xs whitespace-pre-wrap text-muted-foreground">{detail.terms}</p>
                  </div>
                )}

                <div>
                  <Label className="text-xs">Message the owner</Label>
                  <Textarea value={messageBody} onChange={(e) => setMessageBody(e.target.value)} placeholder="Ask a question or propose a pickup time…" />
                  <Button size="sm" className="mt-2" onClick={sendMessage} disabled={sendingMsg || !messageBody.trim()}>
                    <MessageSquare size={14} className="mr-1" /> Send message
                  </Button>
                </div>

                <p className="text-[11px] text-muted-foreground border-t border-border pt-2">
                  Trimbly is a venue only and is not a party to any rental agreement. Owner and Renter are solely responsible for the equipment, insurance, payment and compliance with local laws.
                </p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
              </DialogFooter>

            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / edit form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit listing" : "List equipment for rent"}</DialogTitle>
            <DialogDescription>Other providers can browse and request a rental agreement.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Bosch SDS-Max rotary hammer" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <select value={form.category || "General"} onChange={(e) => setForm({ ...form, category: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label>Condition</Label>
                <select value={form.condition || "good"} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="new">New</option>
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Specs, accessories included, restrictions…" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>$ / hour</Label>
                <Input type="number" min={0} step="0.01" value={form.price_hour ?? ""} onChange={(e) => setForm({ ...form, price_hour: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <Label>$ / day</Label>
                <Input type="number" min={0} step="0.01" value={form.price_day ?? ""} onChange={(e) => setForm({ ...form, price_day: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <Label>$ / week</Label>
                <Input type="number" min={0} step="0.01" value={form.price_week ?? ""} onChange={(e) => setForm({ ...form, price_week: e.target.value ? Number(e.target.value) : null })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Deposit ($)</Label>
                <Input type="number" min={0} value={form.deposit_amount ?? 0} onChange={(e) => setForm({ ...form, deposit_amount: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Min hours</Label>
                <Input type="number" min={1} value={form.min_rental_hours ?? 1} onChange={(e) => setForm({ ...form, min_rental_hours: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Max days</Label>
                <Input type="number" min={1} value={form.max_rental_days ?? 30} onChange={(e) => setForm({ ...form, max_rental_days: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Label>City</Label>
                <Input value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <Label>State</Label>
                <Input value={form.state || ""} onChange={(e) => setForm({ ...form, state: e.target.value })} />
              </div>
              <div>
                <Label>ZIP</Label>
                <Input value={form.postal_code || ""} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Pickup notes</Label>
              <Input value={form.pickup_notes || ""} onChange={(e) => setForm({ ...form, pickup_notes: e.target.value })} placeholder="e.g. Available weekday evenings after 5pm" />
            </div>
            <div>
              <Label>Photos</Label>
              <JobPhotoUploader value={form.photo_urls || []} onChange={(urls) => setForm({ ...form, photo_urls: urls })} />
            </div>
            <div>
              <Label>Your custom rental terms (optional)</Label>
              <Textarea value={form.terms || ""} onChange={(e) => setForm({ ...form, terms: e.target.value })} placeholder="e.g. Returned cleaned. No use in saltwater. Fuel returned full." />
              <p className="text-xs text-muted-foreground mt-1">Our standard legal terms are appended automatically when an agreement is signed.</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={!!form.insurance_required} onCheckedChange={(v) => setForm({ ...form, insurance_required: v === true })} />
              Renter must confirm insurance coverage
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.available !== false} onCheckedChange={(v) => setForm({ ...form, available: v })} />
              Available for rent
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={saveRental} disabled={saving}>
              {saving && <Loader2 size={14} className="animate-spin mr-1" />} {editingId ? "Save changes" : "Post listing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RentalAgreementDialog
        open={agreementDialogOpen}
        onOpenChange={setAgreementDialogOpen}
        rental={agreementRental}
        existingAgreement={viewingAgreement}
        mode={viewingAgreement ? "view" : "create"}
        renterUserId={agreementRenterId ?? undefined}
        onSaved={loadAll}
      />

      {/* Renter picker (owner chooses who to send agreement to) */}
      <Dialog open={renterPickerOpen} onOpenChange={setRenterPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send rental agreement</DialogTitle>
            <DialogDescription>
              Pick a renter who has messaged you about{" "}
              <span className="font-medium">{renterPickerRental?.title}</span>.
            </DialogDescription>
          </DialogHeader>
          {renterPickerLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin" /></div>
          ) : renterCandidates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3">
              No one has messaged you about this listing yet. The renter must reach out first before you can send them an agreement.
            </p>
          ) : (
            <div className="space-y-2">
              {renterCandidates.map((c) => (
                <Button
                  key={c.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => startAgreementForRenter(c.id)}
                >
                  {c.name}
                </Button>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenterPickerOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage listing dialog: messages + agreements per rental */}
      <Dialog open={!!manageRental} onOpenChange={(v) => { if (!v) { setManageRental(null); setActiveThreadUserId(null); setReplyBody(""); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          {manageRental && (() => {
            const partnerIds = Array.from(messageStatsByRental[manageRental.id]?.partners || []);
            const threadMessages = rentalMessages.filter(
              (m) => m.rental_id === manageRental.id &&
                ((m.sender_id === activeThreadUserId && m.recipient_id === user?.id) ||
                 (m.recipient_id === activeThreadUserId && m.sender_id === user?.id))
            );
            const rentalAgreements = agreements.filter((a) => a.rental_id === manageRental.id);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Wrench size={18} /> {manageRental.title}
                  </DialogTitle>
                  <DialogDescription>
                    {manageRental.category} · {manageRental.city}, {manageRental.state} · {partnerIds.length} conversation{partnerIds.length === 1 ? "" : "s"} · {rentalAgreements.length} agreement{rentalAgreements.length === 1 ? "" : "s"}
                  </DialogDescription>
                </DialogHeader>

                {rentalAgreements.length > 0 && (
                  <div className="rounded-md border border-border p-3 space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Agreements</div>
                    {rentalAgreements.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => openAgreementView(a)}
                        className="w-full text-left text-xs flex items-center justify-between gap-2 rounded p-2 hover:bg-secondary/50"
                      >
                        <span>
                          {partyNames[a.renter_user_id] || "Renter"} · {a.start_date} → {a.end_date} · ${Number(a.total).toFixed(2)}
                        </span>
                        <Badge className="capitalize text-[10px]">{a.status}</Badge>
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid sm:grid-cols-[200px_1fr] gap-3 flex-1 min-h-0">
                  {/* Thread list */}
                  <div className="border border-border rounded-md overflow-y-auto max-h-[50vh]">
                    {partnerIds.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-3">No messages yet about this listing.</p>
                    ) : (
                      partnerIds.map((pid) => {
                        const partnerMsgs = rentalMessages.filter(
                          (m) => m.rental_id === manageRental.id &&
                            (m.sender_id === pid || m.recipient_id === pid)
                        );
                        const last = partnerMsgs[partnerMsgs.length - 1];
                        const unread = partnerMsgs.filter((m) => !m.read && m.recipient_id === user?.id && m.sender_id === pid).length;
                        return (
                          <button
                            key={pid}
                            onClick={() => setActiveThreadUserId(pid)}
                            className={`w-full text-left p-2 border-b border-border last:border-b-0 ${activeThreadUserId === pid ? "bg-secondary" : "hover:bg-secondary/50"}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium truncate">{partyNames[pid] || "Unknown"}</span>
                              {unread > 0 && <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 rounded-full">{unread}</span>}
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">{last?.body}</p>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Thread view */}
                  <div className="flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto border border-border rounded-md p-3 space-y-2 max-h-[40vh]">
                      {!activeThreadUserId ? (
                        <p className="text-xs text-muted-foreground">Pick a conversation on the left.</p>
                      ) : threadMessages.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No messages.</p>
                      ) : (
                        threadMessages.map((m) => {
                          const mine = m.sender_id === user?.id;
                          return (
                            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                                <p className={`text-[10px] mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                  {format(new Date(m.created_at), "MMM d, h:mm a")}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    {activeThreadUserId && (
                      <div className="mt-2 flex gap-2">
                        <Textarea
                          value={replyBody}
                          onChange={(e) => setReplyBody(e.target.value)}
                          placeholder={`Reply to ${partyNames[activeThreadUserId] || "renter"}…`}
                          className="min-h-[60px]"
                        />
                        <Button onClick={sendReply} disabled={sendingReply || !replyBody.trim()}>
                          {sendingReply ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter>
                  {activeThreadUserId && (
                    <Button variant="secondary" onClick={() => { setRenterPickerRental(manageRental); startAgreementForRenter(activeThreadUserId); }}>
                      <FileSignature size={14} className="mr-1" /> Send agreement to this renter
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setManageRental(null)}>Close</Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>



      <Footer />
    </div>
  );
}
