import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Trash2, CheckCircle2, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type ErrorLog = {
  id: string;
  message: string;
  stack: string | null;
  source: string;
  severity: string;
  url: string | null;
  route: string | null;
  component: string | null;
  user_id: string | null;
  metadata: any;
  status: string;
  ai_suggestion: string | null;
  created_at: string;
};

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  new: "destructive",
  triaged: "default",
  resolved: "secondary",
  ignored: "outline",
};

export default function StaffErrors() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [triagingId, setTriagingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("error_logs").select("*").order("created_at", { ascending: false }).limit(500);
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setLogs((data ?? []) as ErrorLog[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  const triage = async (id: string) => {
    setTriagingId(id);
    try {
      const { data, error } = await supabase.functions.invoke("triage-error", { body: { error_id: id } });
      if (error) throw error;
      toast.success("AI suggestion ready");
      setLogs((prev) => prev.map((l) => l.id === id ? { ...l, ai_suggestion: data.suggestion, status: "triaged" } : l));
    } catch (e: any) {
      toast.error(e.message ?? "Failed to triage");
    } finally {
      setTriagingId(null);
    }
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("error_logs")
      .update({ status, resolved_at: status === "resolved" ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) return toast.error(error.message);
    setLogs((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("error_logs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setLogs((prev) => prev.filter((l) => l.id !== id));
  };

  const stats = {
    total: logs.length,
    new: logs.filter((l) => l.status === "new").length,
    triaged: logs.filter((l) => l.status === "triaged").length,
    resolved: logs.filter((l) => l.status === "resolved").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Error Logs</h1>
          <p className="text-sm text-muted-foreground">Runtime errors captured from users' browsers.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="triaged">Triaged</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="ignored">Ignored</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total },
          { label: "New", value: stats.new },
          { label: "Triaged", value: stats.triaged },
          { label: "Resolved", value: stats.resolved },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
              <p className="font-display text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : logs.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-sm text-muted-foreground">No errors logged. 🎉</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm font-mono break-words flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      {log.message}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2 flex-wrap text-xs text-muted-foreground">
                      <Badge variant={statusVariant[log.status] ?? "outline"}>{log.status}</Badge>
                      <Badge variant="outline">{log.source}</Badge>
                      {log.route && <span className="font-mono">{log.route}</span>}
                      <span>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" disabled={triagingId === log.id} onClick={() => triage(log.id)}>
                      <Sparkles className="h-4 w-4 mr-1" />
                      {triagingId === log.id ? "Analyzing..." : log.ai_suggestion ? "Re-analyze" : "Suggest fix"}
                    </Button>
                    {log.status !== "resolved" && (
                      <Button size="sm" variant="ghost" onClick={() => setStatus(log.id, "resolved")}>
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => remove(log.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {log.stack && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Stack trace</summary>
                    <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto whitespace-pre-wrap text-[11px]">{log.stack}</pre>
                  </details>
                )}
                {log.ai_suggestion && (
                  <div className="border border-primary/20 bg-primary/5 rounded p-3">
                    <p className="text-xs font-semibold mb-1 flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI Suggestion</p>
                    <p className="text-xs whitespace-pre-wrap">{log.ai_suggestion}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
