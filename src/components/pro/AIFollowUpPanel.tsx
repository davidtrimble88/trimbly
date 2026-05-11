import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Loader2 } from "lucide-react";

interface Props {
  providerId: string;
  userId: string;
  businessName: string;
}

type StaleThread = {
  homeowner_id: string;
  homeowner_name: string;
  last_inbound: string;
  last_message: string;
  daysStale: number;
};

const AIFollowUpPanel = ({ providerId, userId, businessName }: Props) => {
  const { toast } = useToast();
  const [threads, setThreads] = useState<StaleThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafting, setDrafting] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Pull recent messages this pro received
      const { data: msgs } = await supabase
        .from("messages")
        .select("sender_id, recipient_id, body, created_at")
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .gte("created_at", new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString())
        .order("created_at", { ascending: false });

      // For each homeowner, find the latest message. If latest is inbound (homeowner -> pro) and > 2 days old, stale.
      const byPartner: Record<string, { latest: any; partner: string }> = {};
      (msgs || []).forEach((m: any) => {
        const partner = m.sender_id === userId ? m.recipient_id : m.sender_id;
        if (!byPartner[partner]) byPartner[partner] = { latest: m, partner };
      });

      const stale = Object.values(byPartner).filter(({ latest }) => {
        if (latest.sender_id === userId) return false; // pro spoke last
        const days = (Date.now() - new Date(latest.created_at).getTime()) / 86400000;
        return days >= 2 && days <= 30;
      });

      if (stale.length === 0) {
        setThreads([]);
        setLoading(false);
        return;
      }

      const ids = stale.map((s) => s.partner);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);
      const nameMap = new Map((profs || []).map((p: any) => [p.id, p.full_name as string]));

      setThreads(stale.map((s) => ({
        homeowner_id: s.partner,
        homeowner_name: nameMap.get(s.partner) || "Homeowner",
        last_inbound: s.latest.created_at,
        last_message: s.latest.body,
        daysStale: Math.floor((Date.now() - new Date(s.latest.created_at).getTime()) / 86400000),
      })));
      setLoading(false);
    })();
  }, [userId]);

  const draftFollowUp = async (t: StaleThread) => {
    setDrafting(t.homeowner_id);
    try {
      const { data, error } = await supabase.functions.invoke("ai-followup-suggestions", {
        body: {
          homeownerName: t.homeowner_name,
          businessName,
          lastMessage: t.last_message,
          daysSince: t.daysStale,
        },
      });
      if (error) throw error;
      setDrafts((d) => ({ ...d, [t.homeowner_id]: data.draft || "" }));
    } catch (e: any) {
      toast({ title: "AI error", description: e.message, variant: "destructive" });
    }
    setDrafting(null);
  };

  const sendDraft = async (t: StaleThread) => {
    const body = drafts[t.homeowner_id];
    if (!body?.trim()) return;
    const { error } = await supabase.from("messages").insert({
      sender_id: userId,
      recipient_id: t.homeowner_id,
      provider_id: providerId,
      subject: "Following up",
      body: body.trim(),
    });
    if (error) {
      toast({ title: "Send failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Follow-up sent" });
      setThreads((arr) => arr.filter((x) => x.homeowner_id !== t.homeowner_id));
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="text-primary" size={20} />
          <h2 className="font-bold text-lg text-foreground">AI Follow-Up Sequences</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          AI nudges homeowners who never replied. Most pros win 20–30% more jobs just by following up once.
        </p>

        {loading ? (
          <div className="h-20 bg-muted/30 rounded-lg animate-pulse" />
        ) : threads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No stale threads — every homeowner has either replied or you're caught up. 🎉
          </p>
        ) : (
          <div className="space-y-3">
            {threads.slice(0, 6).map((t) => (
              <div key={t.homeowner_id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-foreground truncate">{t.homeowner_name}</div>
                    <div className="text-xs text-muted-foreground">No reply in {t.daysStale} day{t.daysStale !== 1 ? "s" : ""}</div>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">Stale</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2 italic">"{t.last_message}"</p>

                {drafts[t.homeowner_id] ? (
                  <>
                    <textarea
                      value={drafts[t.homeowner_id]}
                      onChange={(e) => setDrafts((d) => ({ ...d, [t.homeowner_id]: e.target.value }))}
                      className="w-full text-sm bg-background border border-border rounded p-2 min-h-[80px] mb-2"
                    />
                    <Button size="sm" onClick={() => sendDraft(t)} className="gap-1.5">
                      <Send size={12} /> Send follow-up
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => draftFollowUp(t)} disabled={drafting === t.homeowner_id} className="gap-1.5">
                    {drafting === t.homeowner_id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {drafting === t.homeowner_id ? "Drafting..." : "Draft AI follow-up"}
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

export default AIFollowUpPanel;
