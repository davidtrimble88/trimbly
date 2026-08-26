import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Bug, Lightbulb, MessageCircle, AlertTriangle, Send, Ticket as TicketIcon, Sparkles, Loader2, Copy, Check, Layers } from "lucide-react";
import { format } from "date-fns";
import { logActivity } from "./activityLog";

type Status = "open" | "in_progress" | "resolved" | "closed";
type Category = "bug" | "concern" | "suggestion" | "comment";
type Urgency = "low" | "medium" | "high" | "critical";

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
  reporter_type?: string;
  ai_area?: string | null;
  ai_issue_type?: string | null;
  ai_urgency?: Urgency | null;
  ai_summary?: string | null;
  ai_group_key?: string | null;
  ai_group_label?: string | null;
  ai_analyzed_at?: string | null;
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

const URGENCY_META: Record<Urgency, { label: string; emoji: string; className: string; rank: number }> = {
  critical: { label: "Critical", emoji: "🔴", className: "bg-destructive/15 text-destructive border-destructive/30", rank: 0 },
  high: { label: "High", emoji: "🟠", className: "bg-warning/15 text-warning border-warning/30", rank: 1 },
  medium: { label: "Medium", emoji: "🟡", className: "bg-accent/15 text-accent border-accent/30", rank: 2 },
  low: { label: "Low", emoji: "🟢", className: "bg-secondary text-secondary-foreground border-transparent", rank: 3 },
};

const AREA_LABELS: Record<string, string> = {
  account_auth: "Account & Auth",
  billing_subscription: "Billing & Subscription",
  home_binder: "Home Binder",
  coverage_advisor: "Coverage Advisor",
  maintenance_scheduling: "Maintenance Scheduling",
  garage_vehicles: "Garage / Vehicles",
  provider_job_matching: "Provider & Job Matching",
  messaging: "Messaging",
  mobile_app_pwa: "Mobile App / PWA",
  discount_codes: "Discount Codes",
  staff_admin: "Staff / Admin",
  performance_reliability: "Performance & Reliability",
  other: "Other",
};

const ISSUE_TYPE_LABELS: Record<string, string> = {
  bug: "Bug", question: "Question", feature_request: "Feature request", complaint: "Complaint", other: "Other",
};

function shortId(id: string) {
  return id.slice(0, 8);
}

