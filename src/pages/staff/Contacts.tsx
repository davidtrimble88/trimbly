import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Send, Clock, CheckCircle2, User as UserIcon, Inbox } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { logActivity } from "./activityLog";

interface ContactMessage {
  id: string;
  user_id: string;
  name: string;
  email: string;
  subject: string;
  body: string;
  status: string;
  replied_at: string | null;
  created_at: string;
}

const Contacts = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<"all" | "new" | "replied">("new");

  useEffect(() => { load(); }, [filter]);

  const load = async () => {
    let q = supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) { toast.error("Failed to load"); return; }
    setMessages(data || []);
  };

  const sendReply = async () => {
    if (!selected || !user || !reply.trim()) return;
    setSending(true);
    const { error: msgErr } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: selected.user_id,
      subject: `Re: ${selected.subject || "Your message"}`,
      body: reply.trim(),
    });
    if (msgErr) { toast.error("Failed: " + msgErr.message); setSending(false); return; }
    await supabase.from("contact_messages")
      .update({ status: "replied", replied_at: new Date().toISOString(), replied_by: user.id })
      .eq("id", selected.id);
    await logActivity(user.id, "contact_replied", "contact", selected.id, { subject: selected.subject });
    setSending(false);
    toast.success("Reply sent to user's inbox");
    setReply(""); setSelected(null); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{messages.length} message{messages.length !== 1 && "s"}</p>
        <div className="flex gap-2">
          {(["new", "replied", "all"] as const).map((f) => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[400px,1fr] gap-4">
        <Card className="h-[calc(100vh-220px)] overflow-hidden flex flex-col">
          <CardContent className="p-0 overflow-y-auto flex-1">
            {messages.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <Inbox className="w-8 h-8 opacity-40" /> No messages
              </div>
            ) : messages.map((m) => (
              <button key={m.id} onClick={() => { setSelected(m); setReply(""); }}
                className={`w-full text-left p-4 border-b border-border hover:bg-accent transition-colors ${selected?.id === m.id ? "bg-accent" : ""}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm truncate">{m.name}</span>
                  <Badge variant={m.status === "new" ? "default" : "secondary"} className="text-xs">
                    {m.status === "new" ? <Clock className="w-3 h-3 mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                    {m.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{m.subject || "(no subject)"}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(m.created_at), "MMM d, p")}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="h-[calc(100vh-220px)] flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Select a message</div>
          ) : (
            <>
              <CardHeader className="border-b border-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-lg mb-1">{selected.subject || "(no subject)"}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                      <UserIcon className="w-4 h-4" /><span>{selected.name}</span><span>·</span>
                      <a href={`mailto:${selected.email}`} className="hover:text-primary">{selected.email}</a>
                    </div>
                  </div>
                  <Badge variant={selected.status === "new" ? "default" : "secondary"}>{selected.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto py-4">
                <p className="text-xs text-muted-foreground mb-3">Received {format(new Date(selected.created_at), "PPp")}</p>
                <div className="whitespace-pre-wrap text-sm bg-muted/40 rounded-lg p-4">{selected.body}</div>
                {selected.replied_at && <p className="text-xs text-muted-foreground mt-3">✓ Replied {format(new Date(selected.replied_at), "PPp")}</p>}
              </CardContent>
              <div className="border-t border-border p-4 space-y-3">
                <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply (sent to user's in-app Messages)..." rows={4} maxLength={4000} />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setSelected(null); setReply(""); }}>Close</Button>
                  <Button onClick={sendReply} disabled={sending || !reply.trim()}>
                    <Send className="w-4 h-4" />{sending ? "Sending..." : "Send Reply"}
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

export default Contacts;
