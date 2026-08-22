import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

/**
 * Subscribes to real-time inserts on `messages` and `job_bids` for the
 * current user and surfaces them as toast notifications + (if permitted)
 * native browser notifications. Mounts once at the app root.
 */
export function useRealtimeNotifications() {
  const { user } = useAuth();
  const providerIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("providers").select("id").eq("user_id", user.id).maybeSingle();
      if (!cancelled) providerIdRef.current = data?.id ?? null;
    })();

    const notify = (type: string, title: string, body: string, url?: string) => {
      toast(title, { description: body, action: url ? { label: "Open", onClick: () => (window.location.href = url) } : undefined });
      if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState !== "visible") {
        try {
          const n = new Notification(title, { body, icon: "/favicon.ico", tag: title + body });
          if (url) n.onclick = () => { window.focus(); window.location.href = url; };
        } catch { /* ignore */ }
      }
      // Persist so it still shows up in the notification center after the
      // toast disappears — best-effort, a failed insert shouldn't block the
      // toast the user already saw.
      supabase.from("notifications").insert({ user_id: user.id, type, title, body, link: url || null }).then(({ error }) => {
        if (error) console.error("Failed to persist notification:", error);
      });
    };

    const messagesChannel = supabase
      .channel(`notif-messages-${user.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${user.id}` },
        (payload: any) => {
          const m = payload.new;
          if (m.sender_id === user.id) return;
          notify("message", "New message", (m.subject || m.body || "").slice(0, 120), "/messages");
        }
      )
      .subscribe();

    const bidsChannel = supabase
      .channel(`notif-bids-${user.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "job_bids" },
        async (payload: any) => {
          const bid = payload.new;
          const { data: job } = await supabase.from("jobs").select("homeowner_id, title").eq("id", bid.job_id).maybeSingle();
          if (job?.homeowner_id === user.id) {
            notify("bid_received", "New bid received", `On: ${job.title}`, "/dashboard");
          }
        }
      )
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "job_bids" },
        (payload: any) => {
          const bid = payload.new;
          if (providerIdRef.current && bid.provider_id === providerIdRef.current && bid.status === "accepted") {
            notify("bid_accepted", "Your bid was accepted!", "Tap to view details", "/pro-dashboard");
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(bidsChannel);
    };
  }, [user]);
}
