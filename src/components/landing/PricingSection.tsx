import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "",
    description: "Get started with basic home management",
    features: [
      "1 home profile",
      "Search & browse local pros",
      "Create up to 3 job requests/month",
      "Basic maintenance reminders",
      "Digital Home Binder (5 items)",
      "Community reviews access",
    ],
    cta: "Get Started Free",
    highlighted: false,
  },
  {
    name: "Homeowner Pro",
    price: "$5",
    period: "/month",
    description: "Full-powered home maintenance on autopilot",
    features: [
      "1 home profile",
      "Unlimited job requests",
      "AI job estimator (unlimited)",
      "Advanced maintenance schedules",
      "Priority pro matching (24h SLA)",
      "Emergency support channel",
      "Digital Home Binder (5 items) + export",
      "Seasonal checklists",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Multi-Homeowner Pro",
    price: "$20",
    period: "/month",
    description: "Manage up to 10 properties from one account",
    features: [
      "Up to 10 home profiles",
      "View homes individually or all together",
      "Everything in Homeowner Pro",
      "Unlimited Digital Home Binder entries",
      "Priority pro matching (24h SLA)",
      "Emergency support channel",
      "Seasonal checklists",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
];

const PricingSection = () => {
  const navigate = useNavigate();
  return (
    <section id="pricing" className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Pricing</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-muted-foreground text-lg">
            Start free. Upgrade when you want the full power of HomeHero.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl p-8 border ${
                tier.highlighted
                  ? "border-primary bg-card shadow-xl ring-2 ring-primary/20"
                  : "border-border bg-card"
              }`}
            >
              {tier.highlighted && (
                <span className="inline-block text-xs font-bold uppercase tracking-wider text-primary-foreground bg-primary px-3 py-1 rounded-full mb-4">
                  Most Popular
                </span>
              )}
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
                onClick={() => navigate("/auth")}
              >
                {tier.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