function buildReport(tickets: TicketRow[]): string {
  const analyzed = tickets.filter((t) => t.ai_urgency);
  if (analyzed.length === 0) return "No AI-triaged tickets to report on yet — run AI Triage first.";

  const groups = new Map<string, TicketRow[]>();
  for (const t of analyzed) {
    const key = t.ai_group_key || t.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }
  const groupList = [...groups.values()].sort((a, b) => {
    const ra = URGENCY_META[a[0].ai_urgency as Urgency]?.rank ?? 9;
    const rb = URGENCY_META[b[0].ai_urgency as Urgency]?.rank ?? 9;
    if (ra !== rb) return ra - rb;
    return b.length - a.length;
  });

  const urgencyCounts: Record<string, number> = {};
  for (const t of analyzed) urgencyCounts[t.ai_urgency!] = (urgencyCounts[t.ai_urgency!] || 0) + 1;

  const lines: string[] = [];
  lines.push(`# Support Ticket Triage Report`);
  lines.push(`_Generated ${format(new Date(), "PPp")}_`);
  lines.push("");
  lines.push(`${analyzed.length} ticket(s) analyzed · ${groupList.length} distinct issue(s)`);
  lines.push(
    (["critical", "high", "medium", "low"] as Urgency[])
      .filter((u) => urgencyCounts[u])
      .map((u) => `${URGENCY_META[u].emoji} ${URGENCY_META[u].label}: ${urgencyCounts[u]}`)
      .join(" · ")
  );
  lines.push("");

  for (const group of groupList) {
    const head = group[0];
    const urgency = head.ai_urgency as Urgency;
    lines.push(`## ${URGENCY_META[urgency]?.emoji || ""} ${head.ai_group_label || head.subject} (${group.length} ticket${group.length > 1 ? "s" : ""})`);
    lines.push(`Area: ${AREA_LABELS[head.ai_area || "other"] || head.ai_area} · Type: ${ISSUE_TYPE_LABELS[head.ai_issue_type || "other"] || head.ai_issue_type} · Urgency: ${URGENCY_META[urgency]?.label || urgency}`);
    lines.push("");
    lines.push(`**What's happening:** ${head.ai_summary}`);
    lines.push("");
    lines.push(`**Reported by:**`);
    for (const t of group) {
      lines.push(`- "${t.subject}" — ${t.reporter_name || "Unknown"}${t.reporter_type ? ` (${t.reporter_type})` : ""} — ${format(new Date(t.created_at), "MMM d, yyyy")} — ticket ${shortId(t.id)}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

const StaffTickets = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [selected, setSelected] = useState<TicketRow | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<"open" | "in_progress" | "resolved" | "closed" | "all">("open");
  const [triaging, setTriaging] = useState(false);
  const [groupView, setGroupView] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => { load(); }, [filter]);

  const load = async () => {
    let q = (supabase.from("support_tickets" as any) as any).select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) { toast({ title: "Failed to load tickets", description: error.message, variant: "destructive" }); return; }
    const rows = (data || []) as TicketRow[];
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    if (userIds.length) {
      const { data: profs, error: profsErr } = await supabase.from("profiles").select("id, full_name, user_type").in("id", userIds);
      if (profsErr) { toast({ title: "Failed to load reporters", description: profsErr.message, variant: "destructive" }); return; }
      const nameMap = new Map((profs || []).map((p: any) => [p.id, p]));
      rows.forEach((r) => {
        const p = nameMap.get(r.user_id);
        r.reporter_name = p?.full_name || "Unknown";
        r.reporter_type = p?.user_type || undefined;
      });
    }
    setTickets(rows);
    if (selected) {
      const updated = rows.find((r) => r.id === selected.id);
      if (updated) setSelected(updated);
    }
  };

  const runTriage = async () => {
    setTriaging(true);
    try {
      const statuses = filter === "all" ? ["open", "in_progress", "resolved", "closed"] : [filter];
      const { data, error } = await supabase.functions.invoke("triage-support-tickets", { body: { statuses } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: "AI triage complete",
        description: `Analyzed ${data.analyzedCount} ticket(s)${data.truncated ? " (capped at 200 — run again after clearing some out)" : ""}.`,
      });
      await load();
    } catch (err: any) {
      toast({ title: "Triage failed", description: err?.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setTriaging(false);
    }
  };

  const openReport = () => {
    setReportText(buildReport(tickets));
    setCopied(false);
    setReportOpen(true);
  };

  const copyReport = async () => {
    await navigator.clipboard.writeText(reportText);
    setCopied(true);
    toast({ title: "Report copied" });
  };

  const openTicket = async (t: TicketRow) => {
    setSelected(t);
    setReply("");
    const { data, error } = await (supabase.from("ticket_comments" as any) as any).select("*").eq("ticket_id", t.id).order("created_at", { ascending: true });
    if (error) { toast({ title: "Failed to load comments", description: error.message, variant: "destructive" }); return; }
    const rows = (data || []) as CommentRow[];
    const authorIds = [...new Set(rows.map((r) => r.author_id))];
    if (authorIds.length) {
      const { data: profs, error: profsErr } = await supabase.from("profiles").select("id, full_name").in("id", authorIds);
      if (profsErr) { toast({ title: "Failed to load commenters", description: profsErr.message, variant: "destructive" }); return; }
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

  // Groups tickets sharing an ai_group_key adjacent to each other, ordered
  // by the group's urgency (most urgent first) then by group size (bigger
  // duplicate clusters first) — un-triaged tickets fall back to plain
  // created_at order at the end.
  const orderedTickets = useMemo(() => {
    if (!groupView) return tickets;
    const analyzed = tickets.filter((t) => t.ai_group_key);
    const unanalyzed = tickets.filter((t) => !t.ai_group_key);
    const groups = new Map<string, TicketRow[]>();
    for (const t of analyzed) {
      const key = t.ai_group_key!;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    }
    const groupList = [...groups.values()].sort((a, b) => {
      const ra = URGENCY_META[a[0].ai_urgency as Urgency]?.rank ?? 9;
      const rb = URGENCY_META[b[0].ai_urgency as Urgency]?.rank ?? 9;
      if (ra !== rb) return ra - rb;
      return b.length - a.length;
    });
    return [...groupList.flat(), ...unanalyzed];
  }, [tickets, groupView]);

  const analyzedCount = tickets.filter((t) => t.ai_urgency).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">Support Tickets</h1>
          <p className="text-sm text-muted-foreground">Bugs, concerns, suggestions, and comments reported by homeowners.</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {(["open", "in_progress", "resolved", "closed", "all"] as const).map((f) => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
              {f === "all" ? "All" : STATUS_META[f].label}
            </Button>
          ))}
          <div className="w-px h-6 bg-border mx-1" />
          <Button variant="outline" size="sm" onClick={runTriage} disabled={triaging || tickets.length === 0}>
            {triaging ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
            {triaging ? "Analyzing…" : "Run AI Triage"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setGroupView((v) => !v)} disabled={analyzedCount === 0}>
            <Layers className="w-4 h-4 mr-1.5" /> {groupView ? "Grouped" : "Group by issue"}
          </Button>
          <Button size="sm" onClick={openReport} disabled={analyzedCount === 0}>
            Generate Report
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[420px,1fr] gap-4">
        <Card className="h-[calc(100vh-220px)] overflow-hidden flex flex-col">
          <CardContent className="p-0 overflow-y-auto flex-1">
            {tickets.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <TicketIcon className="w-8 h-8 opacity-40" /> No tickets
              </div>
            ) : orderedTickets.map((t) => {
              const Icon = CATEGORY_META[t.category].icon;
              const urgency = t.ai_urgency ? URGENCY_META[t.ai_urgency] : null;
              return (
                <button key={t.id} onClick={() => openTicket(t)}
                  className={`w-full text-left p-4 border-b border-border hover:bg-accent transition-colors ${selected?.id === t.id ? "bg-accent" : ""}`}>
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="font-medium text-sm truncate flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> {t.subject}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {urgency && <Badge variant="outline" className={`text-[10px] ${urgency.className}`}>{urgency.emoji} {urgency.label}</Badge>}
                      <Badge variant={STATUS_META[t.status].variant} className="text-[10px]">{STATUS_META[t.status].label}</Badge>
                    </div>
                  </div>
                  {t.ai_group_label && (
                    <p className="text-xs text-primary truncate mb-0.5">{t.ai_group_label}</p>
                  )}
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
                    {selected.ai_urgency && (
                      <div className="flex items-center gap-1.5 flex-wrap mt-2">
                        <Badge variant="outline" className={`text-[10px] ${URGENCY_META[selected.ai_urgency].className}`}>
                          {URGENCY_META[selected.ai_urgency].emoji} {URGENCY_META[selected.ai_urgency].label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{AREA_LABELS[selected.ai_area || "other"] || selected.ai_area}</Badge>
                        <Badge variant="outline" className="text-[10px]">{ISSUE_TYPE_LABELS[selected.ai_issue_type || "other"] || selected.ai_issue_type}</Badge>
                      </div>
                    )}
                    {selected.ai_summary && (
                      <p className="text-xs text-muted-foreground mt-2 italic">"{selected.ai_summary}"</p>
                    )}
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

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Triage Report</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">Copy this and hand it straight to your engineer/AI assistant to start solving.</p>
          <Textarea value={reportText} readOnly rows={20} className="font-mono text-xs" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReportOpen(false)}>Close</Button>
            <Button onClick={copyReport}>
              {copied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
              {copied ? "Copied" : "Copy report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffTickets;
