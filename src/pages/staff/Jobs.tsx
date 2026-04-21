import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { logActivity } from "./activityLog";

interface Job {
  id: string;
  title: string;
  category: string;
  city: string;
  state: string;
  status: string;
  description: string | null;
  homeowner_id: string;
  provider_id: string | null;
  created_at: string;
}

const STATUSES = ["pending", "open", "in_progress", "completed", "cancelled", "disputed"];

const Jobs = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [bidsByJob, setBidsByJob] = useState<Record<string, number>>({});

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from("jobs").select("*").order("created_at", { ascending: false });
    const list = (data as Job[]) || [];
    setJobs(list);
    if (list.length > 0) {
      const { data: bids } = await supabase.from("job_bids").select("job_id").in("job_id", list.map((j) => j.id));
      const counts: Record<string, number> = {};
      (bids || []).forEach((b: any) => { counts[b.job_id] = (counts[b.job_id] || 0) + 1; });
      setBidsByJob(counts);
    }
  };

  const filtered = jobs.filter((j) => filter === "all" || j.status === filter);

  const updateStatus = async (job: Job, status: string) => {
    if (!user) return;
    const { error } = await supabase.from("jobs").update({ status }).eq("id", job.id);
    if (error) { toast.error(error.message); return; }
    await logActivity(user.id, "job_status_changed", "job", job.id, { from: job.status, to: status });
    toast.success("Status updated");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {["all", ...STATUSES].map((s) => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}
            {s !== "all" && <span className="ml-1 opacity-70">({jobs.filter((j) => j.status === s).length})</span>}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((j) => (
          <Card key={j.id}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-start gap-3 min-w-0">
                  <Briefcase className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{j.title}</h3>
                    <p className="text-xs text-muted-foreground">{j.category} · {j.city}, {j.state} · {format(new Date(j.created_at), "MMM d, yyyy")}</p>
                    {j.description && <p className="text-sm mt-2 text-muted-foreground line-clamp-2">{j.description}</p>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Badge variant={j.status === "disputed" ? "destructive" : j.status === "completed" ? "default" : "secondary"}>
                    {j.status}
                  </Badge>
                  {bidsByJob[j.id] > 0 && <span className="text-xs text-muted-foreground">{bidsByJob[j.id]} bid{bidsByJob[j.id] > 1 ? "s" : ""}</span>}
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <p className="text-[10px] text-muted-foreground font-mono">Job ID: {j.id.slice(0, 8)}...</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Set status:</span>
                  <Select value={j.status} onValueChange={(v) => updateStatus(j, v)}>
                    <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No jobs</p>}
      </div>
    </div>
  );
};

export default Jobs;
