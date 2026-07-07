import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, ShieldAlert, Loader2, Upload, FileText, ExternalLink, Lock, BadgeCheck } from "lucide-react";

// Mirrors VERIFICATION_FEE_CENTS default in the create-verification-checkout
// edge function. If you change the env var there, update this display value too.
const VERIFICATION_FEE_DISPLAY = "$29";

type Verification = {
  background_check_status: string;
  background_check_requested_at: string | null;
  background_check_completed_at: string | null;
  background_check_expires_at: string | null;
  license_verification_status: string;
  license_rejection_reason: string | null;
  insurance_verification_status: string;
  insurance_rejection_reason: string | null;
  verification_fee_status: string;
  verification_fee_paid_at: string | null;
};

type ProviderDoc = {
  id: string;
  document_type: string;
  file_name: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
};

type Props = {
  providerId: string;
};

const DOC_TYPES: { key: string; label: string; hint: string }[] = [
  { key: "license", label: "License certificate", hint: "A copy of your current trade/business license" },
  { key: "insurance", label: "Insurance certificate", hint: "Certificate of general liability insurance" },
  { key: "id", label: "Government ID", hint: "Driver's license or state ID for identity verification" },
];

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    not_started: { label: "Not started", className: "bg-muted text-muted-foreground" },
    unverified: { label: "Not submitted", className: "bg-muted text-muted-foreground" },
    pending: { label: "In review", className: "bg-yellow-500/15 text-yellow-700 border-yellow-500/40" },
    clear: { label: "Clear", className: "bg-green-500/15 text-green-700 border-green-500/40" },
    verified: { label: "Verified", className: "bg-green-500/15 text-green-700 border-green-500/40" },
    consider: { label: "Needs review", className: "bg-orange-500/15 text-orange-700 border-orange-500/40" },
    rejected: { label: "Rejected", className: "bg-destructive/15 text-destructive border-destructive/40" },
    failed: { label: "Failed", className: "bg-destructive/15 text-destructive border-destructive/40" },
    expired: { label: "Expired", className: "bg-destructive/15 text-destructive border-destructive/40" },
  };
  const cfg = map[status] || map.not_started;
  return <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>;
}

