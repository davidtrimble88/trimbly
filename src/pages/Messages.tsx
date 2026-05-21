import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, MessageSquare, Send, Crown, Clock, CheckCheck, User, Search, Globe,
  Trash2, ShieldBan, MoreVertical, MessageCircle, AlertCircle, Bot, Flag
} from "lucide-react";
import ReportDialog from "@/components/ReportDialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { AIFeedback } from "@/components/messages/AIFeedback";
import MessageCopilot from "@/components/messages/MessageCopilot";
import { EmptyState } from "@/components/EmptyState";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  provider_id: string | null;
  subject: string;
  body: string;
  read: boolean;
  created_at: string;
  contact_message_id?: string | null;
  ai_meta?: { kind?: string; awaiting_feedback?: boolean; attempt?: number; confidence?: number; user_marked_helpful?: boolean } | null;
}

interface PendingMessage {
  id: string;
  sender_id: string;
  provider_name: string;
  provider_category: string;
  provider_city: string;
  provider_state: string;
  provider_country: string;
  provider_phone: string | null;
  provider_website: string | null;
  subject: string;
  body: string;
  status: string;
  created_at: string;
}

type ChatStatus = "active" | "pending" | "blocked";

interface ConversationPartner {
  id: string;
  name: string;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
  providerId: string | null;
  providerTier: string | null;
  isPending?: boolean;
  pendingCategory?: string;
  pendingLocation?: string;
  chatStatus: ChatStatus;
}

