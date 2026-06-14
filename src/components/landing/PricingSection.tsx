import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

type Audience = "homeowner" | "pro" | "mechanic";

const GARAGE_ADDON_USD = 2;
type Billing = "monthly" | "yearly";

const YEARLY_DISCOUNT = 0.1; // 10% off
const USD_TO_CAD = 1.4;

type Tier = {
  name: string;
  monthlyUsd: number; // 0 = free
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
  routeBase: string;
};

const homeownerTiers: Tier[] = [
  {
    name: "Free",
    monthlyUsd: 0,
    description: "Get started with basic home management",
    features: [
      "1 home profile",
      "Search & browse local pros",
      "Create up to 3 job requests/month",
      "Receive pro bids & messages",
      "In-app messaging with pros",
      "Basic maintenance reminders",
      "Digital Home Binder (5 items)",
      "User Manual Finder",
      "Community reviews access",
    ],
    cta: "Get Started Free",
    highlighted: false,
    routeBase: "/auth?mode=signup&type=homeowner&tier=free",
  },
  {
    name: "Home Hero",
    monthlyUsd: 5,
    description: "Full-powered home maintenance on autopilot",
    features: [
      "1 home profile",
      "Unlimited job requests & bidding",
      "AI Job Estimator (unlimited)",
      "AI Symptom Triage",
      "Maintenance Autopilot schedules",
      "Coverage Advisor (AI warranty & insurance)",
      "Equipment Rentals Marketplace access",
      "E-sign rental agreements + Archive",
      "Priority pro matching",
      "Emergency support channel",
      "Seasonal checklists",
      "Amazon supply recommendations",
      "Add My Garage add-on for +$2/month",
    ],
    cta: "Start Free Trial",
    highlighted: true,
    routeBase: "/auth?mode=signup&type=homeowner&tier=homeowner_pro",
  },
  {
    name: "Home Super Hero",
    monthlyUsd: 20,
    description: "Manage up to 10 properties from one account",
    features: [
      "Up to 10 home profiles",
      "View homes individually or all together",
      "Everything in Home Hero",
      "Unlimited Digital Home Binder entries",
      "Multi-home maintenance dashboard",
      "Priority pro matching",
      "Emergency support channel",
      "Add My Garage add-on for +$2/month",
    ],
    cta: "Start Free Trial",
    highlighted: false,
    routeBase: "/auth?mode=signup&type=homeowner&tier=multi_pro",
  },
];

const proTiers: Tier[] = [
  {
    name: "Free",
    monthlyUsd: 0,
    description: "Get listed and start receiving leads",
    features: [
      "Business profile listing",
      "Appear in local search results",
      "Up to 5 active bids per month",
      "In-app messaging with homeowners",
      "Customer reviews & ratings",
      "Basic analytics dashboard",
    ],
    cta: "Get Started Free",
    highlighted: false,
    routeBase: "/pro-register?tier=free",
  },
  {
    name: "Pro Provider",
    monthlyUsd: 29,
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
      "Rent out your equipment (ESIGN/UETA agreements)",
      "Signed-contract archive + audit trail",
      "Referral credits toward subscription",
      "Local SEO microsite",
      "Yard sign QR codes",
      "Service area, hours & mileage tools",
      "Photo portfolio (up to 50 images)",
    ],
    cta: "Start 14-Day Free Trial",
    highlighted: true,
    routeBase: "/pro-register?tier=pro",
  },
];

const fmtUsd = (n: number) =>
  n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`;
const fmtCad = (n: number) => {
  const v = n * USD_TO_CAD;
  return v % 1 === 0 ? `CA$${v}` : `CA$${v.toFixed(2)}`;
};

const PricingSection = () => {
  const navigate = useNavigate();
  const [audience, setAudience] = useState<Audience>("homeowner");
  const [billing, setBilling] = useState<Billing>("monthly");
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
        <div className="flex justify-center mb-6">
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

        {/* Billing toggle */}
        <div className="flex justify-center items-center gap-3 mb-12">
          <div className="inline-flex p-1 rounded-full bg-secondary border border-border">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                billing === "monthly"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                billing === "yearly"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly
            </button>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
            Save 10%
          </span>
        </div>

        <div className={`grid gap-8 max-w-5xl mx-auto ${audience === "homeowner" ? "md:grid-cols-3" : "md:grid-cols-2 max-w-3xl"}`}>
          {tiers.map((tier) => {
            const isFree = tier.monthlyUsd === 0;
            const yearlyFull = tier.monthlyUsd * 12;
            const yearlyDiscounted = +(yearlyFull * (1 - YEARLY_DISCOUNT)).toFixed(2);
            const yearlySavings = +(yearlyFull - yearlyDiscounted).toFixed(2);
            const showYearly = billing === "yearly" && !isFree;

            const displayUsd = isFree ? 0 : showYearly ? yearlyDiscounted : tier.monthlyUsd;
            const periodLabel = isFree ? "" : showYearly ? "/year" : "/month";
            const route = isFree
              ? tier.routeBase
              : `${tier.routeBase}&billing=${billing}`;

            return (
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
                <div className="flex items-baseline gap-1 mt-3 mb-1">
                  <span className="text-4xl font-extrabold text-card-foreground">{fmtUsd(displayUsd)}</span>
                  {periodLabel && <span className="text-muted-foreground text-sm">{periodLabel} USD</span>}
                </div>
                {!isFree && (
                  <p className="text-xs text-muted-foreground mb-1">
                    ≈ {fmtCad(displayUsd)}{periodLabel ? ` ${periodLabel} CAD` : ""}
                  </p>
                )}
                {showYearly ? (
                  <p className="text-xs font-semibold text-primary mb-3">
                    Save {fmtUsd(yearlySavings)}/yr vs monthly
                  </p>
                ) : !isFree && billing === "yearly" ? null : (
                  !isFree && (
                    <p className="text-xs text-muted-foreground mb-3">
                      or {fmtUsd(yearlyDiscounted)}/yr · save {fmtUsd(yearlySavings)}
                    </p>
                  )
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
                  onClick={() => navigate(route)}
                >
                  {tier.cta}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
