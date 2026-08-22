import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useHomeLimit } from "@/hooks/useHomeLimit";
import { useGarageSubscription } from "@/hooks/useGarageSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardShell from "@/components/dashboard/DashboardShell";
import UpgradeGate from "@/components/dashboard/UpgradeGate";
import { buildHomeownerSatelliteNavItems, homeownerNavGroups } from "@/components/dashboard/homeowner/navItems";
import { tierLabels } from "@/components/dashboard/homeowner/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield, Upload, FileText, Trash2, Send, Bot, User, Crown, MessageSquare, Loader2, Home,
} from "lucide-react";

type CoverageDoc = {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  created_at: string;
  home_id: string | null;
};

type ChatMessage = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coverage-chat`;

async function streamChat(
  messages: ChatMessage[],
  documentContents: string,
  onDelta: (t: string) => void,
  onDone: () => void
) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, documentContents }),
  });
  if (!resp.ok || !resp.body) throw new Error("Failed to start stream");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let done = false;

  while (!done) {
    const { done: rd, value } = await reader.read();
    if (rd) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { done = true; break; }
      try {
        const p = JSON.parse(json);
        const c = p.choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch { buf = line + "\n" + buf; break; }
    }
  }
  onDone();
}

const CoverageAdvisor = () => {
  const { user, profileName, loading: authLoading } = useAuth();
  const { isPro, subscriptionTier, loading: tierLoading } = useHomeLimit();
  const { active: hasGarage } = useGarageSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [docs, setDocs] = useState<CoverageDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [docContents, setDocContents] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading]);

  // Load documents
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingDocs(true);
      const { data, error } = await supabase
        .from("coverage_documents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setLoadingDocs(false);
        return;
      }
      setDocs((data as CoverageDoc[]) || []);
      setLoadingDocs(false);
    })();
  }, [user]);

  // Build document context for the AI: real extracted text for plain-text files,
  // an honest "content not available" note for anything we can't parse client-side
  // (PDF/image/doc) so the model doesn't invent coverage figures for files it never read.
  useEffect(() => {
    if (docs.length === 0) { setDocContents(""); return; }
    let cancelled = false;
    (async () => {
      const parts = await Promise.all(docs.map(async (d) => {
        const header = `[${d.document_type.toUpperCase()}] ${d.file_name} (uploaded ${new Date(d.created_at).toLocaleDateString()})`;
        const isPlainText = /\.(txt|md)$/i.test(d.file_name);
        if (!isPlainText) {
          return `${header}\nContent not available — this file type can't be read yet. Only the file name and upload date are known; do not guess or invent coverage figures from it.`;
        }
        try {
          const pathParts = d.file_url.split("/coverage-docs/");
          const storagePath = pathParts.length > 1 ? pathParts[1] : d.file_url;
          const { data: signed } = await supabase.storage.from("coverage-docs").createSignedUrl(storagePath, 60);
          if (!signed?.signedUrl) throw new Error("no signed url");
          const res = await fetch(signed.signedUrl);
          if (!res.ok) throw new Error("fetch failed");
          const text = (await res.text()).slice(0, 20_000);
          return `${header}\n${text}`;
        } catch {
          return `${header}\nContent not available — could not load this file's text. Do not guess or invent coverage figures from it.`;
        }
      }));
      if (!cancelled) setDocContents(parts.join("\n\n"));
    })();
    return () => { cancelled = true; };
  }, [docs]);

  // Auto-scroll chat
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 20MB per file.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const path = `${user.id}/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("coverage-docs").upload(path, file);
    if (uploadErr) {
      toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("coverage-docs").getPublicUrl(path);
    const { error: dbErr } = await supabase.from("coverage_documents").insert({
      user_id: user.id,
      document_type: docType,
      file_name: file.name,
      file_url: urlData.publicUrl || path,
      file_size: file.size,
    });
    if (dbErr) {
      toast({ title: "Save failed", description: dbErr.message, variant: "destructive" });
    } else {
      toast({ title: "Uploaded", description: `${file.name} added successfully.` });
      // Refresh
      const { data, error: refreshErr } = await supabase.from("coverage_documents").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (refreshErr) {
        toast({ title: "Error", description: refreshErr.message, variant: "destructive" });
      } else {
        setDocs((data as CoverageDoc[]) || []);
      }
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleDelete = async (doc: CoverageDoc) => {
    const pathParts = doc.file_url.split("/coverage-docs/");
    const storagePath = pathParts.length > 1 ? pathParts[1] : doc.file_url;
    await supabase.storage.from("coverage-docs").remove([storagePath]);
    await supabase.from("coverage_documents").delete().eq("id", doc.id);
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    toast({ title: "Deleted", description: `${doc.file_name} removed.` });
  };

  const sendMessage = async () => {
    if (!input.trim() || streaming) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);

    let assistantText = "";
    const upsert = (chunk: string) => {
      assistantText += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantText } : m));
        }
        return [...prev, { role: "assistant", content: assistantText }];
      });
    };

    try {
      await streamChat([...messages, userMsg], docContents, upsert, () => setStreaming(false));
    } catch {
      toast({ title: "Chat error", description: "Could not get AI response.", variant: "destructive" });
      setStreaming(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const displayName = profileName || user.user_metadata?.full_name || user.email;
  const navItems = buildHomeownerSatelliteNavItems(hasGarage);

  return (
    <DashboardShell
      brandLabel="My Home"
      navItems={navItems}
      groups={homeownerNavGroups}
      activeItemId="coverage"
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
      <div className="max-w-6xl">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-foreground font-display">Coverage Advisor</h1>
            <p className="text-muted-foreground">Upload your warranty & insurance documents, then ask AI about your coverage.</p>
          </div>
        </div>

        {tierLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-64 lg:col-span-1" />
            <Skeleton className="h-[600px] lg:col-span-2" />
          </div>
        ) : (
        <UpgradeGate
          hasAccess={isPro}
          featureName="Coverage Advisor"
          description="Upload your home warranty & insurance docs and ask AI about your coverage."
          benefits={["Upload warranty & insurance documents", "AI-powered coverage Q&A", "Instant answers on deductibles & exclusions"]}
          pricingRoute="/#pricing"
          icon={Crown}
        >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Documents */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Upload className="h-5 w-5" /> Upload Documents
                </CardTitle>
                <CardDescription>Add your home warranty or insurance policy</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Home Warranty</label>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                    onChange={(e) => handleUpload(e, "warranty")}
                    disabled={uploading}
                    className="cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Insurance Policy</label>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                    onChange={(e) => handleUpload(e, "insurance")}
                    disabled={uploading}
                    className="cursor-pointer"
                  />
                </div>
                {uploading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" /> Your Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingDocs ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : docs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {docs.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 shrink-0 text-primary" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{doc.file_name}</p>
                            <Badge variant="outline" className="text-xs capitalize">{doc.document_type}</Badge>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(doc)} className="shrink-0">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: AI Chat */}
          <div className="lg:col-span-2">
            <Card className="flex flex-col h-[600px]">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" /> Coverage AI Chat
                </CardTitle>
                <CardDescription>Ask questions about your warranty and insurance coverage</CardDescription>
              </CardHeader>
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <Bot className="h-12 w-12 text-muted-foreground mb-3" />
                    <h3 className="font-semibold text-lg mb-1">Coverage Advisor AI</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      {docs.length === 0
                        ? "Upload your warranty or insurance documents first, then ask me anything about your coverage."
                        : "I can see your uploaded documents. Ask me about your coverage, deductibles, exclusions, or claims process!"}
                    </p>
                    {docs.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {["What does my warranty cover?", "What's my insurance deductible?", "What's excluded from coverage?"].map((q) => (
                          <Button key={q} variant="outline" size="sm" className="block w-full" onClick={() => { setInput(q); }}>
                            {q}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg, i) => (
                      <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        {msg.role === "assistant" && (
                          <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}>
                          {msg.content}
                        </div>
                        {msg.role === "user" && (
                          <div className="shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                            <User className="h-4 w-4 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                    {streaming && messages[messages.length - 1]?.role !== "assistant" && (
                      <div className="flex gap-3">
                        <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div className="bg-muted rounded-xl px-4 py-3">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask about your coverage..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    disabled={streaming}
                  />
                  <Button onClick={sendMessage} disabled={streaming || !input.trim()} size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
        </UpgradeGate>
        )}
      </div>
    </DashboardShell>
  );
};

export default CoverageAdvisor;
