import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Bot, Sparkles, FileText, AlertTriangle, Loader2, Copy, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ThreadMessage {
  sender_id: string;
  body: string;
  created_at?: string;
}

export default function MessageCopilot({
  thread,
  currentUserId,
  partnerName,
  onUseDraft,
  businessName,
}: {
  thread: ThreadMessage[];
  currentUserId: string;
  partnerName: string;
  onUseDraft: (text: string) => void;
  businessName?: string;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<null | "draft" | "summary" | "scope">(null);
  const [draft, setDraft] = useState("");
  const [summary, setSummary] = useState("");
  const [scope, setScope] = useState<any>(null);
  const [open, setOpen] = useState<null | "draft" | "summary" | "scope">(null);

  const formatted = thread.map(m => ({
    sender: m.sender_id === currentUserId ? "me" : partnerName,
    body: m.body,
    created_at: m.created_at,
  }));

  const run = async (mode: "draft_reply" | "summarize" | "scope_check") => {
    if (!thread.length) {
      toast({ title: "No messages yet", description: "Get a message first.", variant: "destructive" });
      return;
    }
    const key = mode === "draft_reply" ? "draft" : mode === "summarize" ? "summary" : "scope";
    setLoading(key);
    try {
      const latest = thread.filter(m => m.sender_id !== currentUserId).slice(-1)[0]?.body || "";
      const { data, error } = await supabase.functions.invoke("message-copilot", {
        body: { mode, thread: formatted, latestMessage: latest, businessName },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (mode === "draft_reply") { setDraft(data.content || ""); setOpen("draft"); }
      else if (mode === "summarize") { setSummary(data.content || ""); setOpen("summary"); }
      else { setScope(data.parsed || data.content); setOpen("scope"); }
    } catch (e: any) {
      toast({ title: "AI error", description: e.message || "Failed", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="border-t border-border bg-muted/30">
      <div className="px-3 py-2 flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1">
          <Bot size={12} className="text-primary" /> AI Co-pilot
        </span>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => run("draft_reply")} disabled={loading !== null}>
          {loading === "draft" ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          Draft reply
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => run("summarize")} disabled={loading !== null}>
          {loading === "summary" ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
          Summarize
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => run("scope_check")} disabled={loading !== null}>
          {loading === "scope" ? <Loader2 size={12} className="animate-spin" /> : <AlertTriangle size={12} />}
          Scope check
        </Button>
      </div>

      {open === "draft" && draft && (
        <div className="px-3 pb-3">
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-primary inline-flex items-center gap-1"><Sparkles size={12} /> Suggested reply</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setOpen(null)}><X size={12} /></Button>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap mb-2">{draft}</p>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { navigator.clipboard.writeText(draft); toast({ title: "Copied" }); }}>
                <Copy size={12} /> Copy
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={() => { onUseDraft(draft); setOpen(null); }}>
                Use this
              </Button>
            </div>
          </div>
        </div>
      )}

      {open === "summary" && summary && (
        <div className="px-3 pb-3">
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground inline-flex items-center gap-1"><FileText size={12} /> Thread summary</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setOpen(null)}><X size={12} /></Button>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{summary}</p>
          </div>
        </div>
      )}

      {open === "scope" && scope && (
        <div className="px-3 pb-3">
          <div className={`rounded-lg border p-3 ${scope?.scope_creep ? "border-orange-500/40 bg-orange-500/5" : "border-border bg-card"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground inline-flex items-center gap-1">
                <AlertTriangle size={12} className={scope?.scope_creep ? "text-orange-500" : "text-muted-foreground"} />
                {scope?.scope_creep ? "Scope creep detected" : "Scope looks clean"}
              </span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setOpen(null)}><X size={12} /></Button>
            </div>
            {Array.isArray(scope?.added_items) && scope.added_items.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-medium text-foreground">Added items:</p>
                <ul className="text-xs text-muted-foreground list-disc ml-4">
                  {scope.added_items.map((s: string, i: number) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {Array.isArray(scope?.flags) && scope.flags.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-medium text-foreground">Flags:</p>
                <ul className="text-xs text-muted-foreground list-disc ml-4">
                  {scope.flags.map((s: string, i: number) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {scope?.advice && <p className="text-xs text-foreground bg-muted/50 rounded p-2 mt-2">{scope.advice}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
