import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";

export function NotificationPermissionPrompt() {
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof Notification !== "undefined") setPermission(Notification.permission);
  }, []);

  if (typeof Notification === "undefined") return null;
  if (permission === "granted" || permission === "denied") return null;

  const request = async () => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") toast.success("Notifications enabled");
      else toast("Notifications dismissed");
    } catch {
      toast.error("Could not enable notifications");
    }
  };

  return (
    <div className="border border-border bg-card rounded-lg p-3 flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2 min-w-0">
        <Bell className="w-4 h-4 text-primary shrink-0" />
        <div className="text-sm min-w-0">
          <p className="font-medium text-foreground">Get notified instantly</p>
          <p className="text-xs text-muted-foreground truncate">Allow notifications for new messages and bids.</p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button size="sm" variant="ghost" onClick={() => setPermission("denied")}>
          <BellOff className="w-4 h-4" />
        </Button>
        <Button size="sm" onClick={request}>Enable</Button>
      </div>
    </div>
  );
}
