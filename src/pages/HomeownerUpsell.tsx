import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Star, Zap, Crown, ArrowRight, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const tiers = [
  {
    name: "Home Hero",
    dbKey: "homeowner_pro",
    icon: Zap,
    price: "$5",
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

  const onboarding = searchParams.get("onboarding") === "1";

  const handleSelect = async (tierKey: string) => {
    setLoadingTier(tierKey);

    try {
      // If they chose a paid tier, record the intent in their profile
      if (tierKey !== "free" && user) {
        await supabase
          .from("profiles")
          .update({ subscription_tier: tierKey })
          .eq("id", user.id);
      }

      if (tierKey === "free") {
        toast({ title: "Welcome to HomeHero!", description: "You're all set with the Free plan." });
      } else {
        // Payments not fully wired yet — let them use the tier during a grace period
        toast({
          title: `${tierKey === "homeowner_pro" ? "Home Hero" : "Home Super Hero"} activated!`,
          description: "Billing will be enabled soon. Enjoy your premium features during the early-access period.",
        });
      }

      // Redirect to onboarding or dashboard
      if (onboarding) {
        navigate("/maintenance?onboarding=1");
      } else {
        navigate("/dashboard");
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              Choose Your Plan
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4 font-display">
              Unlock the full power of HomeHero
            </h1>
            <p className="text-muted-foreground text-lg">
              Upgrade to AI-powered maintenance, a Digital Home Binder, and unlimited job estimates.
            </p>
          </div>

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
                <div className="flex items-baseline gap-1 mt-2 mb-2">
                  <span className="text-4xl font-extrabold text-card-foreground">{tier.price}</span>
                  {tier.period && <span className="text-muted-foreground text-sm">{tier.period}</span>}
                </div>
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
              <Check size={14} className="text-primary" /> No credit card required for Free
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={14} className="text-primary" /> Cancel anytime
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={14} className="text-primary" /> 14-day free trial on paid plans
            </span>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
