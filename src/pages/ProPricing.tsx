import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, Star, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const tiers = [
  {
    name: "Free",
    icon: Star,
    price: "$0",
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
    period: "/month",
    description: "More visibility, more leads, more growth",
    features: [
      "Everything in Free",
      "Priority search placement",
      "Verified Pro badge",
      "Detailed performance analytics",
      "Direct messaging with homeowners",
      "Photo portfolio (up to 50 images)",
    ],
    cta: "Start 14-Day Free Trial",
    highlighted: true,
    tier: "pro",
  },
];

const ProPricing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft size={16} /> Back to home
          </Link>

          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">For Service Providers</p>
            <h1 className="text-3xl md:text-5xl font-extrabold text-foreground mb-4 font-display">
              Grow your business with HomeHero
            </h1>
            <p className="text-muted-foreground text-lg">
              Choose the plan that matches your ambition. Upgrade or downgrade anytime.
            </p>
          </div>

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
                <div className="flex items-baseline gap-1 mt-3 mb-2">
                  <span className="text-4xl font-extrabold text-card-foreground">{tier.price}</span>
                  {tier.period && <span className="text-muted-foreground text-sm">{tier.period}</span>}
                </div>
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
                  onClick={() => navigate(`/pro-register?tier=${tier.tier}`)}
                >
                  {tier.cta}
                </Button>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto mt-20 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-8">Frequently Asked Questions</h2>
            <div className="text-left space-y-6">
              {[
                { q: "Can I switch plans later?", a: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect on your next billing cycle." },
                { q: "Is there a contract?", a: "No contracts. All plans are month-to-month. Cancel anytime with no penalties." },
                { q: "What payment methods do you accept?", a: "We accept all major credit cards, debit cards, and ACH bank transfers." },
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
