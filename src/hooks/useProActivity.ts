import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ProActivityType = "message" | "bid_accepted" | "bid_rejected" | "review_received" | "quote_paid";

export interface ProActivityItem {
  id: string;
  type: ProActivityType;
  label: string;
  sublabel?: string;
  createdAt: string;
}

const LIMIT = 20;

/** Provider-side equivalent of useHomeownerActivity — homeowners already
 * had a merged recent-activity timeline; pros/mechanics had nothing. Same
 * approach: plain queries per source (no embedded-select joins — see
 * useHomeownerActivity's note on why), merged and sorted client-side. */
export function useProActivity(providerId: string | null) {
  const { user } = useAuth();
  const [items, setItems] = useState<ProActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !providerId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);

      const [messagesRes, bidsRes, reviewsRes, quotesRes] = await Promise.all([
        supabase.from("messages")
          .select("id, subject, body, created_at")
          .eq("recipient_id", user.id)
          .order("created_at", { ascending: false }).limit(LIMIT),
        supabase.from("job_bids")
          .select("id, job_id, status, created_at")
          .eq("provider_id", providerId)
          .in("status", ["accepted", "rejected"])
          .order("created_at", { ascending: false }).limit(LIMIT),
        supabase.from("reviews")
          .select("id, rating, comment, created_at")
          .eq("provider_id", providerId)
          .order("created_at", { ascending: false }).limit(LIMIT),
        supabase.from("quotes")
          .select("id, title, total, created_at")
          .eq("provider_id", providerId).eq("status", "paid")
          .order("created_at", { ascending: false }).limit(LIMIT),
      ]);

      const jobIds = [...new Set((bidsRes.data || []).map((b: any) => b.job_id))];
      const jobTitleById = new Map<string, string>();
      if (jobIds.length) {
        const { data: jobs } = await supabase.from("jobs").select("id, title").in("id", jobIds);
        (jobs || []).forEach((j: any) => jobTitleById.set(j.id, j.title));
      }

      if (cancelled) return;

      const merged: ProActivityItem[] = [
        ...((messagesRes.data as any[]) || []).map((m) => ({
          id: `msg-${m.id}`, type: "message" as const,
          label: m.subject || "New message", sublabel: m.body?.slice(0, 80), createdAt: m.created_at,
        })),
        ...((bidsRes.data as any[]) || []).map((b) => {
          const accepted = b.status === "accepted";
          const item: ProActivityItem = {
            id: `bid-${b.id}`,
            type: accepted ? "bid_accepted" : "bid_rejected",
            label: accepted
              ? `Your bid was accepted on "${jobTitleById.get(b.job_id) || "a job"}"`
              : `Your bid wasn't selected for "${jobTitleById.get(b.job_id) || "a job"}"`,
            createdAt: b.created_at,
          };
          return item;
        }),
        ...((reviewsRes.data as any[]) || []).map((r) => ({
          id: `review-${r.id}`, type: "review_received" as const,
          label: `New ${r.rating}★ review`, sublabel: r.comment?.slice(0, 80), createdAt: r.created_at,
        })),
        ...((quotesRes.data as any[]) || []).map((q) => ({
          id: `quote-${q.id}`, type: "quote_paid" as const,
          label: `Quote paid: ${q.title}`, sublabel: q.total ? `$${Number(q.total).toLocaleString()}` : undefined, createdAt: q.created_at,
        })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, LIMIT);

      setItems(merged);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, providerId]);

  return { items, loading };
}
