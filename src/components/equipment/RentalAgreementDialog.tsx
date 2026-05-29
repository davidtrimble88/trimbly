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
  const [agreement, setAgreement] = useState<Agreement | null>(existingAgreement || null);

  useEffect(() => {
    setAgreement(existingAgreement || null);
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
    }
  }, [existingAgreement, open]);

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
    setSaving(true);
    const termsSnapshot = `${rental.terms || "(No custom terms provided by owner)"}\n\n${LEGAL_BOILERPLATE}`;
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
        insurance_acknowledged: false,
        status: "sent",
        owner_signature: signature.trim(),
        owner_signed_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) {
      toast({ title: "Could not send", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }
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
    if (rental?.insurance_required && !insuranceAck) {
      toast({ title: "Insurance acknowledgment required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("rental_agreements")
      .update({
        status: "accepted",
        renter_signature: signature.trim(),
        renter_signed_at: new Date().toISOString(),
        insurance_acknowledged: insuranceAck,
      })
      .eq("id", agreement.id);
    if (error) {
      toast({ title: "Could not sign", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }
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
            ) : "Fill in the rental period to send a signed agreement to the owner."}
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

          <div>
            <Label>Agreement terms</Label>
            <Textarea
              readOnly
              value={agreement ? agreement.terms_snapshot : `${rental?.terms || "(No custom terms provided by owner)"}\n\n${LEGAL_BOILERPLATE}`}
              className="min-h-[180px] text-xs font-mono"
            />
          </div>

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

          {/* Signature line: shown to creator (renter) and to owner when reviewing */}
          {((!agreement && isRenter) || (agreement && isOwner && !agreement.owner_signature && agreement.status === "sent")) && (
            <div>
              <Label>Type your full legal name to e-sign</Label>
              <Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Your full legal name" />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {!agreement && (
            <Button onClick={createAgreement} disabled={saving}>
              {saving && <Loader2 size={14} className="animate-spin mr-1" />} Sign & send to owner
            </Button>
          )}
          {agreement && isOwner && agreement.status === "sent" && !agreement.owner_signature && (
            <>
              <Button variant="destructive" onClick={decline} disabled={saving}>Decline</Button>
              <Button onClick={ownerSign} disabled={saving}>
                {saving && <Loader2 size={14} className="animate-spin mr-1" />} Sign & accept
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
