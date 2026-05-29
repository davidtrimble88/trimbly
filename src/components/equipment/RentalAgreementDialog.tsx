import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileSignature } from "lucide-react";

export type RentalForAgreement = {
  id: string;
  title: string;
  owner_user_id: string;
  owner_provider_id: string;
  price_hour: number | null;
  price_day: number | null;
  price_week: number | null;
  deposit_amount: number;
  currency: string;
  terms: string;
  insurance_required: boolean;
};

type Agreement = {
  id: string;
  rental_id: string;
  owner_user_id: string;
  renter_user_id: string;
  start_date: string;
  end_date: string;
  rate_basis: string;
  rate_amount: number;
  quantity: number;
  subtotal: number;
  deposit: number;
  total: number;
  currency: string;
  terms_snapshot: string;
  insurance_acknowledged: boolean;
  status: string;
  owner_signature: string | null;
  renter_signature: string | null;
  owner_signed_at: string | null;
  renter_signed_at: string | null;
};

const LEGAL_BOILERPLATE = `LEGAL TERMS — EQUIPMENT RENTAL AGREEMENT

1. PARTIES & PLATFORM. Trimbly is a venue only and is NOT a party to this agreement. The Owner and Renter are solely responsible for the equipment, its condition, insurance, payment, damages, and compliance with all applicable laws.

2. RENTAL PERIOD. Renter agrees to return the equipment by the end date in the same condition as received, normal wear and tear excepted.

3. DEPOSIT & PAYMENT. Payment and any required security deposit are handled directly between the parties off-platform. Renter is responsible for the full replacement cost of lost or destroyed equipment.

4. CONDITION & INSPECTION. Renter has inspected (or will inspect at pickup) the equipment and accepts it in its current condition. Owner warrants the equipment is in safe operating condition to the best of their knowledge.

5. LIABILITY & INDEMNIFICATION. Renter assumes all risk of use and agrees to indemnify and hold harmless Owner and Trimbly from any claims, damages, or injuries arising from Renter's use of the equipment.

6. INSURANCE. Renter is responsible for maintaining adequate insurance covering the rental equipment and any third-party liability. If Owner requires proof of insurance, Renter must provide it before pickup.

7. LATE RETURN. Late returns may be charged at 1.5x the agreed rate per day until returned.

8. GOVERNING LAW. This agreement is governed by the laws of the state where the equipment is located.

By typing your full legal name as a signature below, both parties agree to be electronically bound to these terms.`;

const ESIGN_DISCLOSURE = `ELECTRONIC RECORDS AND SIGNATURES DISCLOSURE (ESIGN Act / UETA)

By checking the consent box and typing your full legal name below, you agree that:
• You consent to conduct this transaction by electronic means, including the use of electronic records and electronic signatures, under the U.S. ESIGN Act (15 U.S.C. § 7001 et seq.) and the Uniform Electronic Transactions Act (UETA).
• Your typed name constitutes your legally binding electronic signature, with the same force and effect as a handwritten signature.
• You can request a paper copy of this signed agreement at any time by contacting the other party or Trimbly support, and you may print or save this document for your records.
• You may withdraw your consent to electronic records by declining this agreement before signing. Withdrawing consent after signing does not invalidate the executed contract.
• The hardware/software needed to access these records is any modern web browser plus a way to read PDF files; the same requirements apply to retain copies.
• Trimbly will retain a permanent, tamper-evident record of this agreement, including a SHA-256 hash of the signed terms and an audit log of the signing event (IP address, user-agent, timestamp, and account email).`;

