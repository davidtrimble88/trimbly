import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bug, Lightbulb, MessageCircle, AlertTriangle, Send, Ticket as TicketIcon } from "lucide-react";
import { format } from "date-fns";
import { logActivity } from "./activityLog";

type Status = "open" | "in_progress" | "resolved" | "closed";
type Category = "bug" | "concern" | "suggestion" | "comment";

interface TicketRow {
  id: string;
  user_id: string;
  category: Category;
  subject: string;
  body: string;
  status: Status;
  created_at: string;
  updated_at: string;
  reporter_name?: string;
}

interface CommentRow {
  id: string;
  author_id: string;
  is_staff: boolean;
  body: string;
  created_at: string;
  author_name?: string;
}

const CATEGORY_META: Record<Category, { label: string; icon: any }> = {
  bug: { label: "Bug", icon: Bug },
  concern: { label: "Concern", icon: AlertTriangle },
  suggestion: { label: "Suggestion", icon: Lightbulb },
  comment: { label: "Comment", icon: MessageCircle },
};

const STATUS_META: Record<Status, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  open: { label: "Open", variant: "destructive" },
  in_progress: { label: "In Progress", variant: "default" },
  resolved: { label: "Resolved", variant: "secondary" },
  closed: { label: "Closed", variant: "outline" },
};

const StaffTickets = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [selected, setSelected] = useState<TicketRow | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<"open" | "in_progress" | "resolved" | "closed" | "all">("open");

  useEffect(() => { load(); }, [filter]);

  const load = async () => {
    let q = (supabase.from("support_tickets" as any) as any).select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) { toast({ title: "Failed to load tickets", description: error.message, variant: "destructive" }); return; }
    const rows = (data || []) as TicketRow[];
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      const nameMap = new Map((profs || []).map((p: any) => [p.id, p.full_name]));
      rows.forEach((r) => { r.reporter_name = nameMap.get(r.user_id) || "Unknown"; });
    }
    setTickets(rows);
    if (selected) {
      const updated = rows.find((r) => r.id === selected.id);
      if (updated) setSelected(updated);
    }
  };

  const openTicket = async (t: TicketRow) => {
    setSelected(t);
    setReply("");
    const { data, error } = await (supabase.from("ticket_comments" as any) as any).select("*").eq("ticket_id", t.id).order("created_at", { ascending: true });
    if (error) { toast({ title: "Failed to load comments", description: error.message, variant: "destructive" }); return; }
    const rows = (data || []) as CommentRow[];
    const authorIds = [...new Set(rows.map((r) => r.author_id))];
    if (authorIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", authorIds);
      const nameMap = new Map((profs || []).map((p: any) => [p.id, p.full_name]));
      rows.forEach((r) => { r.author_name = nameMap.get(r.author_id) || (r.is_staff ? "Staff" : "User"); });
    }
    setComments(rows);
  };

  const changeStatus = async (newStatus: Status) => {
    if (!selected || !user) return;
    const { error } = await (supabase.from("support_tickets" as any) as any).update({ status: newStatus }).eq("id", selected.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await (supabase.from("ticket_comments" as any) as any).insert({
      ticket_id: selected.id, author_id: user.id, is_staff: true,
      body: `Status changed to "${STATUS_META[newStatus].label}".`,
    });
    await logActivity(user.id, "ticket_status_changed", "support_ticket", selected.id, { from: selected.status, to: newStatus });
    toast({ title: "Status updated" });
    setSelected({ ...selected, status: newStatus });
    load();
    openTicket({ ...selected, status: newStatus });
  };

  const sendReply = async () => {
    if (!selected || !user || !reply.trim()) return;
    setSending(true);
    const { error } = await (supabase.from("ticket_comments" as any) as any).insert({
      ticket_id: selected.id, author_id: user.id, is_staff: true, body: reply.trim(),
    });
    if (error) { toast({ title: "Failed to send", description: error.message, variant: "destructive" }); setSending(false); return; }
    await logActivity(user.id, "ticket_commented", "support_ticket", selected.id);
    setReply("");
    setSending(false);
    toast({ title: "Reply posted" });
    openTicket(selected);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">Support Tickets</h1>
          <p className="text-sm text-muted-foreground">Bugs, concerns, suggestions, and comments reported by homeowners.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["open", "in_progress", "resolved", "closed", "all"] as const).map((f) => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
              {f === "all" ? "All" : STATUS_META[f].label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[400px,1fr] gap-4">
        <Card className="h-[calc(100vh-220px)] overflow-hidden flex flex-col">
          <CardContent className="p-0 overflow-y-auto flex-1">
            {tickets.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <TicketIcon className="w-8 h-8 opacity-40" /> No tickets
              </div>
            ) : tickets.map((t) => {
              const Icon = CATEGORY_META[t.category].icon;
              return (
                <button key={t.id} onClick={() => openTicket(t)}
                  className={`w-full text-left p-4 border-b border-border hover:bg-accent transition-colors ${selected?.id === t.id ? "bg-accent" : ""}`}>
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="font-medium text-sm truncate flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> {t.subject}
                    </span>
                    <Badge variant={STATUS_META[t.status].variant} className="text-[10px] shrink-0">{STATUS_META[t.status].label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{t.reporter_name} · {CATEGORY_META[t.category].label}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(t.created_at), "MMM d, p")}</p>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="h-[calc(100vh-220px)] flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Select a ticket</div>
          ) : (
            <>
              <div className="border-b border-border p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-semibold text-lg">{selected.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selected.reporter_name} · {CATEGORY_META[selected.category].label} · Reported {format(new Date(selected.created_at), "PPp")}
                    </p>
                  </div>
                  <Select value={selected.status} onValueChange={(v) => changeStatus(v as Status)}>
                    <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_META) as Status[]).map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="whitespace-pre-wrap text-sm bg-muted/40 rounded-lg p-4">{selected.body}</div>
                {comments.map((c) => (
                  <div key={c.id} className={`rounded-lg p-3 text-sm ${c.is_staff ? "bg-primary/10 ml-6" : "bg-muted/40 mr-6"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">{c.author_name}</span>
                      {c.is_staff && <Badge variant="outline" className="text-[9px]">Staff</Badge>}
                      <span className="text-[10px] text-muted-foreground ml-auto">{format(new Date(c.created_at), "MMM d, p")}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{c.body}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-border p-4 space-y-3">
                <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply — the reporter will see this on their ticket..." rows={3} maxLength={4000} />
                <div className="flex justify-end">
                  <Button onClick={sendReply} disabled={sending || !reply.trim()}>
                    <Send className="w-4 h-4" /> {sending ? "Sending..." : "Post reply"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default StaffTickets;
