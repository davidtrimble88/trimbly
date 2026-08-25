import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ArrowRight, Loader2, Tag, PartyPopper } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TestingWelcomeModal } from "@/components/onboarding/TestingWelcomeModal";
import { BETA_FREE_ACCESS, formatUsd, formatCad, homeownerTiers } from "@/lib/pricingTiers";

// Only the paid tiers render as cards here — Free is a plain text link
// below (see "No thanks..."), so it's filtered out of the shared list.
const tiers = homeownerTiers.filter((t) => t.monthlyUsd > 0);

export default function HomeownerUpsell() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [showTestingWelcome, setShowTestingWelcome] = useState(false);
  // Set once a code with no fixed tier baked in ("No tier change" for both
  // fields in the staff UI) has been validated — it's applied to whichever
  // plan the user actually picks below, rather than a tier chosen up front.
  const [pendingFlexCode, setPendingFlexCode] = useState<string | null>(null);

  const onboarding = searchParams.get("onboarding") === "1";

  const goNext = () => {
    if (onboarding) {
      navigate("/maintenance?onboarding=1");
    } else {
      navigate("/dashboard");
    }
  };

  const handleSelect = async (tierKey: string) => {
    setLoadingTier(tierKey);

    try {
      let appliedViaCode = false;
      if (tierKey !== "free" && user && pendingFlexCode) {
        // A flexible code was validated earlier but never redeemed — redeem
        // it now for the specific plan just picked, instead of the normal
        // free-during-beta bypass.
        const { data, error } = await supabase.rpc("redeem_discount_code" as any, {
          p_code: pendingFlexCode, p_target_tier: tierKey,
        } as any);
        const result = data as any;
        setPendingFlexCode(null);
        if (error || !result?.success) {
          toast({ title: "Code didn't apply", description: result?.error || error?.message || "Continuing without it.", variant: "destructive" });
          // Fall through to the normal free-during-beta path below rather
          // than blocking the plan they picked over a code issue.
        } else {
          appliedViaCode = true;
        }
      }

      // Early-access tier selection — no real checkout exists yet, so this
      // just records the choice via a scoped RPC (a user may only set their
      // OWN tier to one of the three real values; see set_own_subscription_tier).
      if (tierKey !== "free" && user && !appliedViaCode) {
        const { data, error } = await supabase.rpc("set_own_subscription_tier" as any, { p_tier: tierKey } as any);
        if (error || !(data as any)?.success) {
          toast({ title: "Couldn't update your plan", description: (data as any)?.error || error?.message, variant: "destructive" });
          setLoadingTier(null);
          return;
        }
      }

      if (tierKey === "free") {
        toast({ title: "Welcome to Trimbly!", description: "You're all set with the Free plan." });
      } else {
        toast({
          title: `${tierKey === "homeowner_pro" ? "Home Hero" : "Home Super Hero"} activated!`,
          description: BETA_FREE_ACCESS
            ? "Free during the beta — enjoy full access, no payment needed."
            : "Billing will be enabled soon. Enjoy your premium features during the early-access period.",
        });
      }

      goNext();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoadingTier(null);
    }
  };

  const handleRedeemCode = async () => {
    if (!discountCode.trim() || !user) return;
    const trimmedCode = discountCode.trim();
    setRedeeming(true);
    try {
      // Validate only, without consuming the one-time-per-user redemption —
      // a flexible code (no fixed tier) doesn't actually get redeemed until
      // the user picks a plan below, in handleSelect.
      const { data, error } = await supabase.rpc("validate_discount_code" as any, { p_code: trimmedCode } as any);
      const result = data as any;
      if (error || !result?.success) {
        toast({ title: "Code didn't work", description: result?.error || error?.message, variant: "destructive" });
        return;
      }

      if (result.is_testing_code || result.grants_tier) {
        // Fixed-tier / testing codes redeem immediately, exactly as before.
        const { data: redeemData, error: redeemError } = await supabase.rpc("redeem_discount_code" as any, { p_code: trimmedCode } as any);
        const redeemResult = redeemData as any;
        if (redeemError || !redeemResult?.success) {
          toast({ title: "Code didn't work", description: redeemResult?.error || redeemError?.message, variant: "destructive" });
          return;
        }
        if (redeemResult.is_testing_code) {
          // Skip payment/tier-selection entirely — the welcome modal handles
          // the redirect once acknowledged.
          setShowTestingWelcome(true);
          return;
        }
        toast({ title: "Code applied!", description: "Your plan has been upgraded — no payment needed." });
        goNext();
      } else {
        setPendingFlexCode(trimmedCode);
        toast({ title: "Code applied", description: "Pick a plan below and it'll be applied automatically." });
      }
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar minimal />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              Choose Your Plan
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4 font-display">
              Unlock the full power of Trimbly
            </h1>
            <p className="text-muted-foreground text-lg">
              Upgrade to AI-powered maintenance, a Digital Home Binder, and unlimited job estimates.
            </p>
            {BETA_FREE_ACCESS && (
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                <PartyPopper size={16} /> Free public beta — every plan is unlocked, no payment info needed
              </div>
            )}
          </div>

          {user && (
            <div className="max-w-md mx-auto mb-10">
              <div className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Tag size={16} className="text-primary shrink-0" />
                  <Input
                    placeholder="Have a discount code?"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleRedeemCode(); }}
                    className="text-sm"
                  />
                </div>
                <Button variant="outline" onClick={handleRedeemCode} disabled={redeeming || !discountCode.trim()}>
                  {redeeming ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
                  Apply
                </Button>
              </div>
              {pendingFlexCode && (
                <p className="text-xs text-primary text-center mt-2">
                  "{pendingFlexCode}" is ready — pick a plan below to apply it.
                </p>
              )}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl p-6 md:p-8 border relative flex flex-col ${
                  tier.highlighted
                    ? "border-primary bg-card shadow-xl ring-2 ring-primary/20 scale-[1.02]"
                    : "border-border bg-card"
                }`}
              >
                {tier.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold uppercase tracking-wider text-primary-foreground bg-primary px-4 py-1 rounded-full">
                    {tier.badge}
                  </span>
                )}

                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <tier.icon size={20} className="text-primary" />
                </div>

                <h3 className="font-bold text-xl text-card-foreground">{tier.name}</h3>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mt-2 mb-1">
                  <span className="text-4xl font-extrabold text-card-foreground">{formatUsd(tier.monthlyUsd)}</span>
                  <span className="text-muted-foreground text-sm">/mo USD</span>
                  {BETA_FREE_ACCESS && (
                    <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-xs font-bold px-2.5 py-1">
                      Free during beta
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {BETA_FREE_ACCESS ? "No payment needed while Trimbly is in beta — this is what it'll cost after." : `≈ ${formatCad(tier.monthlyUsd)}/mo CAD`}
                </p>
                <p className="text-sm text-muted-foreground mb-6">{tier.description}</p>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-card-foreground">
                      <Check size={16} className="text-primary mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={tier.highlighted ? "default" : "outline"}
                  size="lg"
                  disabled={loadingTier !== null}
                  onClick={() => handleSelect(tier.key)}
                >
                  {loadingTier === tier.key ? (
                    <Loader2 size={16} className="animate-spin mr-2" />
                  ) : null}
                  {BETA_FREE_ACCESS ? "Unlock — Free During Beta" : tier.ctaPaid}
                  {tier.highlighted && <ArrowRight size={16} className="ml-2" />}
                </Button>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <button
              onClick={() => handleSelect("free")}
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
            >
              No thanks, I'll stick with Free for now
            </button>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Check size={14} className="text-primary" /> Cancel anytime
            </span>
            {BETA_FREE_ACCESS ? (
              <span className="flex items-center gap-1.5">
                <Check size={14} className="text-primary" /> Free during the beta — no credit card, ever
              </span>
            ) : (
              <>
                <span className="flex items-center gap-1.5">
                  <Check size={14} className="text-primary" /> 14-day free trial
                </span>
                <span className="flex items-center gap-1.5">
                  <Check size={14} className="text-primary" /> No credit card required to start trial
                </span>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
      <TestingWelcomeModal
        open={showTestingWelcome}
        onAcknowledge={() => {
          setShowTestingWelcome(false);
          toast({ title: "You're in!", description: "Full access unlocked for testing. Thanks for helping us out." });
          goNext();
        }}
      />
    </div>
  );
}
