import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Zap, Crown, ArrowRight, Loader2, Tag } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TestingWelcomeModal } from "@/components/onboarding/TestingWelcomeModal";

const tiers = [
  {
    name: "Home Hero",
    dbKey: "homeowner_pro",
    icon: Zap,
    price: "$5",
    cadPrice: "CA$7",
    period: "/mo",
    description: "Unlock AI-powered home management",
    features: [
      "1 home",
      "Digital Home Binder (5 items)",
      "Coverage Advisor — AI doc review",
      "Unlimited AI job estimates",
      "Advanced maintenance schedules",
      "Seasonal checklists",
      "Search & message pros",
      "Post jobs to the board",
    ],
    cta: "Start 14-Day Free Trial",
    highlighted: true,
    badge: "Most Popular",
  },
  {
    name: "Home Super Hero",
    dbKey: "multi_pro",
    icon: Crown,
    price: "$20",
    cadPrice: "CA$28",
    period: "/mo",
    description: "For property owners & multi-home families",
    features: [
      "Everything in Home Hero",
      "Up to 10 homes",
      "Unlimited Home Binder items",
      "Emergency support priority",
      "Family member access (coming soon)",
    ],
    cta: "Start 14-Day Free Trial",
    highlighted: false,
  },
];

export default function HomeownerUpsell() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [showTestingWelcome, setShowTestingWelcome] = useState(false);

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
      // Early-access tier selection — no real checkout exists yet, so this
      // just records the choice via a scoped RPC (a user may only set their
      // OWN tier to one of the three real values; see set_own_subscription_tier).
      if (tierKey !== "free" && user) {
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
        // Payments not fully wired yet — let them use the tier during a grace period
        toast({
          title: `${tierKey === "homeowner_pro" ? "Home Hero" : "Home Super Hero"} activated!`,
          description: "Billing will be enabled soon. Enjoy your premium features during the early-access period.",
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
    setRedeeming(true);
    try {
      const { data, error } = await supabase.rpc("redeem_discount_code" as any, { p_code: discountCode.trim() } as any);
      const result = data as any;
      if (error || !result?.success) {
        toast({ title: "Code didn't work", description: result?.error || error?.message, variant: "destructive" });
        return;
      }

      if (result.is_testing_code) {
        // Skip payment/tier-selection entirely — the welcome modal handles
        // the redirect once acknowledged.
        setShowTestingWelcome(true);
        return;
      }

      if (result.grants_tier) {
        toast({ title: "Code applied!", description: "Your plan has been upgraded — no payment needed." });
        goNext();
      } else {
        toast({ title: "Code applied", description: "Your discount is recorded. Pick a plan below to continue." });
      }
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar minimal={onboarding} />
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
                <div className="flex items-baseline gap-1 mt-2 mb-1">
                  <span className="text-4xl font-extrabold text-card-foreground">{tier.price}</span>
                  {tier.period && <span className="text-muted-foreground text-sm">{tier.period} USD</span>}
                </div>
                <p className="text-xs text-muted-foreground mb-3">≈ {tier.cadPrice} {tier.period} CAD</p>
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
                  onClick={() => handleSelect(tier.dbKey)}
                >
                  {loadingTier === tier.dbKey ? (
                    <Loader2 size={16} className="animate-spin mr-2" />
                  ) : null}
                  {tier.cta}
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
            <span className="flex items-center gap-1.5">
              <Check size={14} className="text-primary" /> 14-day free trial
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={14} className="text-primary" /> No credit card required to start trial
            </span>
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
