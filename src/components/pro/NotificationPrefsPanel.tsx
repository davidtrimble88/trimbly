import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { requestPushPermission } from "@/hooks/useProNotifications";

export default function NotificationPrefsPanel({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState({
    push_new_job: true,
    push_new_message: true,
    push_bid_accepted: true,
  });
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) setPermission(Notification.permission);
    (async () => {
      const { data } = await supabase.from("notification_prefs").select("*").eq("user_id", userId).maybeSingle();
      if (data) setPrefs({
        push_new_job: data.push_new_job,
        push_new_message: data.push_new_message,
        push_bid_accepted: data.push_bid_accepted,
      });
      setLoading(false);
    })();
  }, [userId]);

  const update = async (key: keyof typeof prefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    await supabase.from("notification_prefs").upsert({ user_id: userId, ...next });
  };

  const enable = async () => {
    const result = await requestPushPermission();
    setPermission(result);
    if (result === "granted") {
      toast({ title: "Notifications enabled" });
      new Notification("HomeHero", { body: "You'll get pinged for new jobs, messages, and accepted bids." });
    } else if (result === "denied") {
      toast({ title: "Blocked", description: "Enable notifications in your browser settings.", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {permission === "granted" ? <Bell className="h-5 w-5 text-primary" /> : <BellOff className="h-5 w-5 text-muted-foreground" />}
            <h3 className="font-semibold text-foreground">Push Notifications</h3>
          </div>
          {permission === "granted" ? (
            <span className="text-xs text-primary inline-flex items-center gap-1"><Check size={12} /> Enabled</span>
          ) : (
            <Button size="sm" onClick={enable}>Enable</Button>
          )}
        </div>

        {permission !== "granted" && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            Turn on notifications to get instant alerts on this device — works best when you install HomeHero as an app from your browser menu.
          </p>
        )}

        {!loading && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">New job in your area</p>
                <p className="text-xs text-muted-foreground">Matches your category & state</p>
              </div>
              <Switch checked={prefs.push_new_job} onCheckedChange={(v) => update("push_new_job", v)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">New message</p>
                <p className="text-xs text-muted-foreground">From homeowners</p>
              </div>
              <Switch checked={prefs.push_new_message} onCheckedChange={(v) => update("push_new_message", v)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Bid accepted</p>
                <p className="text-xs text-muted-foreground">When a homeowner picks your bid</p>
              </div>
              <Switch checked={prefs.push_bid_accepted} onCheckedChange={(v) => update("push_bid_accepted", v)} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
