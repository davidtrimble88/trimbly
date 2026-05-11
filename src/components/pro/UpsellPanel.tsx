import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, ChevronDown, ChevronUp, Loader2, Zap } from "lucide-react";

interface CompletedJob {
  id: string;
  title: string;
  category: string;
  description: string | null;
  homeowner_id: string;
}

interface Suggestion {
  service: string;
  why: string;
  urgency: "high" | "medium" | "low";
  message: string;
}

interface Props {
  providerId: string;
  providerCategory: string;
  businessName: string;
  userId: string;
}

const urgencyStyle: Record<string, string> = {
  high: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
  medium: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

const UpsellPanel = ({ providerId, providerCategory, businessName, userId }: Props) => {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<CompletedJob[]>([]);
  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [suggestionsByJob, setSuggestionsByJob] = useState<Record<string, Suggestion[]>>({});
  const [draftsByJob, setDraftsByJob] = useState<Record<string, Record<number, string>>>({});
  const [loadingJob, setLoadingJob] = useState<string | null>(null);
  const [sendingKey, setSendingKey] = useState<string | null>(null);
  const [sentKeys, setSentKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id, title, category, description, homeowner_id")
        .eq("provider_id", providerId)
        .eq("status", "completed")
        .order("updated_at", { ascending: false })
        .limit(10);
      setJobs(data || []);
    })();
  }, [providerId]);

  const generate = async (job: CompletedJob) => {
    setLoadingJob(job.id);
    try {
      const { data, error } = await supabase.functions.invoke("job-upsell-suggestions", {
        body: {
          jobTitle: job.title,
          jobCategory: job.category,
          jobDescription: job.description,
          businessName,
          providerCategory,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const suggestions: Suggestion[] = data?.suggestions || [];
      setSuggestionsByJob((p) => ({ ...p, [job.id]: suggestions }));
      setDraftsByJob((p) => ({
        ...p,
        [job.id]: Object.fromEntries(suggestions.map((s, i) => [i, s.message])),
      }));
      setOpenJobId(job.id);
    } catch (e: any) {
      toast({ title: "Couldn't generate suggestions", description: e.message, variant: "destructive" });
    } finally {
      setLoadingJob(null);
    }
  };

  const sendPitch = async (job: CompletedJob, idx: number, service: string) => {
    const key = `${job.id}:${idx}`;
    setSendingKey(key);
    const body = draftsByJob[job.id]?.[idx] || "";
    if (body.trim().length < 10) {
      setSendingKey(null);
      return toast({ title: "Message too short", variant: "destructive" });
    }
    const { error } = await supabase.from("messages").insert({
      sender_id: userId,
      recipient_id: job.homeowner_id,
      subject: `Follow-up: ${service}`,
      body,
    });
    setSendingKey(null);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setSentKeys((p) => new Set(p).add(key));
    toast({ title: "Pitch sent" });
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-2 mb-3">
          <Sparkles size={18} className="text-primary mt-0.5" />
          <div>
            <h3 className="font-bold text-foreground">AI Upsell Prompts</h3>
            <p className="text-sm text-muted-foreground">
              Turn finished jobs into your next one. AI suggests follow-on services with ready-to-send pitches.
            </p>
          </div>
        </div>

        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-3">
            No completed jobs yet. Finish a job and we'll suggest natural follow-on services to offer.
          </p>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => {
              const suggestions = suggestionsByJob[job.id];
              const isOpen = openJobId === job.id;
              return (
                <div key={job.id} className="bg-muted/40 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between gap-2 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{job.title}</p>
                      <p className="text-xs text-muted-foreground">{job.category}</p>
                    </div>
                    {suggestions ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setOpenJobId(isOpen ? null : job.id)}
                        className="gap-1"
                      >
                        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {suggestions.length} ideas
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => generate(job)}
                        disabled={loadingJob === job.id}
                        className="gap-1"
                      >
                        {loadingJob === job.id ? (
                          <><Loader2 size={12} className="animate-spin" /> Thinking…</>
                        ) : (
                          <><Sparkles size={12} /> Suggest</>
                        )}
                      </Button>
                    )}
                  </div>

                  {isOpen && suggestions && (
                    <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
                      {suggestions.map((s, idx) => {
                        const key = `${job.id}:${idx}`;
                        const sent = sentKeys.has(key);
                        return (
                          <div key={idx} className="bg-background rounded-lg p-3 border border-border">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex-1">
                                <p className="font-semibold text-foreground text-sm">{s.service}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{s.why}</p>
                              </div>
                              <Badge variant="outline" className={`text-xs gap-1 shrink-0 ${urgencyStyle[s.urgency]}`}>
                                {s.urgency === "high" && <Zap size={10} />}
                                {s.urgency}
                              </Badge>
                            </div>
                            <Textarea
                              value={draftsByJob[job.id]?.[idx] ?? s.message}
                              onChange={(e) =>
                                setDraftsByJob((p) => ({
                                  ...p,
                                  [job.id]: { ...(p[job.id] || {}), [idx]: e.target.value },
                                }))
                              }
                              rows={3}
                              disabled={sent}
                              className="text-sm mt-2"
                            />
                            <div className="flex justify-end mt-2">
                              {sent ? (
                                <Badge variant="outline" className="gap-1">
                                  <Send size={12} className="text-green-600" /> Sent
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => sendPitch(job, idx, s.service)}
                                  disabled={sendingKey === key}
                                  className="gap-1"
                                >
                                  <Send size={12} />
                                  {sendingKey === key ? "Sending…" : "Send pitch"}
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UpsellPanel;
