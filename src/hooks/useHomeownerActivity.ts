import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ActivityType = "message" | "bid" | "task_completed" | "home_shared" | "review";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  label: string;
  sublabel?: string;
  createdAt: string;
}

const LIMIT = 20;

/** "What's changed since I last looked" — merges recent rows from a
 * handful of existing tables (no new schema) into one timeline. Each
 * source is a plain query (no PostgREST embedded-select joins — several
 * of these tables' foreign keys point at auth.users rather than
 * public.profiles/public.providers, which breaks the embed syntax with a
 * PGRST200 "no relationship found" error; this app already hit that exact
 * bug once in SavedProvidersCard.tsx, so related names are resolved with a
 * second lookup + client-side Map instead). Results are merged and sorted
 * client-side since the five sources have nothing to UNION on. */
export function useHomeownerActivity() {
  const { user } = useAuth();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);

      const [messagesRes, jobsRes, tasksRes, sharesRes, reviewsRes] = await Promise.all([
        supabase.from("messages")
          .select("id, subject, body, created_at")
          .eq("recipient_id", user.id)
          .order("created_at", { ascending: false }).limit(LIMIT),
        supabase.from("jobs").select("id, title").eq("homeowner_id", user.id),
        supabase.from("maintenance_tasks")
          .select("id, title, updated_at")
          .eq("user_id", user.id).eq("status", "completed")
          .order("updated_at", { ascending: false }).limit(LIMIT),
        supabase.from("home_shares")
          .select("id, owner_user_id, created_at")
          .eq("member_user_id", user.id).eq("status", "active")
          .order("created_at", { ascending: false }).limit(LIMIT),
        supabase.from("reviews")
          .select("id, provider_id, rating, created_at")
          .eq("reviewer_id", user.id)
          .order("created_at", { ascending: false }).limit(LIMIT),
      ]);

      const jobIds = (jobsRes.data || []).map((j) => j.id);
      const jobTitleById = new Map((jobsRes.data || []).map((j) => [j.id, j.title]));
      const bidsRes = jobIds.length
        ? await supabase.from("job_bids").select("id, job_id, bid_amount, created_at").in("job_id", jobIds).order("created_at", { ascending: false }).limit(LIMIT)
        : { data: [] as any[] };

      const ownerIds = [...new Set((sharesRes.data || []).map((s) => s.owner_user_id))];
      const ownerNameById = new Map<string, string>();
      if (ownerIds.length) {
        const { data: owners } = await supabase.from("profiles").select("id, full_name").in("id", ownerIds);
        (owners || []).forEach((o: any) => ownerNameById.set(o.id, o.full_name || "Someone"));
      }

      const providerIds = [...new Set((reviewsRes.data || []).map((r) => r.provider_id))];
      const providerNameById = new Map<string, string>();
      if (providerIds.length) {
        const { data: providers } = await supabase.from("providers").select("id, business_name").in("id", providerIds);
        (providers || []).forEach((p: any) => providerNameById.set(p.id, p.business_name));
      }

      if (cancelled) return;

      const merged: ActivityItem[] = [
        ...((messagesRes.data as any[]) || []).map((m) => ({
          id: `msg-${m.id}`, type: "message" as const,
          label: m.subject || "New message", sublabel: m.body?.slice(0, 80), createdAt: m.created_at,
        })),
        ...((bidsRes.data as any[]) || []).map((b) => ({
          id: `bid-${b.id}`, type: "bid" as const,
          label: `New bid on "${jobTitleById.get(b.job_id) || "your job"}"`,
          sublabel: b.bid_amount ? `$${b.bid_amount}` : undefined, createdAt: b.created_at,
        })),
        ...((tasksRes.data as any[]) || []).map((t) => ({
          id: `task-${t.id}`, type: "task_completed" as const,
          label: `Completed: ${t.title}`, createdAt: t.updated_at,
        })),
        ...((sharesRes.data as any[]) || []).map((s) => ({
          id: `share-${s.id}`, type: "home_shared" as const,
          label: `${ownerNameById.get(s.owner_user_id) || "Someone"} shared a home with you`, createdAt: s.created_at,
        })),
        ...((reviewsRes.data as any[]) || []).map((r) => ({
          id: `review-${r.id}`, type: "review" as const,
          label: `You reviewed ${providerNameById.get(r.provider_id) || "a pro"}`, sublabel: `${r.rating}★`, createdAt: r.created_at,
        })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, LIMIT);

      setItems(merged);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  return { items, loading };
}
