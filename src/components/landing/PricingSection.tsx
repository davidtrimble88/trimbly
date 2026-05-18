import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

type Audience = "homeowner" | "pro";

const homeownerTiers = [
  {
    name: "Free",
    price: "$0",
    period: "",
    description: "Get started with basic home management",
    features: [
      "1 home profile",
      "Search & browse local pros",
      "Create up to 3 job requests/month",
      "Receive pro bids & messages",
      "Basic maintenance reminders",
      "Digital Home Binder (5 items)",
      "Community reviews access",
    ],
    cta: "Get Started Free",
    highlighted: false,
    route: "/auth?mode=signup&type=homeowner&tier=free",
  },
  {
    name: "Home Hero",
    price: "$5",
    period: "/month",
    description: "Full-powered home maintenance on autopilot",
    features: [
      "1 home profile",
      "Unlimited job requests & bidding",
      "AI job estimator (unlimited)",
      "AI Symptom Triage",
      "Advanced maintenance schedules",
      "Priority pro matching",
      "Emergency support channel",
      "Coverage Advisor (AI-powered)",
      "Seasonal checklists",
    ],
    cta: "Start Free Trial",
    highlighted: true,
    route: "/auth?mode=signup&type=homeowner&tier=homeowner_pro",
  },
  {
    name: "Home Super Hero",
    price: "$20",
    period: "/month",
    description: "Manage up to 10 properties from one account",
    features: [
      "Up to 10 home profiles",
      "View homes individually or all together",
      "Everything in Home Hero",
      "Unlimited Digital Home Binder entries",
      "Priority pro matching",
      "Emergency support channel",
      "Seasonal checklists",
    ],
    cta: "Start Free Trial",
    highlighted: false,
    route: "/auth?mode=signup&type=homeowner&tier=multi_pro",
  },
];

const proTiers = [
  {
    name: "Free",
    price: "$0",
    period: "",
    description: "Get listed and start receiving leads",
    features: [
      "Business profile listing",
      "Appear in search results",
      "Up to 5 active bids per month",
      "Customer reviews & ratings",
      "Basic analytics dashboard",
    ],
    cta: "Get Started Free",
    highlighted: false,
    route: "/pro-register?tier=free",
  },
  {
    name: "Pro Provider",
    price: "$29",
    period: "/month",
    description: "More visibility, more leads, more growth",
    features: [
      "Everything in Free",
      "Unlimited bids",
      "Verified Pro badge & faster approvals",
      "Response-time badge",
      "Priority search placement",
      "AI Message Copilot",
      "AI Follow-Up sequences",
      "AI competitor pricing intel",
      "Auto-request reviews (text + email)",
      "Referral credits toward subscription",
      "Local SEO microsite",
      "Yard sign QR codes",
      "Photo portfolio (up to 50 images)",
    ],
    cta: "Start 14-Day Free Trial",
    highlighted: true,
    route: "/pro-register?tier=pro",
  },
];

const PricingSection = () => {
  const navigate = useNavigate();
  const [audience, setAudience] = useState<Audience>("homeowner");
  const tiers = audience === "homeowner" ? homeownerTiers : proTiers;

  return (
    <section id="pricing" className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Pricing</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-muted-foreground text-lg">
            {audience === "homeowner"
              ? "Start free. Upgrade when you want the full power of Trimbly."
              : "Get listed for free. Upgrade to unlock unlimited leads and AI tools."}
          </p>
        </div>

        {/* Audience toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex p-1 rounded-full bg-secondary border border-border">
            <button
              onClick={() => setAudience("homeowner")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                audience === "homeowner"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Homeowner
            </button>
            <button
              onClick={() => setAudience("pro")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                audience === "pro"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pro Provider
            </button>
          </div>
        </div>

        <div className={`grid gap-8 max-w-5xl mx-auto ${audience === "homeowner" ? "md:grid-cols-3" : "md:grid-cols-2 max-w-3xl"}`}>
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
                onClick={() => navigate(tier.route)}
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
