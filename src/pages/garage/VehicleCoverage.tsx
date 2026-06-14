import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Shield, Upload, FileText, Trash2, Send, Bot, User, MessageSquare, Loader2, Car,
} from "lucide-react";

type CoverageDoc = {
  id: string;
  document_type: string;
  provider_name: string | null;
  policy_number: string | null;
  file_name: string;
  file_url: string;
  created_at: string;
  vehicle_id: string | null;
  notes: string | null;
};

type Vehicle = { id: string; nickname: string | null; make: string; model: string; year: number | null; vehicle_type: string | null };

type ChatMessage = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vehicle-coverage-chat`;

const DOC_LABELS: Record<string, string> = {
  insurance: "Auto Insurance",
  warranty: "Manufacturer Warranty",
  extended_warranty: "Extended Warranty",
  service_contract: "Service Contract",
};

async function streamChat(
  messages: ChatMessage[],
  documentContents: string,
  vehicleContext: string,
  onDelta: (t: string) => void,
  onDone: () => void
) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, documentContents, vehicleContext }),
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

export default function VehicleCoverage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [docs, setDocs] = useState<CoverageDoc[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);

  // Upload form fields
  const [uploadType, setUploadType] = useState<string>("insurance");
  const [uploadVehicle, setUploadVehicle] = useState<string>("none");
  const [providerName, setProviderName] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string>("none");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingDocs(true);
      const [d, v] = await Promise.all([
        (supabase as any)
          .from("vehicle_coverage_documents")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("vehicles")
          .select("id, nickname, make, model, year, vehicle_type")
          .eq("owner_user_id", user.id),
      ]);
      setDocs((d.data as CoverageDoc[]) || []);
      setVehicles((v.data as Vehicle[]) || []);
      setLoadingDocs(false);
    })();
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const docContents = docs.length
    ? docs.map((d) => {
        const v = d.vehicle_id ? vehicles.find((x) => x.id === d.vehicle_id) : null;
        const vTag = v ? ` for ${v.year ?? ""} ${v.make} ${v.model}`.trim() : "";
        return `[${DOC_LABELS[d.document_type] || d.document_type.toUpperCase()}${vTag}] Provider: ${d.provider_name || "n/a"} | Policy #: ${d.policy_number || "n/a"} | File: ${d.file_name}${d.notes ? ` | Notes: ${d.notes}` : ""}`;
      }).join("\n")
    : "";

  const vehicleContext = selectedVehicle !== "none"
    ? (() => {
        const v = vehicles.find((x) => x.id === selectedVehicle);
        if (!v) return "";
        return `Vehicle in question: ${v.year ?? ""} ${v.make} ${v.model}${v.nickname ? ` (\"${v.nickname}\")` : ""} — type: ${v.vehicle_type || "auto"}.`;
      })()
    : "";

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 20MB per file.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const path = `${user.id}/coverage/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("vehicle-docs").upload(path, file);
    if (uploadErr) {
      toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { error: dbErr } = await (supabase as any).from("vehicle_coverage_documents").insert({
      user_id: user.id,
      vehicle_id: uploadVehicle === "none" ? null : uploadVehicle,
      document_type: uploadType,
      provider_name: providerName.trim() || null,
      policy_number: policyNumber.trim() || null,
      file_name: file.name,
      file_url: path,
      file_size: file.size,
    });
    if (dbErr) {
      toast({ title: "Save failed", description: dbErr.message, variant: "destructive" });
    } else {
      toast({ title: "Uploaded", description: `${file.name} added.` });
      setProviderName("");
      setPolicyNumber("");
      const { data } = await (supabase as any)
        .from("vehicle_coverage_documents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setDocs((data as CoverageDoc[]) || []);
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleView = async (doc: CoverageDoc) => {
    const { data, error } = await supabase.storage.from("vehicle-docs").createSignedUrl(doc.file_url, 60);
    if (error) return toast({ title: "Cannot open", description: error.message, variant: "destructive" });
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async (doc: CoverageDoc) => {
    await supabase.storage.from("vehicle-docs").remove([doc.file_url]);
    await (supabase as any).from("vehicle_coverage_documents").delete().eq("id", doc.id);
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    toast({ title: "Deleted", description: `${doc.file_name} removed.` });
  };

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || streaming) return;
    const userMsg: ChatMessage = { role: "user", content };
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
      await streamChat([...messages, userMsg], docContents, vehicleContext, upsert, () => setStreaming(false));
    } catch {
      toast({ title: "Chat error", description: "Could not get AI response.", variant: "destructive" });
      setStreaming(false);
    }
  };

  const examplePrompts = [
    "My alternator failed at 65k miles — is this covered and should I file a claim?",
    "Someone hit my parked car. Estimate is $3,200. Should I file with my insurance?",
    "Transmission is slipping on my 2021 Honda — write me a warranty claim statement.",
    "Hailstorm damaged my hood and roof. Help me file a comprehensive claim.",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Vehicle Coverage Advisor</h1>
          <p className="text-sm text-muted-foreground">
            Upload your auto insurance & warranty docs, describe what happened, and AI will tell you what's covered,
            write a strong claim, and weigh the pros &amp; cons of filing.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Documents */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="h-5 w-5" /> Upload Coverage
              </CardTitle>
              <CardDescription>Insurance, warranty, or service contract</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-medium">Document type</label>
                <Select value={uploadType} onValueChange={setUploadType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOC_LABELS).map(([k, l]) => (
                      <SelectItem key={k} value={k}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">Vehicle (optional)</label>
                <Select value={uploadVehicle} onValueChange={setUploadVehicle}>
                  <SelectTrigger><SelectValue placeholder="Any vehicle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Any / all vehicles</SelectItem>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.year ?? ""} {v.make} {v.model}{v.nickname ? ` (${v.nickname})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                placeholder="Provider / carrier (e.g., GEICO)"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
              />
              <Input
                placeholder="Policy / contract # (optional)"
                value={policyNumber}
                onChange={(e) => setPolicyNumber(e.target.value)}
              />
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                onChange={handleUpload}
                disabled={uploading}
                className="cursor-pointer"
              />
              {uploading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
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
                      <button onClick={() => handleView(doc)} className="flex items-center gap-2 min-w-0 text-left flex-1">
                        <FileText className="h-4 w-4 shrink-0 text-primary" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{doc.file_name}</p>
                          <div className="flex gap-1 flex-wrap mt-0.5">
                            <Badge variant="outline" className="text-xs">{DOC_LABELS[doc.document_type] || doc.document_type}</Badge>
                            {doc.provider_name && <Badge variant="secondary" className="text-xs">{doc.provider_name}</Badge>}
                          </div>
                        </div>
                      </button>
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
          <Card className="flex flex-col h-[640px]">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" /> Claim Advisor AI
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                    <SelectTrigger className="h-8 w-[200px] text-xs"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No specific vehicle</SelectItem>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.year ?? ""} {v.make} {v.model}{v.nickname ? ` (${v.nickname})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <CardDescription>
                Describe what happened to your vehicle. AI will check coverage, draft your claim, and weigh whether to file.
              </CardDescription>
            </CardHeader>
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <Bot className="h-12 w-12 text-muted-foreground mb-3" />
                  <h3 className="font-semibold text-lg mb-1">Vehicle Claim Advisor</h3>
                  <p className="text-sm text-muted-foreground max-w-md mb-4">
                    {docs.length === 0
                      ? "Upload your auto insurance policy or vehicle warranty first, then describe the issue."
                      : "Tell me what's wrong with your vehicle. I'll check your policies, write the claim for you, and tell you if filing is worth it."}
                  </p>
                  {docs.length > 0 && (
                    <div className="grid gap-2 w-full max-w-md">
                      {examplePrompts.map((q) => (
                        <Button key={q} variant="outline" size="sm" className="text-left h-auto whitespace-normal py-2" onClick={() => sendMessage(q)}>
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
                      <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${
                        msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
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
                  placeholder="Describe what happened to your vehicle…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  disabled={streaming}
                />
                <Button onClick={() => sendMessage()} disabled={streaming || !input.trim()} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