// SHA-256 of the locked terms snapshot — used to prove the signed contract was not altered later.
async function sha256Hex(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function fetchClientIp(): Promise<string | null> {
  try {
    const r = await fetch("https://api.ipify.org?format=json");
    if (!r.ok) return null;
    const j = await r.json();
    return j.ip || null;
  } catch { return null; }
}

type AuditRow = {
  id: string;
  agreement_id: string;
  user_id: string;
  role: string;
  event: string;
  signature_name: string | null;
  email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  terms_hash: string | null;
  esign_consent: boolean;
  created_at: string;
};

export default function RentalAgreementDialog({
  open,
  onOpenChange,
  rental,
  existingAgreement,
  mode,
  renterUserId,
  renterProviderId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rental: RentalForAgreement | null;
  existingAgreement?: Agreement | null;
  mode: "create" | "view";
  /** Required when owner is creating a new agreement to send to a specific renter */
  renterUserId?: string;
  renterProviderId?: string | null;
  onSaved?: () => void;
}) {


  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rateBasis, setRateBasis] = useState<"hour" | "day" | "week">("day");
  const [quantity, setQuantity] = useState<number>(1);
  const [insuranceAck, setInsuranceAck] = useState(false);
  const [signature, setSignature] = useState("");
  const [customTerms, setCustomTerms] = useState("");
  const [agreement, setAgreement] = useState<Agreement | null>(existingAgreement || null);
  const [esignConsent, setEsignConsent] = useState(false);
  const [auditTrail, setAuditTrail] = useState<AuditRow[]>([]);

  useEffect(() => {
    setAgreement(existingAgreement || null);
    setEsignConsent(false);
    if (existingAgreement) {
      setStartDate(existingAgreement.start_date);
      setEndDate(existingAgreement.end_date);
      setRateBasis(existingAgreement.rate_basis as any);
      setQuantity(Number(existingAgreement.quantity));
      setInsuranceAck(existingAgreement.insurance_acknowledged);
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setStartDate(today);
      setEndDate(today);
      setQuantity(1);
      setInsuranceAck(false);
      setSignature("");
      setCustomTerms(rental?.terms || "");
    }
  }, [existingAgreement, open, rental]);

  // Load audit trail for existing agreement
  useEffect(() => {
    if (!agreement?.id || !open) { setAuditTrail([]); return; }
    (async () => {
      const { data } = await supabase
        .from("agreement_audit_log" as any)
        .select("*")
        .eq("agreement_id", agreement.id)
        .order("created_at", { ascending: true });
      setAuditTrail((data as any) || []);
    })();
  }, [agreement?.id, open, saving]);



  const isOwner = !!user && (
    (agreement && user.id === agreement.owner_user_id) ||
    (!agreement && !!rental && user.id === rental.owner_user_id)
  );
  const isRenter = !!user && !!agreement && user.id === agreement.renter_user_id;

  const rateAmount = useMemo(() => {
    if (agreement) return Number(agreement.rate_amount);
    if (!rental) return 0;
    if (rateBasis === "hour") return Number(rental.price_hour || 0);
    if (rateBasis === "week") return Number(rental.price_week || 0);
    return Number(rental.price_day || 0);
  }, [rental, rateBasis, agreement]);

  const subtotal = useMemo(() => +(rateAmount * quantity).toFixed(2), [rateAmount, quantity]);
  const deposit = agreement ? Number(agreement.deposit) : Number(rental?.deposit_amount || 0);
  const total = +(subtotal + deposit).toFixed(2);
  const currency = agreement?.currency || rental?.currency || "USD";

  // OWNER creates and pre-signs the agreement, then sends it to the renter for acceptance.
  const createAgreement = async () => {
    if (!user || !rental) return;
    if (user.id !== rental.owner_user_id) {
      toast({ title: "Only the equipment owner can create an agreement", variant: "destructive" });
      return;
    }
    if (!renterUserId) {
      toast({ title: "Pick a renter to send this agreement to", variant: "destructive" });
      return;
    }
    if (!startDate || !endDate) {
      toast({ title: "Pick dates", variant: "destructive" });
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      toast({ title: "End date must be after start", variant: "destructive" });
      return;
    }
    if (!rateAmount) {
      toast({ title: "Set a price for that basis on the listing first", variant: "destructive" });
      return;
    }
    if (!signature.trim()) {
      toast({ title: "Type your full legal name to sign", variant: "destructive" });
      return;
    }
    if (!esignConsent) {
      toast({ title: "ESIGN consent required", description: "Check the box agreeing to use electronic records and signatures.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const termsSnapshot = `${customTerms.trim() || "(No custom terms provided by owner)"}\n\n${LEGAL_BOILERPLATE}`;
    const termsHash = await sha256Hex(termsSnapshot);
    const signedAt = new Date().toISOString();

    const { data, error } = await supabase
      .from("rental_agreements")
      .insert({
        rental_id: rental.id,
        owner_user_id: user.id,
        renter_user_id: renterUserId,
        owner_provider_id: rental.owner_provider_id,
        renter_provider_id: renterProviderId ?? null,
        start_date: startDate,
        end_date: endDate,
        rate_basis: rateBasis,
        rate_amount: rateAmount,
        quantity,
        subtotal,
        deposit,
        total,
        currency,
        terms_snapshot: termsSnapshot,
        terms_hash: termsHash,
        insurance_acknowledged: false,
        status: "sent",
        owner_signature: signature.trim(),
        owner_signed_at: signedAt,
        owner_esign_consent: true,
      } as any)
      .select()
      .single();
    if (error) {
      toast({ title: "Could not send", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // Write tamper-evident audit log entry for the owner's signing event
    const ip = await fetchClientIp();
    await supabase.from("agreement_audit_log" as any).insert({
      agreement_id: (data as any).id,
      user_id: user.id,
      role: "owner",
      event: "signed",
      signature_name: signature.trim(),
      email: user.email || null,
      ip_address: ip,
      user_agent: navigator.userAgent,
      terms_hash: termsHash,
      esign_consent: true,
    });

    // Notify renter via in-app message
    await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: renterUserId,
      subject: `Rental agreement: ${rental.title}`,
      body: `I've sent you a rental agreement for "${rental.title}" from ${startDate} to ${endDate}. Please review and sign in the Equipment Marketplace.`,
      rental_id: rental.id,
    } as any);
    toast({ title: "Agreement sent", description: "The renter will review and sign." });
    setAgreement(data as any);
    setSaving(false);
    onSaved?.();
  };


  // RENTER signs to accept the owner-created agreement.
  const renterAccept = async () => {
    if (!user || !agreement) return;
    if (!signature.trim()) {
      toast({ title: "Type your full legal name to sign", variant: "destructive" });
      return;
    }
    if (!esignConsent) {
      toast({ title: "ESIGN consent required", description: "Check the box agreeing to use electronic records and signatures.", variant: "destructive" });
      return;
    }
    if (rental?.insurance_required && !insuranceAck) {
      toast({ title: "Insurance acknowledgment required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const signedAt = new Date().toISOString();
    // Verify the locked terms snapshot still matches its hash (tamper check before counter-signing)
    if (agreement.terms_snapshot) {
      const recomputed = await sha256Hex(agreement.terms_snapshot);
      if ((agreement as any).terms_hash && (agreement as any).terms_hash !== recomputed) {
        toast({ title: "Integrity check failed", description: "The agreement contents have changed since they were sent. Refusing to sign.", variant: "destructive" });
        setSaving(false);
        return;
      }
    }
    const { error } = await supabase
      .from("rental_agreements")
      .update({
        status: "accepted",
        renter_signature: signature.trim(),
        renter_signed_at: signedAt,
        renter_esign_consent: true,
        insurance_acknowledged: insuranceAck,
      } as any)
      .eq("id", agreement.id);
    if (error) {
      toast({ title: "Could not sign", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    const ip = await fetchClientIp();
    await supabase.from("agreement_audit_log" as any).insert({
      agreement_id: agreement.id,
      user_id: user.id,
      role: "renter",
      event: "signed",
      signature_name: signature.trim(),
      email: user.email || null,
      ip_address: ip,
      user_agent: navigator.userAgent,
      terms_hash: (agreement as any).terms_hash || null,
      esign_consent: true,
    });

    await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: agreement.owner_user_id,
      subject: `Rental agreement accepted`,
      body: `The renter has signed and accepted your rental agreement. You're all set — coordinate pickup directly.`,
      rental_id: agreement.rental_id,
    } as any);
    toast({ title: "Signed & accepted" });
    setSaving(false);
    onOpenChange(false);
    onSaved?.();
  };

  const decline = async () => {
    if (!user || !agreement) return;
    setSaving(true);
    await supabase.from("rental_agreements").update({ status: "declined" }).eq("id", agreement.id);
    const ip = await fetchClientIp();
    await supabase.from("agreement_audit_log" as any).insert({
      agreement_id: agreement.id,
      user_id: user.id,
      role: user.id === agreement.owner_user_id ? "owner" : "renter",
      event: "declined",
      signature_name: null,
      email: user.email || null,
      ip_address: ip,
      user_agent: navigator.userAgent,
      terms_hash: (agreement as any).terms_hash || null,
      esign_consent: false,
    });
    await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: agreement.owner_user_id,
      subject: `Rental agreement declined`,
      body: `The renter has declined the rental agreement.`,
      rental_id: agreement.rental_id,
    } as any);
    toast({ title: "Declined" });
    setSaving(false);
    onOpenChange(false);
    onSaved?.();
  };


  const printAgreement = () => {
    const body = agreement?.terms_snapshot
      || `${customTerms.trim() || "(No custom terms provided by owner)"}\n\n${LEGAL_BOILERPLATE}`;
    const header = `Equipment Rental Agreement\n${rental?.title || ""}\n${startDate} → ${endDate}\nRate: $${rateAmount.toFixed(2)} / ${rateBasis} × ${quantity}\nSubtotal: $${subtotal.toFixed(2)}  Deposit: $${deposit.toFixed(2)}  Total: $${total.toFixed(2)} ${currency}\n\n`;
    const ownerSig = agreement?.owner_signature ? `Owner: ${agreement.owner_signature} (${agreement.owner_signed_at ? new Date(agreement.owner_signed_at).toLocaleString() : ""})` : "Owner: __________________________";
    const renterSig = agreement?.renter_signature ? `Renter: ${agreement.renter_signature} (${agreement.renter_signed_at ? new Date(agreement.renter_signed_at).toLocaleString() : ""})` : "Renter: __________________________";
    const escaped = (header + body).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
    const html = `<!doctype html><html><head><title>Rental Agreement</title><style>body{font-family:ui-sans-serif,system-ui,sans-serif;padding:32px;max-width:780px;margin:auto;color:#111}h1{font-size:18px;margin:0 0 12px}pre{white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:12px;line-height:1.5}.sig{margin-top:32px;display:flex;justify-content:space-between;font-size:12px}</style></head><body><h1>Equipment Rental Agreement</h1><pre>${escaped}</pre><div class="sig"><div>${ownerSig}</div><div>${renterSig}</div></div><script>window.onload=()=>window.print()</script></body></html>`;
    const w = window.open("", "_blank");
    if (!w) {
      toast({ title: "Pop-up blocked", description: "Allow pop-ups to print.", variant: "destructive" });
      return;
    }
    w.document.write(html);
    w.document.close();
  };

  const resendAgreement = async () => {
    if (!user || !agreement || !rental) return;
    if (user.id !== agreement.owner_user_id) return;
    setSaving(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: agreement.renter_user_id,
      subject: `Rental agreement: ${rental.title}`,
      body: `Reminder: rental agreement for "${rental.title}" from ${agreement.start_date} to ${agreement.end_date}. Please review and sign in the Equipment Marketplace.`,
      rental_id: rental.id,
    } as any);
    setSaving(false);
    if (error) {
      toast({ title: "Could not send", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Agreement re-sent to renter" });
  };



  if (!rental && !agreement) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature size={18} /> Equipment Rental Agreement
          </DialogTitle>
          <DialogDescription>
            {agreement ? (
              <Badge variant="outline" className="mt-1">Status: {agreement.status}</Badge>
            ) : "Fill in the rental period to send a signed agreement to the renter."}
          </DialogDescription>

        </DialogHeader>

        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={!!agreement} />
            </div>
            <div>
              <Label>End date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={!!agreement} />
            </div>
            <div>
              <Label>Rate basis</Label>
              <select
                value={rateBasis}
                onChange={(e) => setRateBasis(e.target.value as any)}
                disabled={!!agreement}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {rental?.price_hour ? <option value="hour">Per hour (${rental.price_hour})</option> : null}
                {rental?.price_day ? <option value="day">Per day (${rental.price_day})</option> : null}
                {rental?.price_week ? <option value="week">Per week (${rental.price_week})</option> : null}
              </select>
            </div>
            <div>
              <Label>Quantity ({rateBasis}s)</Label>
              <Input
                type="number"
                min={1}
                step="0.5"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                disabled={!!agreement}
              />
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm space-y-1">
            <div className="flex justify-between"><span>Rate</span><span>${rateAmount.toFixed(2)} / {rateBasis}</span></div>
            <div className="flex justify-between"><span>Subtotal ({quantity} × {rateBasis}s)</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Security deposit</span><span>${deposit.toFixed(2)}</span></div>
            <div className="flex justify-between font-semibold border-t border-border pt-1 mt-1">
              <span>Total ({currency})</span><span>${total.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground pt-1">Payment is handled directly between Owner and Renter off-platform.</p>
          </div>

          {(rental?.insurance_required || agreement?.insurance_acknowledged) && (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={insuranceAck}
                onCheckedChange={(v) => setInsuranceAck(v === true)}
                disabled={!!agreement}
              />
              <span>I confirm I will maintain adequate insurance covering this equipment and any third-party liability during the rental period.</span>
            </label>
          )}

          {agreement ? (
            <div>
              <Label>Agreement terms</Label>
              <Textarea
                readOnly
                value={agreement.terms_snapshot}
                className="min-h-[180px] text-xs font-mono"
              />
            </div>
          ) : (
            <>
              <div>
                <Label>Custom rental terms (editable)</Label>
                <Textarea
                  value={customTerms}
                  onChange={(e) => setCustomTerms(e.target.value)}
                  placeholder="Add any specific terms for this rental — pickup times, restrictions, late fees, cleaning expectations, etc."
                  className="min-h-[120px] text-sm"
                  disabled={!isOwner}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  These custom terms will be saved with the agreement. The standard legal terms below are locked and cannot be edited.
                </p>
              </div>
              <div>
                <Label>Standard legal terms (locked)</Label>
                <Textarea
                  readOnly
                  value={LEGAL_BOILERPLATE}
                  className="min-h-[160px] text-xs font-mono bg-muted/40"
                />
              </div>
            </>
          )}


          {agreement && (
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded border border-border p-2">
                <div className="font-semibold mb-1">Renter signature</div>
                {agreement.renter_signature
                  ? <div>{agreement.renter_signature} · {agreement.renter_signed_at ? new Date(agreement.renter_signed_at).toLocaleString() : ""}</div>
                  : <div className="text-muted-foreground">Not signed</div>}
              </div>
              <div className="rounded border border-border p-2">
                <div className="font-semibold mb-1">Owner signature</div>
                {agreement.owner_signature
                  ? <div>{agreement.owner_signature} · {agreement.owner_signed_at ? new Date(agreement.owner_signed_at).toLocaleString() : ""}</div>
                  : <div className="text-muted-foreground">Not signed</div>}
              </div>
            </div>
          )}

          {/* Signature line: shown to owner when creating, or to renter when accepting */}
          {((!agreement && isOwner) || (agreement && isRenter && !agreement.renter_signature && agreement.status === "sent")) && (
            <div>
              <Label>Type your full legal name to e-sign</Label>
              <Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Your full legal name" />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button variant="outline" onClick={printAgreement}>Print / Save PDF</Button>
          {agreement && isOwner && agreement.status !== "declined" && (
            <Button variant="outline" onClick={resendAgreement} disabled={saving}>Re-send to renter</Button>
          )}

          {!agreement && isOwner && (
            <Button onClick={createAgreement} disabled={saving}>
              {saving && <Loader2 size={14} className="animate-spin mr-1" />} Sign & send to renter
            </Button>
          )}
          {agreement && isRenter && agreement.status === "sent" && !agreement.renter_signature && (
            <>
              <Button variant="destructive" onClick={decline} disabled={saving}>Decline</Button>
              <Button onClick={renterAccept} disabled={saving}>
                {saving && <Loader2 size={14} className="animate-spin mr-1" />} Sign & accept
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
