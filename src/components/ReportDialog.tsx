import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const REASONS = [
  "Spam or scam",
  "Harassment or hate",
  "Inappropriate content",
  "Misleading information",
  "Off-platform contact request",
  "Other",
];

type Props = {
  targetType: "message" | "review" | "provider" | "user";
  targetId: string;
  trigger?: React.ReactNode;
};

export default function ReportDialog({ targetType, targetId, trigger }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user || !reason) return;
    setBusy(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      details: details.trim(),
    });
    setBusy(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Report submitted", description: "Our team will review this shortly." });
    setOpen(false);
    setReason(""); setDetails("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1">
            <Flag size={12} /> Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report {targetType}</DialogTitle>
          <DialogDescription>Help keep HomeHero safe. Reports are reviewed by our team.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-sm">Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select a reason" /></SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Additional details (optional)</Label>
            <Textarea value={details} onChange={(e) => setDetails(e.target.value)} className="mt-1" maxLength={1000} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!reason || busy}>{busy ? "Submitting…" : "Submit report"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
