import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type Prefs = { push_new_message: boolean; push_new_job: boolean; push_bid_accepted: boolean };

export default function NotificationPreferencesDialog({ trigger }: { trigger?: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({ push_new_message: true, push_new_job: true, push_bid_accepted: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    supabase.from("notification_prefs").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) setPrefs({
        push_new_message: data.push_new_message,
        push_new_job: data.push_new_job,
        push_bid_accepted: data.push_bid_accepted,
      });
    });
  }, [open, user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("notification_prefs").upsert({ user_id: user.id, ...prefs });
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Saved" }); setOpen(false); }
  };

  const requestBrowserPermission = async () => {
    if (typeof Notification === "undefined") return;
    const res = await Notification.requestPermission();
    toast({ title: res === "granted" ? "Notifications enabled" : "Permission " + res });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-1.5">
            <Bell size={14} /> Notifications
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Notification preferences</DialogTitle>
          <DialogDescription>Choose what you'd like to be notified about.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="np-msg" className="text-sm">New messages</Label>
            <Switch id="np-msg" checked={prefs.push_new_message} onCheckedChange={(v) => setPrefs((p) => ({ ...p, push_new_message: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="np-job" className="text-sm">New jobs in your area (Pros)</Label>
            <Switch id="np-job" checked={prefs.push_new_job} onCheckedChange={(v) => setPrefs((p) => ({ ...p, push_new_job: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="np-bid" className="text-sm">Bid responses</Label>
            <Switch id="np-bid" checked={prefs.push_bid_accepted} onCheckedChange={(v) => setPrefs((p) => ({ ...p, push_bid_accepted: v }))} />
          </div>
          <Button variant="outline" size="sm" onClick={requestBrowserPermission} className="w-full gap-2">
            <Bell size={14} /> Enable browser notifications
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
