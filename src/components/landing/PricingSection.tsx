import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import {
  BETA_FREE_ACCESS,
  formatUsd as fmtUsd,
  formatCad as fmtCad,
  homeownerTiers,
  providerTiers,
  mechanicTiers,
  type PricingTier,
} from "@/lib/pricingTiers";

type Audience = "homeowner" | "pro" | "mechanic";

const GARAGE_ADDON_USD = 2;
type Billing = "monthly" | "yearly";

const YEARLY_DISCOUNT = 0.1; // 10% off

const routeBaseFor = (audience: Audience, tier: PricingTier) => {
  if (audience === "homeowner") return `/auth?mode=signup&type=homeowner&tier=${tier.key}`;
  if (audience === "pro") return `/pro-register?tier=${tier.key}`;
  return `/mechanic-register?tier=${tier.key}`;
};

const PricingSection = () => {
  const navigate = useNavigate();
  const [audience, setAudience] = useState<Audience>("homeowner");
  const [billing, setBilling] = useState<Billing>("monthly");
  const tiers = audience === "homeowner" ? homeownerTiers : audience === "pro" ? providerTiers : mechanicTiers;

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
              : audience === "mechanic"
              ? "List your shop free. Upgrade to unlock unlimited vehicle leads and AI tools."
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
            <button
              onClick={() => setAudience("mechanic")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                audience === "mechanic"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mechanic
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
            const routeBase = routeBaseFor(audience, tier);
            const route = isFree ? routeBase : `${routeBase}&billing=${billing}`;

            return (
              <div
                key={tier.name}
                className={`relative rounded-2xl p-8 border transition-transform ${
                  tier.highlighted
                    ? "border-primary/30 bg-card shadow-[var(--card-shadow-hover)] md:scale-[1.04] md:-translate-y-1 z-10"
                    : "border-border bg-card shadow-[var(--card-shadow)]"
                }`}
              >
                {tier.highlighted && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-block text-xs font-bold uppercase tracking-wider text-primary-foreground bg-primary px-4 py-1.5 rounded-full shadow-sm whitespace-nowrap">
                    Most Popular
                  </span>
                )}
                <h3 className="font-display font-semibold text-xl text-card-foreground">{tier.name}</h3>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mt-3 mb-1">
                  <span className="font-display text-4xl font-semibold text-card-foreground">{fmtUsd(displayUsd)}</span>
                  {periodLabel && <span className="text-muted-foreground text-sm">{periodLabel} USD</span>}
                  {BETA_FREE_ACCESS && !isFree && (
                    <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-xs font-bold px-2.5 py-1">
                      Free during beta
                    </span>
                  )}
                </div>
                {!isFree && (
                  <p className="text-xs text-muted-foreground mb-1">
                    ≈ {fmtCad(displayUsd)}{periodLabel ? ` ${periodLabel} CAD` : ""}
                  </p>
                )}
                {BETA_FREE_ACCESS && !isFree ? (
                  <p className="text-xs text-muted-foreground mb-3">No payment needed while Trimbly is in beta — this is what it'll cost after.</p>
                ) : showYearly ? (
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
                  className="w-full rounded-lg"
                  variant={tier.highlighted ? "default" : "outline"}
                  size="lg"
                  onClick={() => navigate(route)}
                >
                  {isFree ? tier.ctaFree : tier.ctaPaid}
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
