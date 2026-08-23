import { Star, Zap, Crown, LucideIcon } from "lucide-react";

// Single source of truth for every subscription tier shown anywhere in the
// app (landing page pricing table, and each audience's post-signup upsell
// page). Previously each of those pages hand-duplicated its own tier list,
// which drifted out of sync with itself (e.g. the Free tier claiming a
// paid-only feature, a "Pro" tier missing features the app actually gates
// behind it elsewhere). Edit a tier here and every page that renders it
// picks up the change.

// Trimbly is in a free public beta — every paid plan is unlocked at no
// cost, no payment info collected. One flag so flipping it off when the
// beta ends only means editing this file, not hunting across every
// pricing page that references it.
export const BETA_FREE_ACCESS = true;

export const USD_TO_CAD = 1.4;

export const formatUsd = (n: number) => (n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`);
export const formatCad = (n: number) => {
  const v = n * USD_TO_CAD;
  return v % 1 === 0 ? `CA$${v}` : `CA$${v.toFixed(2)}`;
};

export type PricingTier = {
  /** Matches the value the RPC/DB expects (subscription_tier / provider tier). "free" for the free tier. */
  key: string;
  name: string;
  icon: LucideIcon;
  monthlyUsd: number;
  description: string;
  features: string[];
  highlighted: boolean;
  badge?: string;
  ctaFree: string;
  ctaPaid: string;
};

export const homeownerTiers: PricingTier[] = [
  {
    key: "free",
    name: "Free",
    icon: Star,
    monthlyUsd: 0,
    description: "Get started with basic home management",
    features: [
      "1 home profile",
      "Search & browse local pros",
      "Create up to 3 job requests/month",
      "Receive pro bids & messages",
      "In-app messaging with pros",
      "Basic maintenance reminders",
      "User Manual Finder",
      "Community reviews access",
    ],
    highlighted: false,
    ctaFree: "Get Started Free",
    ctaPaid: "Get Started Free",
  },
  {
    key: "homeowner_pro",
    name: "Home Hero",
    icon: Zap,
    monthlyUsd: 5,
    description: "Full-powered home maintenance on autopilot",
    features: [
      "1 home profile",
      "Digital Home Binder (5 items)",
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
      "Invite family — +$2/mo per person",
    ],
    highlighted: true,
    badge: "Most Popular",
    ctaFree: "Start Free Trial",
    ctaPaid: "Start 14-Day Free Trial",
  },
  {
    key: "multi_pro",
    name: "Home Super Hero",
    icon: Crown,
    monthlyUsd: 20,
    description: "Manage up to 10 properties from one account",
    features: [
      "Everything in Home Hero",
      "Up to 10 home profiles",
      "View homes individually or all together",
      "Unlimited Digital Home Binder entries (vs. 5)",
      "Multi-home maintenance dashboard",
      "Priority pro matching",
      "Emergency support channel",
      "2 free family members with full access",
      "More members from $5/mo",
    ],
    highlighted: false,
    ctaFree: "Start Free Trial",
    ctaPaid: "Start 14-Day Free Trial",
  },
];

export const providerTiers: PricingTier[] = [
  {
    key: "free",
    name: "Free",
    icon: Star,
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
    highlighted: false,
    ctaFree: "Get Started Free",
    ctaPaid: "Get Started Free",
  },
  {
    key: "pro",
    name: "Pro Provider",
    icon: Zap,
    // !! If you change this, also update PRICING_CENTS.default in
    // supabase/functions/create-provider-subscription-checkout/index.ts —
    // that's what Stripe actually charges, and it can't import this file
    // (Deno can't resolve the lucide-react import below).
    monthlyUsd: 29,
    description: "More visibility, more leads, more growth",
    features: [
      "Everything in Free",
      "Unlimited bids",
      "Verified Pro badge",
      "Response-time badge",
      "Priority search placement",
      "AI Message Copilot",
      "AI Follow-Up drafts",
      "AI competitor pricing intel",
      "Auto-request reviews (in-app)",
      "Rent out your equipment (ESIGN/UETA agreements)",
      "Signed-contract archive + audit trail",
      "Referral link to share with other pros",
      "Local SEO microsite",
      "Yard sign QR codes",
      "Service area, hours & mileage tools",
      "Photo portfolio (up to 10 images)",
    ],
    highlighted: true,
    ctaFree: "Get Started Free",
    ctaPaid: "Start 14-Day Free Trial",
  },
];

export const mechanicTiers: PricingTier[] = [
  {
    key: "free",
    name: "Free",
    icon: Star,
    monthlyUsd: 0,
    description: "List your shop and start receiving vehicle leads",
    features: [
      "Mechanic profile listing",
      "Appear in local vehicle search results",
      "Up to 3 active bids per month",
      "In-app messaging with vehicle owners",
      "Customer reviews & ratings",
      "Basic analytics dashboard",
    ],
    highlighted: false,
    ctaFree: "Get Started Free",
    ctaPaid: "Get Started Free",
  },
  {
    key: "pro",
    name: "Pro Mechanic",
    icon: Zap,
    // !! If you change this, also update PRICING_CENTS.mechanic in
    // supabase/functions/create-provider-subscription-checkout/index.ts —
    // that's what Stripe actually charges, and it can't import this file
    // (Deno can't resolve the lucide-react import below).
    monthlyUsd: 15,
    description: "Unlimited vehicle leads and AI tools for your shop",
    features: [
      "Everything in Free",
      "Unlimited bids on vehicle jobs",
      "Verified Mechanic badge",
      "Response-time badge",
      "AI Message Copilot",
      "AI Follow-Up drafts",
      "AI competitor pricing intel",
      "Auto-request reviews (in-app)",
      "Referral link to share with other mechanics",
      "Shop QR codes for marketing",
      "Service area, hours & mileage tools",
    ],
    highlighted: true,
    ctaFree: "Get Started Free",
    ctaPaid: "Start 14-Day Free Trial",
  },
];