const statusConfig: Record<ChatStatus, { label: string; color: string; icon: typeof MessageCircle }> = {
  active: { label: "Active", color: "bg-green-500/15 text-green-700 dark:text-green-400", icon: MessageCircle },
  pending: { label: "Pending", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400", icon: Clock },
  blocked: { label: "Blocked", color: "bg-destructive/15 text-destructive", icon: ShieldBan },
};

const Messages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [providerTiers, setProviderTiers] = useState<Record<string, string>>({});
  const [blockedNames, setBlockedNames] = useState<Set<string>>(new Set());
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(searchParams.get("partner"));
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{ user_type: string; subscription_tier: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConversationPartner | null>(null);
  const [blockTarget, setBlockTarget] = useState<ConversationPartner | null>(null);

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

    const [{ data: msgs }, { data: profile }, { data: pending }, { data: blocks }] = await Promise.all([
      supabase.from("messages").select("*").order("created_at", { ascending: true }),
      supabase.from("profiles").select("user_type, subscription_tier").eq("id", user.id).maybeSingle(),
      supabase.from("pending_messages").select("*").eq("sender_id", user.id).order("created_at", { ascending: true }),
      supabase.from("blocked_providers").select("*").eq("user_id", user.id),
    ]);

    setUserProfile(profile);
    setMessages((msgs || []) as Message[]);
    setPendingMessages((pending || []) as PendingMessage[]);

    const bNames = new Set<string>();
    const bIds = new Set<string>();
    (blocks || []).forEach((b: any) => {
      if (b.provider_name) bNames.add(b.provider_name);
      if (b.provider_user_id) bIds.add(b.provider_user_id);
    });
    setBlockedNames(bNames);
    setBlockedUserIds(bIds);

    const allMessages = (msgs || []) as Message[];
    const partnerIds = new Set<string>();
    const providerIds = new Set<string>();
    allMessages.forEach((m) => {
      const partnerId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      partnerIds.add(partnerId);
      if (m.provider_id) providerIds.add(m.provider_id);
    });

    if (partnerIds.size > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", [...partnerIds]);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.id] = p.full_name || "Unknown"; });
      setProfiles(map);
    }

    if (providerIds.size > 0) {
      const { data: provs } = await supabase.from("providers").select("id, user_id, subscription_tier").in("id", [...providerIds]);
      const tierMap: Record<string, string> = {};
      (provs || []).forEach((p: any) => { tierMap[p.user_id] = p.subscription_tier; });
      setProviderTiers(tierMap);
    }

    setLoading(false);
  };

  const pendingConversations = useMemo(() => {
    const map = new Map<string, ConversationPartner>();
    pendingMessages.forEach((pm) => {
      const key = `pending-${pm.provider_name}`;
      const existing = map.get(key);
      const isNewer = !existing || new Date(pm.created_at) > new Date(existing.lastTime);
      const location = [pm.provider_city, pm.provider_state].filter(Boolean).join(", ");
      const isBlocked = blockedNames.has(pm.provider_name);

      map.set(key, {
        id: key,
        name: pm.provider_name,
        lastMessage: isNewer ? pm.body : existing!.lastMessage,
        lastTime: isNewer ? pm.created_at : existing!.lastTime,
        unreadCount: 0,
        providerId: null,
        providerTier: null,
        isPending: true,
        pendingCategory: pm.provider_category,
        pendingLocation: location,
        chatStatus: isBlocked ? "blocked" : "pending",
      });
    });
    return [...map.values()];
  }, [pendingMessages, blockedNames]);

  const regularConversations = useMemo(() => {
    if (!user) return [];
    const map = new Map<string, ConversationPartner>();
    messages.forEach((m) => {
      const partnerId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      const existing = map.get(partnerId);
      const isNewer = !existing || new Date(m.created_at) > new Date(existing.lastTime);
      const isBlocked = blockedUserIds.has(partnerId);

      map.set(partnerId, {
        id: partnerId,
        name: profiles[partnerId] || "Unknown",
        lastMessage: isNewer ? m.body : existing!.lastMessage,
        lastTime: isNewer ? m.created_at : existing!.lastTime,
        unreadCount: (existing?.unreadCount || 0) + (!m.read && m.recipient_id === user.id ? 1 : 0),
        providerId: m.provider_id || existing?.providerId || null,
        providerTier: providerTiers[partnerId] || existing?.providerTier || null,
        chatStatus: isBlocked ? "blocked" : "active",
      });
    });
    return [...map.values()];
  }, [messages, profiles, providerTiers, user, blockedUserIds]);

  const conversations = useMemo(() => {
    return [...regularConversations, ...pendingConversations]
      .sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime());
  }, [regularConversations, pendingConversations]);

  const activeConversation = useMemo(() => {
    if (!user || !selectedPartnerId) return [];
    if (selectedPartnerId.startsWith("pending-")) {
      const providerName = selectedPartnerId.replace("pending-", "");
      return pendingMessages
        .filter((pm) => pm.provider_name === providerName)
        .map((pm) => ({
          id: pm.id, sender_id: pm.sender_id, recipient_id: "pending",
          provider_id: null, subject: pm.subject, body: pm.body, read: false, created_at: pm.created_at,
        }));
    }
    return messages.filter(
      (m) => (m.sender_id === user.id && m.recipient_id === selectedPartnerId) ||
             (m.sender_id === selectedPartnerId && m.recipient_id === user.id)
    );
  }, [messages, pendingMessages, selectedPartnerId, user]);

  const selectedPartner = conversations.find((c) => c.id === selectedPartnerId);
  const isFreePro = userProfile?.user_type === "provider" && userProfile?.subscription_tier === "free";
  const isPendingConversation = selectedPartnerId?.startsWith("pending-");

  useEffect(() => {
    if (!user || !selectedPartnerId || isPendingConversation) return;
    const unreadIds = messages
      .filter((m) => m.recipient_id === user.id && m.sender_id === selectedPartnerId && !m.read)
      .map((m) => m.id);
    if (unreadIds.length > 0 && !isFreePro) {
      supabase.from("messages").update({ read: true }).in("id", unreadIds).then();
    }
  }, [selectedPartnerId, messages, user, isFreePro, isPendingConversation]);

  const handleSend = async () => {
    if (!user || !selectedPartnerId || !newMessage.trim() || isPendingConversation) return;
    if (selectedPartner?.chatStatus === "blocked") return;
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

  const handleDeleteConversation = async (conv: ConversationPartner) => {
    if (!user) return;

    if (conv.isPending) {
      const providerName = conv.id.replace("pending-", "");
      const ids = pendingMessages.filter((pm) => pm.provider_name === providerName).map((pm) => pm.id);
      if (ids.length > 0) {
        await supabase.from("pending_messages").delete().in("id", ids);
      }
    } else {
      const ids = messages
        .filter((m) => (m.sender_id === user.id && m.recipient_id === conv.id) || (m.sender_id === conv.id && m.recipient_id === user.id))
        .map((m) => m.id);
      if (ids.length > 0) {
        await supabase.from("messages").delete().in("id", ids);
      }
    }

    if (selectedPartnerId === conv.id) setSelectedPartnerId(null);
    toast({ title: "Conversation deleted" });
    loadData();
  };

  const handleBlockProvider = async (conv: ConversationPartner) => {
    if (!user) return;

    if (conv.isPending) {
      const providerName = conv.id.replace("pending-", "");
      await supabase.from("blocked_providers").insert({
        user_id: user.id,
        provider_name: providerName,
      });
    } else {
      await supabase.from("blocked_providers").insert({
        user_id: user.id,
        provider_user_id: conv.id,
      });
    }

    toast({ title: "Provider blocked", description: `${conv.name} has been blocked.` });
    loadData();
  };

  const handleUnblock = async (conv: ConversationPartner) => {
    if (!user) return;

    if (conv.isPending) {
      const providerName = conv.id.replace("pending-", "");
      await supabase.from("blocked_providers").delete().eq("user_id", user.id).eq("provider_name", providerName);
    } else {
      await supabase.from("blocked_providers").delete().eq("user_id", user.id).eq("provider_user_id", conv.id);
    }

    toast({ title: "Provider unblocked" });
    loadData();
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

  const StatusBadge = ({ status, large }: { status: ChatStatus; large?: boolean }) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    if (large) {
      return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md ${config.color}`}>
          <Icon size={13} />
          {config.label}
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${config.color}`}>
        <Icon size={11} />
        {config.label}
      </span>
    );
  };

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
                <p className="text-muted-foreground text-sm mt-1">Partner param: {searchParams.get("partner") || "none"}</p>
              </div>
              <Button asChild className="gap-2">
                <Link to="/search"><Search size={14} /> Find Local Pros</Link>
              </Button>
            </div>
          </div>

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
                  <EmptyState
                    icon={MessageSquare}
                    title="No conversations yet"
                    description="Reach out to a local pro to start a conversation. Replies will show up here."
                    actionLabel="Find a Pro to Message"
                    actionHref="/search"
                  />
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`relative group flex items-start transition-colors ${
                        selectedPartnerId === conv.id ? "bg-secondary" : "hover:bg-secondary/50"
                      }`}
                    >
                      <button
                        onClick={() => setSelectedPartnerId(conv.id)}
                        className="flex-1 text-left p-3 min-w-0"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5 truncate">
                            {conv.isPending && <Globe size={12} className="text-muted-foreground shrink-0" />}
                            <span className="text-sm font-medium text-foreground truncate">{conv.name}</span>
                          </div>
                          {conv.unreadCount > 0 && (
                            <span className="bg-primary text-primary-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 ml-1">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {isFreePro ? "Message pending — upgrade to view" : conv.lastMessage}
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <StatusBadge status={conv.chatStatus} large />
                          <p className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                            {format(new Date(conv.lastTime), "MMM d, h:mm a")}
                          </p>
                        </div>
                        <p className="text-[11px] font-semibold text-foreground/80 mt-1">
                          Status: {statusConfig[conv.chatStatus].label}
                        </p>
                      </button>

                      {/* Actions dropdown */}
                      <div className="p-2 pt-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical size={14} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {conv.chatStatus === "blocked" ? (
                              <DropdownMenuItem onClick={() => handleUnblock(conv)} className="gap-2">
                                <ShieldBan size={14} /> Unblock {conv.name}
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => setBlockTarget(conv)}
                                className="gap-2 text-destructive focus:text-destructive"
                              >
                                <ShieldBan size={14} /> Block {conv.name}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(conv)}
                              className="gap-2 text-destructive focus:text-destructive"
                            >
                              <Trash2 size={14} /> Delete Conversation
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
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
                      A homeowner has reached out about your services. Upgrade to Pro to read and respond to their message.
                    </p>
                    <Button asChild>
                      <Link to="/pro-pricing">Upgrade Now — $29/mo</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="p-3 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        {isPendingConversation ? (
                          <Globe size={14} className="text-muted-foreground" />
                        ) : (
                          <User size={14} className="text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{selectedPartner?.name || "Unknown"}</p>
                          {selectedPartner && <StatusBadge status={selectedPartner.chatStatus} large />}
                        </div>
                        {isPendingConversation ? (
                          <div className="flex items-center gap-2">
                            {selectedPartner?.pendingCategory && (
                              <span className="text-[10px] text-muted-foreground">{selectedPartner.pendingCategory}</span>
                            )}
                            {selectedPartner?.pendingLocation && (
                              <span className="text-[10px] text-muted-foreground">· {selectedPartner.pendingLocation}</span>
                            )}
                          </div>
                        ) : selectedPartner?.providerTier && selectedPartner.providerTier !== "free" ? (
                          <span className="text-[10px] text-primary font-medium">PRO</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Pending banner */}
                  {isPendingConversation && selectedPartner?.chatStatus !== "blocked" && (
                    <div className="px-4 py-2 bg-muted/50 border-b border-border flex items-start gap-2">
                      <Clock size={12} className="text-muted-foreground mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        This provider isn't on Trimbly yet. We'll notify them about your message and invite them to join.
                      </p>
                    </div>
                  )}

                  {/* Blocked banner */}
                  {selectedPartner?.chatStatus === "blocked" && (
                    <div className="px-4 py-2 bg-destructive/10 border-b border-border flex items-center justify-between">
                      <div className="flex items-start gap-2">
                        <AlertCircle size={12} className="text-destructive mt-0.5 shrink-0" />
                        <p className="text-xs text-destructive">You have blocked this provider.</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => selectedPartner && handleUnblock(selectedPartner)}
                      >
                        Unblock
                      </Button>
                    </div>
                  )}

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px]">
                    {activeConversation.map((m) => {
                      const isMine = m.sender_id === user.id;
                      const msg = m as Message;
                      const isAI = msg.ai_meta?.kind === "ai_reply";
                      const isAIEscalation = msg.ai_meta?.kind === "escalation_notice";
                      const awaitingFeedback = isAI && msg.ai_meta?.awaiting_feedback;
                      return (
                        <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                            isMine ? "bg-primary text-primary-foreground" :
                            isAI ? "bg-accent/40 text-foreground border border-accent" :
                            "bg-secondary text-foreground"
                          }`}>
                            {(isAI || isAIEscalation) && (
                              <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-semibold text-primary uppercase tracking-wide">
                                <Bot size={11} /> Trimbly AI
                              </div>
                            )}
                            <p className="whitespace-pre-wrap">{m.body}</p>
                            <div className={`flex items-center gap-1 mt-1 text-[10px] ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                              <Clock size={9} />
                              {format(new Date(m.created_at), "h:mm a")}
                              {isMine && m.read && <CheckCheck size={10} className="ml-1" />}
                              {!isMine && !isAI && !isAIEscalation && (
                                <ReportDialog
                                  targetType="message"
                                  targetId={m.id}
                                  trigger={<button className="ml-1 text-muted-foreground/60 hover:text-foreground" aria-label="Report message"><Flag size={9} /></button>}
                                />
                              )}
                            </div>
                            {awaitingFeedback && msg.contact_message_id && (
                              <AIFeedback
                                messageId={msg.id}
                                contactMessageId={msg.contact_message_id}
                                attempt={msg.ai_meta?.attempt ?? 1}
                                maxAttempts={3}
                                onResolved={loadData}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* AI Co-pilot */}
                  {!isPendingConversation && selectedPartner?.chatStatus !== "blocked" && activeConversation.length > 0 && user && (
                    <MessageCopilot
                      thread={activeConversation.map(m => ({ sender_id: m.sender_id, body: m.body, created_at: m.created_at }))}
                      currentUserId={user.id}
                      partnerName={selectedPartner?.name || "homeowner"}
                      onUseDraft={(text) => setNewMessage(text)}
                    />
                  )}
                  {/* Composer */}
                  <div className="p-3 border-t border-border">
                    {selectedPartner?.chatStatus === "blocked" ? (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        Unblock {selectedPartner.name} to send messages.
                      </p>
                    ) : isPendingConversation ? (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        You'll be able to continue this conversation once {selectedPartner?.name} joins Trimbly.
                      </p>
                    ) : (
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
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove all messages with {deleteTarget?.name}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteTarget) { handleDeleteConversation(deleteTarget); setDeleteTarget(null); } }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block confirmation dialog */}
      <AlertDialog open={!!blockTarget} onOpenChange={(open) => !open && setBlockTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {blockTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              You won't receive any more messages from {blockTarget?.name} and won't be able to send them messages. You can unblock them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (blockTarget) { handleBlockProvider(blockTarget); setBlockTarget(null); } }}
            >
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Messages;
