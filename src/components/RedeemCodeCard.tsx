import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tag, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { VikingModeUnlockedDialog } from "@/components/VikingModeUnlockedDialog";

// A code box that lives in Settings/Profile rather than the signup/pricing
// flow, so a partner code (like HEXWOOD) can still be redeemed by someone
// who already has an account — signed up before the program existed, or
// just clicked past the pricing-page box without noticing it.
//
// Redeems directly with no target tier, unlike the pricing-page flows: this
// component has no "plan the user is checking out for" to attach a flexible
// code to. A code with a tier baked in (grants_tier/grants_provider_tier)
// still applies that tier immediately, same as anywhere else — only a fully
// open/flexible code (like HEXWOOD, which intentionally grants none) is
// limited here, which is fine since it has nothing tier-related to grant.
export function RedeemCodeCard() {
  const { toast } = useToast();
  const { user, refreshProfile } = useAuth();
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [showVikingUnlock, setShowVikingUnlock] = useState(false);
  const [vikingPartnerName, setVikingPartnerName] = useState<string | null>(null);

  if (!user) return null;

  const handleRedeem = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setRedeeming(true);
    try {
      const { data, error } = await supabase.rpc("redeem_discount_code" as any, { p_code: trimmed } as any);
      const result = data as any;
      if (error || !result?.success) {
        toast({ title: "Code didn't work", description: result?.error || error?.message, variant: "destructive" });
        return;
      }
      setCode("");
      if (result.unlocks_viking_mode) {
        await refreshProfile();
        setVikingPartnerName(result.partner_name || null);
        setShowVikingUnlock(true);
        return;
      }
      await refreshProfile();
      toast({
        title: "Code applied!",
        description: result.grants_tier || result.grants_provider_tier
          ? "Your plan has been updated."
          : result.description || "Thanks for using a code.",
      });
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <>
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Have a code?</p>
              <p className="text-xs text-muted-foreground">Partner or discount codes apply instantly — no need to sign up again.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Enter a code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleRedeem(); }}
              className="text-sm"
            />
            <Button variant="outline" onClick={handleRedeem} disabled={redeeming || !code.trim()} className="shrink-0">
              {redeeming ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
              Redeem
            </Button>
          </div>
        </CardContent>
      </Card>
      <VikingModeUnlockedDialog
        open={showVikingUnlock}
        partnerName={vikingPartnerName}
        onContinue={() => setShowVikingUnlock(false)}
      />
    </>
  );
}
