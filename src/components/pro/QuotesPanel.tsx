import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { FileText, Plus, Send, Trash2, DollarSign, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

interface Quote {
  id: string;
  title: string;
  homeowner_id: string;
  total: number;
  status: string;
  created_at: string;
  sent_at: string | null;
}

interface Props {
  providerId: string;
  providerUserId: string;
  businessName: string;
}

const statusColor = (s: string) => {
  if (s === "accepted") return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  if (s === "paid") return "bg-primary/15 text-primary";
  if (s === "declined") return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  if (s === "sent") return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
  return "bg-secondary text-secondary-foreground";
};

const QuotesPanel = ({ providerId, providerUserId, businessName }: Props) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  // Homeowner picker (from past messages with this pro)
  const [homeownerOptions, setHomeownerOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);

  // Form state
  const [title, setTitle] = useState("");
  const [homeownerId, setHomeownerId] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unit_price: 0 },
  ]);
  const [taxRate, setTaxRate] = useState("0");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const loadQuotes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("quotes")
      .select("id, title, homeowner_id, total, status, created_at, sent_at")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false });
    setQuotes((data as Quote[]) || []);
    setLoading(false);
  };

  const loadHomeowners = async () => {
    // Homeowners who messaged the pro
    const { data: msgs } = await supabase
      .from("messages")
      .select("sender_id")
      .eq("recipient_id", providerUserId);
    const ids = Array.from(new Set((msgs || []).map((m: any) => m.sender_id)));
    if (ids.length === 0) {
      setHomeownerOptions([]);
      return;
    }
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    setHomeownerOptions(
      (profs || []).map((p: any) => ({ id: p.id, name: p.full_name || "Homeowner" }))
    );
  };

  useEffect(() => {
    loadQuotes();
    loadHomeowners();
  }, [providerId, providerUserId]);

  const subtotal = items.reduce(
    (s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0),
    0
  );
  const taxAmount = subtotal * ((Number(taxRate) || 0) / 100);
  const total = subtotal + taxAmount;

  const addItem = () =>
    setItems((prev) => [...prev, { description: "", quantity: 1, unit_price: 0 }]);
  const removeItem = (i: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, patch: Partial<LineItem>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const resetForm = () => {
    setTitle("");
    setHomeownerId("");
    setItems([{ description: "", quantity: 1, unit_price: 0 }]);
    setTaxRate("0");
    setNotes("");
  };

  const saveAndSend = async (send: boolean) => {
    if (!title.trim() || !homeownerId) {
      return toast({ title: "Title and recipient required", variant: "destructive" });
    }
    if (items.some((i) => !i.description.trim())) {
      return toast({ title: "Fill in every line item description", variant: "destructive" });
    }
    setSaving(true);

    const { data: inserted, error } = await supabase
      .from("quotes")
      .insert({
        provider_id: providerId,
        homeowner_id: homeownerId,
        title: title.trim(),
        line_items: items as any,
        subtotal,
        tax_rate: Number(taxRate) || 0,
        tax_amount: taxAmount,
        total,
        notes: notes.trim(),
        status: send ? "sent" : "draft",
        sent_at: send ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      setSaving(false);
      return toast({ title: "Error", description: error?.message, variant: "destructive" });
    }

    if (send) {
      const link = `${window.location.origin}/quote/${inserted.id}`;
      await supabase.from("messages").insert({
        sender_id: providerUserId,
        recipient_id: homeownerId,
        subject: `New quote: ${title.trim()}`,
        body:
          `Hi! I've prepared a quote for "${title.trim()}" — total $${total.toFixed(2)}.\n\n` +
          `You can view and accept it here:\n${link}\n\n— ${businessName}`,
      });
    }

    setSaving(false);
    setCreateOpen(false);
    resetForm();
    loadQuotes();
    toast({ title: send ? "Quote sent" : "Quote saved as draft" });
  };

  const markPaid = async (id: string) => {
    await supabase.from("quotes").update({ status: "paid" }).eq("id", id);
    loadQuotes();
    toast({ title: "Marked as paid" });
  };

  const deleteQuote = async (id: string) => {
    if (!confirm("Delete this quote?")) return;
    await supabase.from("quotes").delete().eq("id", id);
    loadQuotes();
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <FileText size={18} className="text-primary" /> Quotes & Invoices
          </h3>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1">
            <Plus size={14} /> New Quote
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : quotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No quotes yet. Create your first quote to send a homeowner a professional breakdown.
          </p>
        ) : (
          <div className="space-y-2">
            {quotes.map((q) => (
              <div key={q.id} className="flex items-center justify-between bg-muted/40 rounded-lg p-3 gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{q.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(q.created_at).toLocaleDateString()} · $
                    {Number(q.total).toLocaleString()}
                  </p>
                </div>
                <Badge className={`text-xs ${statusColor(q.status)} capitalize`}>{q.status}</Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate(`/quote/${q.id}`)}
                  className="gap-1"
                  title="View"
                >
                  <Eye size={14} />
                </Button>
                {q.status === "accepted" && (
                  <Button size="sm" variant="outline" onClick={() => markPaid(q.id)}>
                    <DollarSign size={14} /> Paid
                  </Button>
                )}
                {(q.status === "draft" || q.status === "declined") && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteQuote(q.id)}
                    className="text-destructive"
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create Quote Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Quote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Quote title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Kitchen faucet replacement"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Send to homeowner *</Label>
              {homeownerOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-1">
                  No homeowners yet. Once a homeowner messages you, they'll appear here.
                </p>
              ) : (
                <select
                  value={homeownerId}
                  onChange={(e) => setHomeownerId(e.target.value)}
                  className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select a homeowner…</option>
                  {homeownerOptions.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <Label>Line items *</Label>
              <div className="space-y-2 mt-2">
                {items.map((it, i) => (
                  <div key={i} className="grid grid-cols-[1fr_70px_90px_auto] gap-2 items-start">
                    <Input
                      placeholder="Description"
                      value={it.description}
                      onChange={(e) => updateItem(i, { description: e.target.value })}
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="Qty"
                      value={it.quantity}
                      onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Price"
                      value={it.unit_price}
                      onChange={(e) => updateItem(i, { unit_price: Number(e.target.value) })}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeItem(i)}
                      disabled={items.length === 1}
                      className="text-destructive"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
              <Button size="sm" variant="outline" onClick={addItem} className="mt-2 gap-1">
                <Plus size={12} /> Add line item
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tax rate (%)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="text-right self-end">
                <p className="text-sm text-muted-foreground">Subtotal: ${subtotal.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Tax: ${taxAmount.toFixed(2)}</p>
                <p className="text-lg font-bold text-foreground">Total: ${total.toFixed(2)}</p>
              </div>
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Terms, timeline, warranty details, etc."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => saveAndSend(false)} disabled={saving}>
              Save Draft
            </Button>
            <Button onClick={() => saveAndSend(true)} disabled={saving} className="gap-1">
              <Send size={14} /> {saving ? "Sending…" : "Send Quote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default QuotesPanel;
