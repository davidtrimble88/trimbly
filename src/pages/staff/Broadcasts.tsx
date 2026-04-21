import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, Send, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { logActivity } from "./activityLog";

interface Broadcast {
  id: string;
  audience: string;
  subject: string;
  body: string;
  recipient_count: number;
  sent_at: string;
}

const AUDIENCES = [
  { value: "all", label: "All Users" },
  { value: "homeowners", label: "All Homeowners" },
  { value: "providers", label: "All Providers" },
  { value: "pro_subscribers", label: "Paid Subscribers Only" },
];

const Broadcasts = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<Broadcast[]>([]);
  const [audience, setAudience] = useState("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => { load(); }, []);
  useEffect(() => { computePreview(); }, [audience]);

  const load = async () => {
    const { data } = await supabase.from("broadcasts").select("*").order("sent_at", { ascending: false }).limit(20);
    setHistory((data as Broadcast[]) || []);
  };

  const getRecipientIds = async (): Promise<string[]> => {
    if (audience === "homeowners") {
      const { data } = await supabase.from("profiles").select("id").eq("user_type", "homeowner").eq("suspended", false);
      return (data || []).map((p) => p.id);
    }
    if (audience === "providers") {
      const { data } = await supabase.from("profiles").select("id").eq("user_type", "provider").eq("suspended", false);
      return (data || []).map((p) => p.id);
    }
    if (audience === "pro_subscribers") {
      const { data } = await supabase.from("profiles").select("id").neq("subscription_tier", "free").eq("suspended", false);
      return (data || []).map((p) => p.id);
    }
    const { data } = await supabase.from("profiles").select("id").eq("suspended", false);
    return (data || []).map((p) => p.id);
  };

  const computePreview = async () => {
    setPreviewCount(null);
    const ids = await getRecipientIds();
    setPreviewCount(ids.length);
  };

  const send = async () => {
    if (!user) return;
    if (!subject.trim() || !body.trim()) { toast.error("Subject and body required"); return; }
    if (!confirm(`Send to ${previewCount} recipients?`)) return;
    setSending(true);

    const ids = await getRecipientIds();
    const recipientIds = ids.filter((id) => id !== user.id); // don't send to self

    if (recipientIds.length === 0) { toast.error("No recipients"); setSending(false); return; }

    // Insert in batches of 200
    const batchSize = 200;
    for (let i = 0; i < recipientIds.length; i += batchSize) {
      const batch = recipientIds.slice(i, i + batchSize).map((rid) => ({
        sender_id: user.id, recipient_id: rid, subject: subject.trim(), body: body.trim(),
      }));
      const { error } = await supabase.from("messages").insert(batch);
      if (error) { toast.error("Batch failed: " + error.message); setSending(false); return; }
    }

    await supabase.from("broadcasts").insert({
      author_id: user.id, audience, subject: subject.trim(), body: body.trim(), recipient_count: recipientIds.length,
    });
    await logActivity(user.id, "broadcast_sent", "broadcast", undefined, { audience, recipient_count: recipientIds.length });

    toast.success(`Sent to ${recipientIds.length} recipients`);
    setSubject(""); setBody("");
    setSending(false);
    load();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Megaphone className="w-4 h-4 text-primary" /> Compose Announcement</CardTitle>
          <p className="text-xs text-muted-foreground">Sent as in-app messages to selected user segment</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Audience</Label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{AUDIENCES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
            </Select>
            {previewCount !== null && (
              <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <UsersIcon className="w-3 h-3" /> Will send to <strong className="text-foreground">{previewCount}</strong> recipient{previewCount !== 1 && "s"}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Important platform update" maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} maxLength={4000} placeholder="Hi! We wanted to let you know..." />
            <p className="text-[10px] text-muted-foreground text-right">{body.length}/4000</p>
          </div>
          <Button onClick={send} disabled={sending || !subject.trim() || !body.trim()}>
            <Send className="w-4 h-4" /> {sending ? "Sending..." : "Send Broadcast"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sent Broadcasts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No broadcasts sent yet</p>
          ) : history.map((b) => (
            <div key={b.id} className="border border-border rounded-md p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-sm">{b.subject}</p>
                <span className="text-xs text-muted-foreground">{format(new Date(b.sent_at), "PP p")}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                To: <strong>{AUDIENCES.find((a) => a.value === b.audience)?.label || b.audience}</strong> · {b.recipient_count} recipients
              </p>
              <p className="text-sm text-muted-foreground line-clamp-2">{b.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default Broadcasts;
