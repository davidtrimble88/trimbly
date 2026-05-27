import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, CheckCircle2 } from "lucide-react";

type Pending = {
  id: string;
  provider_id: string;
  job_id: string | null;
  provider_name: string;
  job_title: string | null;
};

export function ReviewPromptDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [queue, setQueue] = useState<Pending[]>([]);
  const [active, setActive] = useState<Pending | null>(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: reqs } = await supabase
        .from("review_requests")
        .select("id, provider_id, job_id")
        .eq("homeowner_id", user.id)
        .eq("status", "sent");
      if (!reqs || reqs.length === 0) return;

      // Filter out any the user already left a review for
      const providerIds = Array.from(new Set(reqs.map((r) => r.provider_id)));
      const { data: existing } = await supabase
        .from("reviews")
        .select("provider_id")
        .eq("reviewer_id", user.id)
        .in("provider_id", providerIds);
      const reviewedSet = new Set((existing || []).map((r: any) => r.provider_id));

      const pending = reqs.filter((r: any) => !reviewedSet.has(r.provider_id));
      if (pending.length === 0) {
        // mark all as completed since reviews already exist
        await supabase.from("review_requests").update({ status: "completed", completed_at: new Date().toISOString() }).in("id", reqs.map((r) => r.id));
        return;
      }

      // Hydrate provider + job names
      const [{ data: provs }, { data: jobs }] = await Promise.all([
        supabase.from("providers").select("id, business_name").in("id", pending.map((p: any) => p.provider_id)),
        supabase.from("jobs").select("id, title").in("id", pending.map((p: any) => p.job_id).filter(Boolean) as string[]),
      ]);
      const provMap = new Map((provs || []).map((p: any) => [p.id, p.business_name]));
      const jobMap = new Map((jobs || []).map((j: any) => [j.id, j.title]));
      const hydrated: Pending[] = pending.map((r: any) => ({
        id: r.id,
        provider_id: r.provider_id,
        job_id: r.job_id,
        provider_name: provMap.get(r.provider_id) || "your pro",
        job_title: r.job_id ? jobMap.get(r.job_id) || null : null,
      }));
      setQueue(hydrated);
      setActive(hydrated[0]);
    })();
  }, [user]);

  const closeCurrent = (skipped = false) => {
    if (!active) return;
    const rest = queue.filter((q) => q.id !== active.id);
    setQueue(rest);
    setActive(rest[0] || null);
    setRating(0);
    setHover(0);
    setComment("");
    if (skipped) {
      toast({ title: "Reminder kept", description: "We'll ask again next time you open your dashboard." });
    }
  };

  const submit = async () => {
    if (!user || !active) return;
    if (rating < 1) {
      toast({ title: "Pick a rating", description: "Tap a star to rate this pro.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error: revErr } = await supabase.from("reviews").insert({
        provider_id: active.provider_id,
        reviewer_id: user.id,
        rating,
        comment: comment.trim(),
      });
      if (revErr) throw revErr;

      await supabase
        .from("review_requests")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", active.id);

      toast({ title: "Review submitted", description: `Thanks for rating ${active.provider_name}!` });
      closeCurrent();
    } catch (e: any) {
      toast({ title: "Couldn't submit review", description: e.message || "Try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!active) return null;

  return (
    <Dialog open={!!active} onOpenChange={(o) => { if (!o) closeCurrent(true); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" /> Job completed — how did it go?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{active.provider_name}</span> marked
            {active.job_title ? <> the job <span className="font-medium text-foreground">"{active.job_title}"</span></> : " your job"} as complete.
            Leave a quick review to help other homeowners.
          </p>

          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                className="p-1"
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
              >
                <Star
                  size={32}
                  className={`transition-colors ${
                    (hover || rating) >= n ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>

          <div>
            <Textarea
              placeholder="Tell other homeowners about your experience (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => closeCurrent(true)} disabled={submitting}>
            Remind me later
          </Button>
          <Button onClick={submit} disabled={submitting || rating < 1}>
            {submitting ? "Submitting..." : "Submit review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
