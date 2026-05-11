import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Prefs = {
  push_new_job: boolean;
  push_new_message: boolean;
  push_bid_accepted: boolean;
};

const DEFAULT_PREFS: Prefs = {
  push_new_job: true,
  push_new_message: true,
  push_bid_accepted: true,
};

export function notify(title: string, body: string) {
  if (typeof window === "undefined") return;
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, { body, icon: "/favicon.ico", badge: "/favicon.ico" });
    } catch {/* ignore */}
  }
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") return Notification.permission;
  return await Notification.requestPermission();
}

export function useProNotifications({
  userId,
  providerId,
  providerState,
  providerCategory,
}: {
  userId: string | null;
  providerId: string | null;
  providerState: string | null;
  providerCategory: string | null;
}) {
  const { toast } = useToast();
  const prefsRef = useRef<Prefs>(DEFAULT_PREFS);
  const bidIdsSeen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from("notification_prefs")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) prefsRef.current = data as Prefs;
    })();
  }, [userId]);

  useEffect(() => {
    if (!userId || !providerId) return;

    const handleMessage = (payload: any) => {
      if (!prefsRef.current.push_new_message) return;
      if (payload.new?.recipient_id !== userId) return;
      const title = "New message";
      const body = payload.new?.subject || payload.new?.body?.slice(0, 80) || "You have a new message";
      toast({ title, description: body });
      notify(title, body);
    };

    const handleJob = (payload: any) => {
      if (!prefsRef.current.push_new_job) return;
      const j = payload.new;
      if (!j) return;
      if (providerState && j.state && j.state !== providerState) return;
      if (providerCategory && j.category && j.category !== providerCategory) return;
      const title = "New job in your area";
      const body = `${j.title || "Job"} · ${j.city || ""}, ${j.state || ""}`;
      toast({ title, description: body });
      notify(title, body);
    };

    const handleBid = (payload: any) => {
      if (!prefsRef.current.push_bid_accepted) return;
      const b = payload.new;
      if (!b || b.provider_id !== providerId) return;
      // Track transition to accepted
      if (b.status === "accepted" && !bidIdsSeen.current.has(b.id + ":accepted")) {
        bidIdsSeen.current.add(b.id + ":accepted");
        const title = "Bid accepted 🎉";
        const body = "A homeowner accepted your bid";
        toast({ title, description: body });
        notify(title, body);
      }
    };

    const channel = supabase
      .channel("pro-notifications-" + userId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, handleMessage)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "jobs" }, handleJob)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "job_bids" }, handleBid)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, providerId, providerState, providerCategory, toast]);
}
