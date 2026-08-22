import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Download, KeyRound, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AccountSettingsDialog({ trigger }: { trigger?: React.ReactNode }) {
  const { user, updatePassword, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const savePassword = async () => {
    if (newPassword.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    const { error } = await updatePassword(newPassword);
    setSavingPassword(false);
    if (error) {
      toast({ title: "Couldn't update password", description: error.message, variant: "destructive" });
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    toast({ title: "Password updated" });
  };

  const exportData = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const [profile, homes, binderItems, tasks, sentMessages, receivedMessages] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("homes").select("*").eq("user_id", user.id),
        supabase.from("home_binder_items").select("*").eq("user_id", user.id),
        supabase.from("maintenance_tasks").select("*").eq("user_id", user.id),
        supabase.from("messages").select("*").eq("sender_id", user.id),
        supabase.from("messages").select("*").eq("recipient_id", user.id),
      ]);
      downloadJson(`trimbly-data-export-${new Date().toISOString().slice(0, 10)}.json`, {
        exported_at: new Date().toISOString(),
        account: { id: user.id, email: user.email },
        profile: profile.data ?? null,
        homes: homes.data ?? [],
        binder_items: binderItems.data ?? [],
        maintenance_tasks: tasks.data ?? [],
        messages_sent: sentMessages.data ?? [],
        messages_received: receivedMessages.data ?? [],
      });
      toast({ title: "Export ready", description: "Your data was downloaded as a JSON file." });
    } catch (e) {
      toast({ title: "Export failed", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke("delete-own-account", { body: { confirm: "DELETE" } });
    if (error || (data as any)?.error) {
      setDeleting(false);
      toast({ title: "Couldn't delete account", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    await signOut();
    navigate("/");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setDeleteConfirm(""); setNewPassword(""); setConfirmPassword(""); } }}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" size="sm">Account Settings</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Account settings</DialogTitle>
          <DialogDescription>Manage your password, export your data, or close your account.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-2">
              <KeyRound size={14} /> Change password
            </h3>
            <div className="space-y-2">
              <div>
                <Label htmlFor="acct-new-pw" className="text-xs">New password</Label>
                <Input id="acct-new-pw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
              </div>
              <div>
                <Label htmlFor="acct-confirm-pw" className="text-xs">Confirm new password</Label>
                <Input id="acct-confirm-pw" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
              </div>
              <Button size="sm" onClick={savePassword} disabled={savingPassword || !newPassword}>
                {savingPassword ? <><Loader2 size={14} className="animate-spin mr-1.5" /> Updating…</> : "Update password"}
              </Button>
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-2 mt-4">
              <Download size={14} /> Export your data
            </h3>
            <p className="text-xs text-muted-foreground mb-2">
              Download a copy of your homes, binder items, maintenance tasks, and messages as a JSON file.
            </p>
            <Button size="sm" variant="outline" onClick={exportData} disabled={exporting}>
              {exporting ? <><Loader2 size={14} className="animate-spin mr-1.5" /> Preparing…</> : "Download my data"}
            </Button>
          </div>

          <div className="pt-2 border-t border-destructive/30">
            <h3 className="text-sm font-semibold text-destructive flex items-center gap-1.5 mb-2 mt-4">
              <AlertTriangle size={14} /> Delete account
            </h3>
            <p className="text-xs text-muted-foreground mb-2">
              This permanently deletes your account and signs you out. This can't be undone. Type <strong>DELETE</strong> to confirm.
            </p>
            <div className="flex gap-2">
              <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="DELETE" className="max-w-[140px]" />
              <Button variant="destructive" size="sm" disabled={deleteConfirm !== "DELETE" || deleting} onClick={deleteAccount}>
                {deleting ? <><Loader2 size={14} className="animate-spin mr-1.5" /> Deleting…</> : "Delete my account"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
