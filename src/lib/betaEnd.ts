import { formatUsd, homeownerTiers, mechanicTiers, providerTiers } from "@/lib/pricingTiers";

// One entry of beta_end_status().pending: a paid plan the account still holds
// from the free beta without a card on file.
export type PendingPlan =
  | { scope: "homeowner"; tier: string }
  | { scope: "provider"; tier: string; provider_type?: string }
  | { scope: "garage"; interval?: string };

export interface PendingPlanView {
  scope: PendingPlan["scope"];
  name: string;
  priceLabel: string;
}

// Must match the My Garage prices charged by create-garage-checkout.
export const GARAGE_MONTHLY_USD = 3.99;
export const GARAGE_YEARLY_USD = 29;

export function describePendingPlan(plan: PendingPlan): PendingPlanView {
  if (plan.scope === "homeowner") {
    const tier = homeownerTiers.find((t) => t.key === plan.tier) ?? homeownerTiers.find((t) => t.key === "homeowner_pro")!;
    return { scope: "homeowner", name: tier.name, priceLabel: `${formatUsd(tier.monthlyUsd)}/month` };
  }
  if (plan.scope === "provider") {
    const tiers = plan.provider_type === "mechanic" ? mechanicTiers : providerTiers;
    const tier = tiers.find((t) => t.key === "pro")!;
    return { scope: "provider", name: tier.name, priceLabel: `${formatUsd(tier.monthlyUsd)}/month` };
  }
  const yearly = plan.interval === "yearly";
  return {
    scope: "garage",
    name: "My Garage",
    priceLabel: yearly ? `${formatUsd(GARAGE_YEARLY_USD)}/year` : `${formatUsd(GARAGE_MONTHLY_USD)}/month`,
  };
}

/** Pages a signed-in user can still open while plans are pending: sign-in, legal, help, cancelling, and staff tools. */
const OPEN_PATHS = [
  "/", "/auth", "/reset-password", "/account-recovery", "/staff-login",
  "/terms", "/privacy", "/contact", "/faq", "/help", "/about",
  "/cancel-subscription", "/gift", "/redeem-gift",
];

export function isGateExempt(pathname: string): boolean {
  return OPEN_PATHS.includes(pathname) || pathname === "/staff" || pathname.startsWith("/staff/");
}
