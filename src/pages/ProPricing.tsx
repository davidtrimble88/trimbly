import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, Star, Zap, Loader2, PartyPopper, Tag } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { startProviderSubscriptionCheckout } from "@/lib/billing";

// Trimbly is in a free public beta — every plan is unlocked at no cost, no
// payment info collected. Flip to false once beta ends and real Stripe
// billing (still fully wired below, just bypassed for now) should resume.
const BETA_FREE_ACCESS = true;

const tiers = [
  {
    name: "Free",
    icon: Star,
    price: "$0",
    cadPrice: "CA$0",
    period: "",
    description: "Get listed and start receiving leads",
    features: [
      "Business profile listing",
      "Appear in search results",
      "Customer reviews & ratings",
      "Basic analytics dashboard",
    ],
    cta: "Get Started Free",
    highlighted: false,
    tier: "free",
  },
  {
    name: "Pro",
    icon: Zap,
    price: "$29",
    cadPrice: "CA$40",
    period: "/month",
    description: "More visibility, more leads, more growth",
    features: [
      "Everything in Free",
      "Priority search placement",
      "Verified Pro badge",
      "Detailed performance analytics",
      "Direct messaging with homeowners",
      "Photo portfolio (up to 10 images)",
    ],
    cta: "Start 14-Day Free Trial",
    highlighted: true,
    tier: "pro",
  },
];

const ProPricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [hasProvider, setHasProvider] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    if (!user) { setHasProvider(false); return; }
    (async () => {
      const { data } = await supabase.from("providers").select("id").eq("user_id", user.id).maybeSingle();
      setHasProvider(!!data);
    })();
  }, [user]);

  const handleSelect = async (tierKey: string) => {
    if (tierKey === "pro" && hasProvider) {
      setUpgrading(true);
      if (BETA_FREE_ACCESS) {
        const { data, error } = await supabase.rpc("set_own_provider_tier" as any, { p_tier: "pro" } as any);
        setUpgrading(false);
        if (error || !(data as any)?.success) {
          toast({ title: "Couldn't activate Pro", description: (data as any)?.error || error?.message, variant: "destructive" });
          return;
        }
        toast({ title: "Pro activated!", description: "Free during the beta — no payment needed." });
        navigate("/pro-dashboard");
        return;
      }
      const { url, error } = await startProviderSubscriptionCheckout("pro");
      setUpgrading(false);
      if (error) { toast({ title: "Couldn't start checkout", description: error, variant: "destructive" }); return; }
      if (url) window.location.href = url;
      return;
    }
    navigate(`/pro-register?tier=${tierKey}`);
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
      if (result.grants_provider_tier || result.grants_tier) {
        toast({ title: "Code applied!", description: "Your plan has been upgraded — no payment needed." });
        navigate(hasProvider ? "/pro-dashboard" : "/pro-register?tier=pro");
      } else {
        toast({ title: "Code applied", description: "Your discount is recorded." });
      }
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar minimal />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft size={16} /> Back to home
          </Link>

          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">For Service Providers</p>
            <h1 className="text-3xl md:text-5xl font-extrabold text-foreground mb-4 font-display">
              Grow your business with Trimbly
            </h1>
            <p className="text-muted-foreground text-lg">
              Choose the plan that matches your ambition. Upgrade or downgrade anytime.
            </p>
            {BETA_FREE_ACCESS && (
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                <PartyPopper size={16} /> Free public beta — every plan is unlocked, no payment info needed
              </div>
            )}
          </div>

          {user && hasProvider && (
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

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl p-8 border relative ${
                  tier.highlighted
                    ? "border-primary bg-card shadow-xl ring-2 ring-primary/20"
                    : "border-border bg-card"
                }`}
              >
                {tier.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold uppercase tracking-wider text-primary-foreground bg-primary px-4 py-1 rounded-full">
                    Most Popular
                  </span>
                )}
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <tier.icon size={20} className="text-primary" />
                </div>
                <h3 className="font-bold text-xl text-card-foreground">{tier.name}</h3>
                <div className="flex items-baseline gap-1 mt-3 mb-1">
                  {BETA_FREE_ACCESS && tier.tier === "pro" ? (
                    <>
                      <span className="text-4xl font-extrabold text-card-foreground">Free</span>
                      <span className="text-muted-foreground text-sm">during beta</span>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl font-extrabold text-card-foreground">{tier.price}</span>
                      {tier.period && <span className="text-muted-foreground text-sm">{tier.period} USD</span>}
                    </>
                  )}
                </div>
                {!(BETA_FREE_ACCESS && tier.tier === "pro") && (
                  <p className="text-xs text-muted-foreground mb-3">≈ {tier.cadPrice}{tier.period ? ` ${tier.period} CAD` : " CAD"}</p>
                )}
                {BETA_FREE_ACCESS && tier.tier === "pro" && (
                  <p className="text-xs text-muted-foreground mb-3">Regularly {tier.price}{tier.period} — free while Trimbly is in beta</p>
                )}
                <p className="text-sm text-muted-foreground mb-6">{tier.description}</p>
                <ul className="space-y-3 mb-8">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-card-foreground">
                      <Check size={16} className="text-primary mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={tier.highlighted ? "default" : "outline"}
                  size="lg"
                  onClick={() => handleSelect(tier.tier)}
                  disabled={upgrading}
                >
                  {upgrading ? <Loader2 size={16} className="animate-spin mr-1.5" /> : null}
                  {hasProvider && tier.tier === "pro"
                    ? (BETA_FREE_ACCESS ? "Unlock Pro — free" : "Upgrade to Pro")
                    : (BETA_FREE_ACCESS && tier.tier === "pro" ? "Get Started — Free Beta" : tier.cta)}
                </Button>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto mt-20 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-8">Frequently Asked Questions</h2>
            <div className="text-left space-y-6">
              {[
                ...(BETA_FREE_ACCESS
                  ? [{ q: "Will I be charged when the beta ends?", a: "No. We'll email everyone before any billing starts, and you can downgrade to Free at any time — nothing is charged automatically." }]
                  : []),
                { q: "Are there any additional fees?", a: "No. We only charge the monthly subscription — Trimbly does not take any portion of what you earn from your jobs." },
                { q: "Can I switch plans later?", a: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect on your next billing cycle." },
                { q: "Is there a contract?", a: "No contracts. All plans are month-to-month. Cancel anytime with no penalties." },
                ...(BETA_FREE_ACCESS
                  ? []
                  : [{ q: "What payment methods do you accept?", a: "We accept all major credit cards, debit cards, and ACH bank transfers." }]),
                { q: "Do I need a license to register?", a: "While not required to create an account, we encourage all providers to add their license information. Licensed pros get a verified badge." },
              ].map(faq => (
                <div key={faq.q} className="border border-border rounded-xl p-5">
                  <h3 className="font-semibold text-foreground mb-1">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProPricing;