export default function VerificationPanel({ providerId }: Props) {
  const { toast } = useToast();
  const [verification, setVerification] = useState<Verification | null>(null);
  const [docs, setDocs] = useState<ProviderDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingCheck, setStartingCheck] = useState(false);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [startingCheckout, setStartingCheckout] = useState(false);

  const load = async () => {
    const [{ data: v }, { data: d }] = await Promise.all([
      supabase.from("provider_verifications").select("*").eq("provider_id", providerId).maybeSingle(),
      supabase.from("provider_documents").select("*").eq("provider_id", providerId).order("created_at", { ascending: false }),
    ]);
    setVerification((v as Verification) || null);
    setDocs((d as ProviderDoc[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [providerId]);

  const startCheckout = async () => {
    setStartingCheckout(true);
    const { data, error } = await supabase.functions.invoke("create-verification-checkout", { body: {} });
    setStartingCheckout(false);
    if (error) {
      toast({ title: "Couldn't start checkout", description: error.message, variant: "destructive" });
      return;
    }
    if (data?.url) {
      window.location.href = data.url;
    }
  };

  const startBackgroundCheck = async () => {
    setStartingCheck(true);
    const { data, error } = await supabase.functions.invoke("checkr-create-invitation", { body: {} });
    setStartingCheck(false);
    if (error) {
      toast({ title: "Couldn't start background check", description: error.message, variant: "destructive" });
      return;
    }
    if (data?.invitation_url) {
      window.open(data.invitation_url, "_blank", "noopener,noreferrer");
      toast({ title: "Background check started", description: "Complete the secure form in the new tab. Your status will update automatically once it's done." });
      load();
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 15MB per file.", variant: "destructive" });
      return;
    }
    setUploadingType(docType);
    const path = `${providerId}/${docType}/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("provider-verification-docs").upload(path, file);
    if (uploadErr) {
      toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" });
      setUploadingType(null);
      e.target.value = "";
      return;
    }
    const { error: dbErr } = await supabase.from("provider_documents").insert({
      provider_id: providerId,
      document_type: docType,
      file_name: file.name,
      file_url: path,
      file_size: file.size,
      status: "pending",
    });
    if (dbErr) {
      toast({ title: "Save failed", description: dbErr.message, variant: "destructive" });
    } else {
      toast({ title: "Uploaded", description: `${file.name} submitted for review.` });
      // Bump the relevant verification status to "pending" so staff see it in their queue.
      const field = docType === "license" ? "license_verification_status" : docType === "insurance" ? "insurance_verification_status" : null;
      if (field) {
        await supabase.from("provider_verifications").update({ [field]: "pending" }).eq("provider_id", providerId);
      }
      load();
    }
    setUploadingType(null);
    e.target.value = "";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center text-muted-foreground">
          <Loader2 className="animate-spin mr-2" size={18} /> Loading verification status...
        </CardContent>
      </Card>
    );
  }

  const bgStatus = verification?.background_check_status || "not_started";
  const feePaid = verification?.verification_fee_status === "paid";
  const canStartCheck = ["not_started", "failed", "expired", "consider"].includes(bgStatus);

  if (!feePaid) {
    return (
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BadgeCheck size={18} className="text-primary" /> Get the Verified badge
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Verification is optional. You can list your business without it &mdash; but homeowners
            trust and choose Verified pros more often. For a one-time {VERIFICATION_FEE_DISPLAY} fee, we run:
          </p>
          <ul className="text-sm space-y-1.5">
            <li className="flex items-center gap-2"><ShieldCheck size={14} className="text-primary shrink-0" /> A background check through our screening partner, Checkr</li>
            <li className="flex items-center gap-2"><FileText size={14} className="text-primary shrink-0" /> Review of your license certificate (if you're licensed)</li>
            <li className="flex items-center gap-2"><FileText size={14} className="text-primary shrink-0" /> Review of your insurance certificate (if you're insured)</li>
          </ul>
          <p className="text-xs text-muted-foreground">
            No fee, no badge, no problem &mdash; your listing still works fine either way. This is entirely optional.
          </p>
          <Button onClick={startCheckout} disabled={startingCheckout} className="gap-1.5">
            {startingCheckout ? <Loader2 className="animate-spin" size={14} /> : <Lock size={14} />}
            Pay {VERIFICATION_FEE_DISPLAY} & start verification
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck size={18} className="text-primary" /> Background check
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">
              Run through our screening partner, Checkr. Your SSN and personal details are collected
              securely by Checkr directly &mdash; Trimbly never stores them.
            </p>
            {statusBadge(bgStatus)}
          </div>
          {verification?.background_check_completed_at && (
            <p className="text-xs text-muted-foreground">
              Completed {new Date(verification.background_check_completed_at).toLocaleDateString()}
              {verification.background_check_expires_at && (
                <> &middot; valid through {new Date(verification.background_check_expires_at).toLocaleDateString()}</>
              )}
            </p>
          )}
          {bgStatus === "pending" && (
            <p className="text-xs text-muted-foreground">
              Your background check is being processed. This usually takes 1&ndash;3 business days.
            </p>
          )}
          {canStartCheck && (
            <Button size="sm" onClick={startBackgroundCheck} disabled={startingCheck} className="gap-1.5">
              {startingCheck ? <Loader2 className="animate-spin" size={14} /> : <ExternalLink size={14} />}
              {bgStatus === "not_started" ? "Start background check" : "Try again"}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText size={18} className="text-primary" /> License & insurance documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {DOC_TYPES.map((dt) => {
            const existing = docs.filter((d) => d.document_type === dt.key);
            const statusField = dt.key === "license" ? verification?.license_verification_status
              : dt.key === "insurance" ? verification?.insurance_verification_status
              : null;
            return (
              <div key={dt.key} className="flex items-start justify-between gap-3 pb-4 border-b border-border last:border-0 last:pb-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-foreground">{dt.label}</p>
                    {statusField && statusBadge(statusField)}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{dt.hint}</p>
                  {existing.map((doc) => (
                    <div key={doc.id} className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="truncate max-w-[220px]">{doc.file_name}</span>
                      {doc.status === "rejected" && doc.rejection_reason && (
                        <span className="text-destructive">&mdash; {doc.rejection_reason}</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="shrink-0">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => handleUpload(e, dt.key)}
                      disabled={uploadingType === dt.key}
                    />
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium rounded-md border border-input px-3 py-1.5 hover:bg-muted transition-colors">
                      {uploadingType === dt.key ? <Loader2 className="animate-spin" size={12} /> : <Upload size={12} />}
                      Upload
                    </span>
                  </label>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {(bgStatus === "consider" || bgStatus === "failed") && (
        <div className="rounded-lg border border-orange-500/40 bg-orange-500/10 p-3 flex items-start gap-2 text-sm">
          <ShieldAlert size={16} className="text-orange-600 mt-0.5 shrink-0" />
          <p className="text-orange-800">
            Your background check needs a closer look from our team. We'll follow up by message if we need anything else from you.
          </p>
        </div>
      )}
    </div>
  );
}
