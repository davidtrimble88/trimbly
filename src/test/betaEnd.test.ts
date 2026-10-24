import { describe, it, expect } from "vitest";
import { BETA_FREE_ACCESS } from "@/lib/pricingTiers";
import { describePendingPlan, isGateExempt } from "@/lib/betaEnd";

describe("beta has ended", () => {
  it("is switched off", () => {
    expect(BETA_FREE_ACCESS).toBe(false);
  });
});

describe("describePendingPlan", () => {
  it("names and prices a homeowner plan from the tier table", () => {
    expect(describePendingPlan({ scope: "homeowner", tier: "homeowner_pro" })).toMatchObject({ name: "Home Hero", priceLabel: "$5/month" });
    expect(describePendingPlan({ scope: "homeowner", tier: "multi_pro" })).toMatchObject({ name: "Home Super Hero", priceLabel: "$20/month" });
  });

  it("prices a provider and a mechanic differently", () => {
    expect(describePendingPlan({ scope: "provider", tier: "pro" })).toMatchObject({ name: "Pro Provider", priceLabel: "$29/month" });
    expect(describePendingPlan({ scope: "provider", tier: "pro", provider_type: "mechanic" })).toMatchObject({ name: "Pro Mechanic", priceLabel: "$15/month" });
  });

  it("prices My Garage by billing interval", () => {
    expect(describePendingPlan({ scope: "garage" }).priceLabel).toBe("$3.99/month");
    expect(describePendingPlan({ scope: "garage", interval: "yearly" }).priceLabel).toBe("$29/year");
  });
});

describe("isGateExempt", () => {
  it("lets people reach sign-in, legal pages, cancelling and staff tools", () => {
    for (const p of ["/", "/auth", "/terms", "/privacy", "/cancel-subscription", "/staff", "/staff/users", "/gift"]) {
      expect(isGateExempt(p)).toBe(true);
    }
  });

  it("gates the app itself", () => {
    for (const p of ["/dashboard", "/maintenance", "/binder", "/pro-dashboard", "/garage", "/staffing"]) {
      expect(isGateExempt(p)).toBe(false);
    }
  });
});
