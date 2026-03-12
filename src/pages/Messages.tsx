import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, MessageSquare, Send, Crown, Clock, CheckCheck, User, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  provider_id: string | null;
  subject: string;
  body: string;
  read: boolean;
  created_at: string;
}

interface ConversationPartner {
  id: string;
  name: string;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
  providerId: string | null;
  providerTier: string | null;
}

const Messages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [providerTiers, setProviderTiers] = useState<Record<string, string>>({});
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{ user_type: string; subscription_tier: string } | null>(null);

  // Load messages & related data
  useEffect(() => {
    if (!user) return;
    loadData();

    const channel = supabase
      .channel("messages-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        loadData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const [{ data: msgs }, { data: profile }] = await Promise.all([
      supabase.from("messages").select("*").order("created_at", { ascending: true }),
      supabase.from("profiles").select("user_type, subscription_tier").eq("id", user.id).maybeSingle(),
    ]);

    setUserProfile(profile);
    const allMessages = (msgs || []) as Message[];
    setMessages(allMessages);

    // Gather unique partner IDs
    const partnerIds = new Set<string>();
    const providerIds = new Set<string>();
    allMessages.forEach((m) => {
      const partnerId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      partnerIds.add(partnerId);
      if (m.provider_id) providerIds.add(m.provider_id);
    });

    // Fetch profiles
    if (partnerIds.size > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", [...partnerIds]);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.id] = p.full_name || "Unknown"; });
      setProfiles(map);
    }

    // Fetch provider tiers
    if (providerIds.size > 0) {
      const { data: provs } = await supabase.from("providers").select("id, user_id, subscription_tier").in("id", [...providerIds]);
      const tierMap: Record<string, string> = {};
      (provs || []).forEach((p: any) => { tierMap[p.user_id] = p.subscription_tier; });
      setProviderTiers(tierMap);
    }

    setLoading(false);
  };

  // Group messages into conversations
  const conversations = useMemo(() => {
    if (!user) return [];
    const map = new Map<string, ConversationPartner>();

    messages.forEach((m) => {
      const partnerId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      const existing = map.get(partnerId);
      const isNewer = !existing || new Date(m.created_at) > new Date(existing.lastTime);

      map.set(partnerId, {
        id: partnerId,
        name: profiles[partnerId] || "Unknown",
        lastMessage: isNewer ? m.body : existing!.lastMessage,
        lastTime: isNewer ? m.created_at : existing!.lastTime,
        unreadCount: (existing?.unreadCount || 0) + (!m.read && m.recipient_id === user.id ? 1 : 0),
        providerId: m.provider_id || existing?.providerId || null,
        providerTier: providerTiers[partnerId] || existing?.providerTier || null,
      });
    });

    return [...map.values()].sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime());
  }, [messages, profiles, providerTiers, user]);

  const activeConversation = useMemo(() => {
    if (!user || !selectedPartnerId) return [];
    return messages.filter(
      (m) =>
        (m.sender_id === user.id && m.recipient_id === selectedPartnerId) ||
        (m.sender_id === selectedPartnerId && m.recipient_id === user.id)
    );
  }, [messages, selectedPartnerId, user]);

  const selectedPartner = conversations.find((c) => c.id === selectedPartnerId);

  // Check if current user is a free pro viewing gated messages
  const isFreePro = userProfile?.user_type === "provider" && userProfile?.subscription_tier === "free";

  // Mark messages as read when opening conversation
  useEffect(() => {
    if (!user || !selectedPartnerId) return;
    const unreadIds = messages
      .filter((m) => m.recipient_id === user.id && m.sender_id === selectedPartnerId && !m.read)
      .map((m) => m.id);
    if (unreadIds.length > 0 && !isFreePro) {
      supabase.from("messages").update({ read: true }).in("id", unreadIds).then();
    }
  }, [selectedPartnerId, messages, user, isFreePro]);

  const handleSend = async () => {
    if (!user || !selectedPartnerId || !newMessage.trim()) return;
    setSending(true);

    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: selectedPartnerId,
      provider_id: selectedPartner?.providerId || null,
      body: newMessage.trim(),
    });

    if (error) {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    } else {
      setNewMessage("");
    }
    setSending(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="pt-24 pb-16 container mx-auto px-4 text-center">
          <p className="text-muted-foreground">Please log in to view your messages.</p>
          <Button asChild className="mt-4"><Link to="/auth">Log In</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="pt-24 pb-16 flex-1">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
              <ArrowLeft size={16} /> Back to Dashboard
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-extrabold text-foreground font-display">Messages</h1>
                <p className="text-muted-foreground text-sm mt-1">Communicate with service providers directly</p>
              </div>
              <Button asChild variant="outline" className="gap-2">
                <Link to="/search"><Search size={14} /> Find Local Pros</Link>
              </Button>
            </div>
          </div>

          {/* Free Pro upgrade banner */}
          {isFreePro && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6 flex items-start gap-3">
              <Crown size={20} className="text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">You have messages from potential clients!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Upgrade to a Pro subscription to view and respond to messages from homeowners looking for your services.
                </p>
                <Button size="sm" className="mt-3" asChild>
                  <Link to="/pro-pricing">Upgrade to Pro — $29/mo</Link>
                </Button>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-[320px_1fr] gap-4 min-h-[500px]">
            {/* Conversation list */}
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="p-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Conversations</h3>
              </div>
              <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                {loading ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">Loading...</div>
                ) : conversations.length === 0 ? (
                  <div className="p-6 text-center">
                    <MessageSquare size={32} className="mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No conversations yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Send a message to a pro from the Find Pros page</p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedPartnerId(conv.id)}
                      className={`w-full text-left p-3 hover:bg-secondary/50 transition-colors ${
                        selectedPartnerId === conv.id ? "bg-secondary" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground truncate">{conv.name}</span>
                        {conv.unreadCount > 0 && (
                          <span className="bg-primary text-primary-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {isFreePro ? "Message pending — upgrade to view" : conv.lastMessage}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(conv.lastTime), "MMM d, h:mm a")}</p>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Chat area */}
            <div className="border border-border rounded-xl bg-card flex flex-col overflow-hidden">
              {!selectedPartnerId ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  <div className="text-center">
                    <MessageSquare size={40} className="mx-auto mb-3 opacity-40" />
                    <p>Select a conversation to view messages</p>
                  </div>
                </div>
              ) : isFreePro ? (
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center max-w-sm">
                    <Crown size={48} className="mx-auto text-primary mb-4" />
                    <h3 className="font-bold text-lg text-foreground mb-2">Upgrade to View Messages</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      A homeowner has reached out about your services. Upgrade to Pro to read and respond to their message, and start connecting with potential clients.
                    </p>
                    <Button asChild>
                      <Link to="/pro-pricing">Upgrade Now — $29/mo</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="p-3 border-b border-border flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                      <User size={14} className="text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{selectedPartner?.name || "Unknown"}</p>
                      {selectedPartner?.providerTier && selectedPartner.providerTier !== "free" && (
                        <span className="text-[10px] text-primary font-medium">PRO</span>
                      )}
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px]">
                    {activeConversation.map((m) => {
                      const isMine = m.sender_id === user.id;
                      return (
                        <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                            isMine
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-foreground"
                          }`}>
                            <p>{m.body}</p>
                            <div className={`flex items-center gap-1 mt-1 text-[10px] ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                              <Clock size={9} />
                              {format(new Date(m.created_at), "h:mm a")}
                              {isMine && m.read && <CheckCheck size={10} className="ml-1" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Composer */}
                  <div className="p-3 border-t border-border">
                    <div className="flex gap-2">
                      <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="min-h-[44px] max-h-[120px] resize-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                      />
                      <Button
                        size="icon"
                        onClick={handleSend}
                        disabled={!newMessage.trim() || sending}
                        className="shrink-0 h-[44px] w-[44px]"
                      >
                        <Send size={16} />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Messages;
