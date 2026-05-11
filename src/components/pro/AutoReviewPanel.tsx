import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Send } from "lucide-react";

interface Props {
  providerId: string;
  userId: string;
}

type CompletedJob = {
  id: string;
  title: string;
  homeowner_id: string;
  status: string;
  updated_at: string;
  hasRequest?: boolean;
  hasReview?: boolean;
};

const AutoReviewPanel = ({ providerId, userId }: Props) => {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<CompletedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [stats, setStats] = useState({ sent: 0, received: 0 });

  const load = async () => {
    setLoading(true);
    const [{ data: completed }, { data: reqs }, { data: revs }] = await Promise.all([
      supabase.from("jobs")
        .select("id, title, homeowner_id, status, updated_at")
        .eq("provider_id", providerId)
        .eq("status", "completed")
        .order("updated_at", { ascending: false })
        .limit(20),
      supabase.from("review_requests")
        .select("job_id, homeowner_id, sent_at")
        .eq("provider_id", providerId),
      supabase.from("reviews")
        .select("reviewer_id")
        .eq("provider_id", providerId),
    ]);

    const reqJobs = new Set((reqs || []).map((r: any) => r.job_id).filter(Boolean));
    const reviewerSet = new Set((revs || []).map((r: any) => r.reviewer_id));
    const list = (completed || []).map((j: any) => ({
      ...j,
      hasRequest: reqJobs.has(j.id),
      hasReview: reviewerSet.has(j.homeowner_id),
    }));
    setJobs(list);
    setStats({ sent: reqs?.length || 0, received: revs?.length || 0 });
    setLoading(false);
  };

  useEffect(() => { load(); }, [providerId]);

  const sendRequest = async (job: CompletedJob) => {
    setSendingId(job.id);
    const [{ error: reqErr }, { error: msgErr }] = await Promise.all([
      supabase.from("review_requests").insert({
        provider_id: providerId,
        homeowner_id: job.homeowner_id,
        job_id: job.id,
      }),
      supabase.from("messages").insert({
        sender_id: userId,
        recipient_id: job.homeowner_id,
        provider_id: providerId,
        subject: `Quick favor — review for "${job.title}"?`,
        body: `Hey! Thanks again for trusting me with "${job.title}". If you have 30 seconds, a quick review on HomeHero means everything for my small business. Just tap your dashboard → Pros → leave a rating. 🙏`,
      }),
    ]);
    setSendingId(null);
    if (reqErr || msgErr) {
      toast({ title: "Couldn't send", description: (reqErr || msgErr)?.message, variant: "destructive" });
    } else {
      toast({ title: "Review request sent" });
      load();
    }
  };

  const sendAllPending = async () => {
    const pending = jobs.filter((j) => !j.hasRequest && !j.hasReview);
    for (const j of pending) {
      await sendRequest(j);
    }
  };

  const pendingCount = jobs.filter((j) => !j.hasRequest && !j.hasReview).length;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Star className="text-primary" size={20} />
            <h2 className="font-bold text-lg text-foreground">Auto-Request Reviews</h2>
          </div>
          {pendingCount > 0 && (
            <Button size="sm" onClick={sendAllPending} className="gap-1.5">
              <Send size={14} /> Request all ({pendingCount})
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          After every completed job, send a polite review request in-app. Pros with 10+ reviews get 3× more bid acceptances.
        </p>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-lg bg-muted/40 p-3 text-center">
            <div className="text-xl font-bold text-foreground">{jobs.length}</div>
            <div className="text-xs text-muted-foreground">Completed jobs</div>
          </div>
          <div className="rounded-lg bg-muted/40 p-3 text-center">
            <div className="text-xl font-bold text-foreground">{stats.sent}</div>
            <div className="text-xs text-muted-foreground">Requests sent</div>
          </div>
          <div className="rounded-lg bg-primary/10 p-3 text-center">
            <div className="text-xl font-bold text-primary">{stats.received}</div>
            <div className="text-xs text-muted-foreground">Reviews received</div>
          </div>
        </div>

        {loading ? (
          <div className="h-24 bg-muted/30 rounded-lg animate-pulse" />
        ) : jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No completed jobs yet.</p>
        ) : (
          <div className="space-y-2">
            {jobs.slice(0, 6).map((j) => (
              <div key={j.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm text-foreground truncate">{j.title}</div>
                  <div className="text-xs text-muted-foreground">{new Date(j.updated_at).toLocaleDateString()}</div>
                </div>
                {j.hasReview ? (
                  <Badge className="text-[10px] bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Reviewed</Badge>
                ) : j.hasRequest ? (
                  <Badge variant="secondary" className="text-[10px]">Sent</Badge>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => sendRequest(j)} disabled={sendingId === j.id} className="gap-1.5 text-xs h-8">
                    <Send size={12} /> {sendingId === j.id ? "..." : "Ask"}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AutoReviewPanel;
