import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useHomeLimit } from "@/hooks/useHomeLimit";
import { useGarageSubscription } from "@/hooks/useGarageSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { buildHomeownerSatelliteNavItems, homeownerNavGroups } from "@/components/dashboard/homeowner/navItems";
import { tierLabels } from "@/components/dashboard/homeowner/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Home, Crown, LifeBuoy, Bug, AlertTriangle, Lightbulb, MessageCircle, Send, Loader2, Ticket as TicketIcon,
} from "lucide-react";
import { format } from "date-fns";

type Status = "open" | "in_progress" | "resolved" | "closed";
type Category = "bug" | "concern" | "suggestion" | "comment";

interface TicketRow {
  id: string;
  category: Category;
  subject: string;
  body: string;
  status: Status;
  created_at: string;
}

interface CommentRow {
  id: string;
  author_id: string;
  is_staff: boolean;
  body: string;
  created_at: string;
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

export default function Support() {
  const navigate = useNavigate();
  const { user, loading: authLoading, profileName } = useAuth();
  const { subscriptionTier, loading: tierLoading } = useHomeLimit();
  const { active: hasGarage } = useGarageSubscription();
  const { toast } = useToast();

  const [category, setCategory] = useState<Category>("bug");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [selected, setSelected] = useState<TicketRow | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => { if (user) loadTickets(); }, [user]);

  const loadTickets = async () => {
    if (!user) return;
    setLoadingTickets(true);
    const { data, error } = await (supabase.from("support_tickets" as any) as any)
      .select("id, category, subject, body, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) { toast({ title: "Failed to load tickets", description: error.message, variant: "destructive" }); }
    setTickets((data || []) as TicketRow[]);
    setLoadingTickets(false);
  };

  const submitTicket = async () => {
    if (!user || !subject.trim() || !body.trim()) return;
    setSubmitting(true);
    const { error } = await (supabase.from("support_tickets" as any) as any).insert({
      user_id: user.id, category, subject: subject.trim(), body: body.trim(),
    });
    setSubmitting(false);
    if (error) { toast({ title: "Couldn't submit", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Thanks — we got it!", description: "We'll follow up right here on your ticket." });
    setSubject(""); setBody(""); setCategory("bug");
    loadTickets();
  };

  const openTicket = async (t: TicketRow) => {
    setSelected(t);
    setReply("");
    const { data, error } = await (supabase.from("ticket_comments" as any) as any).select("*").eq("ticket_id", t.id).order("created_at", { ascending: true });
    if (error) { toast({ title: "Failed to load replies", description: error.message, variant: "destructive" }); return; }
    setComments((data || []) as CommentRow[]);
  };

  const sendReply = async () => {
    if (!selected || !user || !reply.trim()) return;
    setSendingReply(true);
    const { error } = await (supabase.from("ticket_comments" as any) as any).insert({
      ticket_id: selected.id, author_id: user.id, is_staff: false, body: reply.trim(),
    });
    setSendingReply(false);
    if (error) { toast({ title: "Failed to send", description: error.message, variant: "destructive" }); return; }
    setReply("");
    openTicket(selected);
  };

  if (authLoading || tierLoading || !user) {
    return (
      <div className="min-h-screen bg-background container mx-auto px-4 pt-16 pb-16 max-w-5xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48" />
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
      activeItemId="support"
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
      <div className="max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <LifeBuoy className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Support & Tickets</h1>
            <p className="text-muted-foreground">Report bugs, share concerns, or send suggestions — we read every one.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Submit a ticket</CardTitle>
            <CardDescription>Found something broken, confusing, or worth suggesting? Tell us here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-[180px,1fr] gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CATEGORY_META) as Category[]).map((c) => (
                      <SelectItem key={c} value={c}>{CATEGORY_META[c].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short summary" maxLength={200} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Details</Label>
              <Textarea
                value={body} onChange={(e) => setBody(e.target.value)}
                placeholder="What happened? What did you expect instead? Include steps to reproduce if it's a bug."
                rows={4} maxLength={4000} className="mt-1"
              />
            </div>
            <Button onClick={submitTicket} disabled={submitting || !subject.trim() || !body.trim()} className="gap-1.5">
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {submitting ? "Submitting..." : "Submit ticket"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">My tickets ({tickets.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTickets ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground flex flex-col items-center gap-2">
                <TicketIcon className="w-8 h-8 opacity-40" /> No tickets yet
              </div>
            ) : (
              <div className="divide-y divide-border">
                {tickets.map((t) => {
                  const Icon = CATEGORY_META[t.category].icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => openTicket(t)}
                      className="w-full text-left py-3 flex items-center gap-3 hover:bg-accent/50 transition-colors rounded-lg px-2 -mx-2"
                    >
                      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.subject}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(t.created_at), "MMM d, yyyy · p")}</p>
                      </div>
                      <Badge variant={STATUS_META[t.status].variant} className="text-[10px] shrink-0">{STATUS_META[t.status].label}</Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ticket detail + thread */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2 flex-wrap">
              <DialogTitle className="text-lg">{selected?.subject}</DialogTitle>
              {selected && <Badge variant={STATUS_META[selected.status].variant} className="text-[10px]">{STATUS_META[selected.status].label}</Badge>}
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 -mx-1 px-1">
            {selected && <div className="whitespace-pre-wrap text-sm bg-muted/40 rounded-lg p-3">{selected.body}</div>}
            {comments.map((c) => (
              <div key={c.id} className={`rounded-lg p-3 text-sm ${c.is_staff ? "bg-primary/10 mr-4" : "bg-muted/40 ml-4"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium">{c.is_staff ? "Trimbly Support" : "You"}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{format(new Date(c.created_at), "MMM d, p")}</span>
                </div>
                <p className="whitespace-pre-wrap">{c.body}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-3 space-y-2">
            <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Add more info..." rows={2} maxLength={4000} />
            <div className="flex justify-end">
              <Button size="sm" onClick={sendReply} disabled={sendingReply || !reply.trim()}>
                <Send size={14} /> {sendingReply ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
