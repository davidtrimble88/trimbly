import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Inbox, Send, Clock, CheckCircle2, ShieldAlert, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";

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

const StaffPortal = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<"all" | "new" | "replied">("new");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    loadMessages();
  }, [isAdmin, filter]);

  const loadMessages = async () => {
    let query = supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
    if (filter !== "all") query = query.eq("status", filter);
    const { data, error } = await query;
    if (error) {
      toast.error("Failed to load messages");
      return;
    }
    setMessages(data || []);
  };

  const sendReply = async () => {
    if (!selected || !user || !reply.trim()) return;
    setSending(true);

    const { error: msgError } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: selected.user_id,
      subject: `Re: ${selected.subject || "Your message"}`,
      body: reply.trim(),
    });

    if (msgError) {
      toast.error("Failed to send reply: " + msgError.message);
      setSending(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("contact_messages")
      .update({ status: "replied", replied_at: new Date().toISOString(), replied_by: user.id })
      .eq("id", selected.id);

    setSending(false);

    if (updateError) {
      toast.error("Reply sent but failed to update status");
    } else {
      toast.success("Reply sent to user's inbox");
      setReply("");
      setSelected(null);
      loadMessages();
    }
  };

  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-3" />
              <h2 className="font-display text-xl font-bold mb-2">Access Restricted</h2>
              <p className="text-sm text-muted-foreground mb-4">
                This page is only available to staff members. If you need help, please use the Contact Us page.
              </p>
              <Button onClick={() => navigate("/contact")}>Go to Contact Us</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-20 pb-10">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display text-3xl font-bold flex items-center gap-2">
                <Inbox className="w-7 h-7 text-primary" /> Staff Portal
              </h1>
              <p className="text-muted-foreground text-sm">Customer contact messages</p>
            </div>
            <div className="flex gap-2">
              {(["new", "replied", "all"] as const).map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-[400px,1fr] gap-4">
            {/* List */}
            <Card className="h-[calc(100vh-220px)] overflow-hidden flex flex-col">
              <CardHeader className="py-3 border-b">
                <CardTitle className="text-sm font-medium">
                  {messages.length} message{messages.length !== 1 ? "s" : ""}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto flex-1">
                {messages.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No messages here
                  </div>
                ) : (
                  messages.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelected(m);
                        setReply("");
                      }}
                      className={`w-full text-left p-4 border-b hover:bg-accent transition-colors ${
                        selected?.id === m.id ? "bg-accent" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm truncate">{m.name}</span>
                        <Badge variant={m.status === "new" ? "default" : "secondary"} className="text-xs">
                          {m.status === "new" ? <Clock className="w-3 h-3 mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                          {m.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mb-1">{m.subject || "(no subject)"}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(m.created_at), "MMM d, p")}
                      </p>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Detail */}
            <Card className="h-[calc(100vh-220px)] flex flex-col">
              {!selected ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  Select a message to view and reply
                </div>
              ) : (
                <>
                  <CardHeader className="border-b">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-lg mb-1">{selected.subject || "(no subject)"}</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <UserIcon className="w-4 h-4" />
                          <span>{selected.name}</span>
                          <span>·</span>
                          <a href={`mailto:${selected.email}`} className="hover:text-primary">{selected.email}</a>
                        </div>
                      </div>
                      <Badge variant={selected.status === "new" ? "default" : "secondary"}>{selected.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto py-4">
                    <p className="text-xs text-muted-foreground mb-3">
                      Received {format(new Date(selected.created_at), "PPp")}
                    </p>
                    <div className="whitespace-pre-wrap text-sm text-foreground bg-muted/40 rounded-lg p-4">
                      {selected.body}
                    </div>
                    {selected.replied_at && (
                      <p className="text-xs text-muted-foreground mt-3">
                        ✓ Replied {format(new Date(selected.replied_at), "PPp")}
                      </p>
                    )}
                  </CardContent>
                  <div className="border-t p-4 space-y-3">
                    <Textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Type your reply... (will be sent to the user's in-app Messages)"
                      rows={4}
                      maxLength={4000}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => { setSelected(null); setReply(""); }}>
                        Close
                      </Button>
                      <Button onClick={sendReply} disabled={sending || !reply.trim()}>
                        <Send className="w-4 h-4" />
                        {sending ? "Sending..." : "Send Reply"}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StaffPortal;
