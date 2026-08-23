import { homeownerTiers, formatUsd } from "@/lib/pricingTiers";

export const tierOrder: Record<string, number> = { free: 0, homeowner_pro: 1, multi_pro: 2 };
// Derived from pricingTiers.ts (the single source of truth) instead of a
// hand-copied map — this exact map used to be duplicated three times
// (here, staff/Discounts.tsx, and ProRegister/MechanicRegister's own
// versions) and had already drifted on the dashboard's upgrade-prompt copy.
export const tierLabels: Record<string, string> = Object.fromEntries(homeownerTiers.map((t) => [t.key, t.name]));

export const homeTypeLabels: Record<string, string> = {
  single_family: "Single Family",
  townhouse: "Townhouse",
  condo: "Condo",
  multi_family: "Multi-Family",
  mobile: "Mobile Home",
};

export const hvacTypeOptions: string[] = [
  "Central AC",
  "Heat Pump",
  "Furnace (Gas)",
  "Furnace (Electric)",
  "Furnace (Oil)",
  "Boiler (Hot Water)",
  "Boiler (Steam)",
  "Mini-Split / Ductless",
  "Window Units",
  "Evaporative Cooler (Swamp)",
  "Radiant Floor Heating",
  "Baseboard Electric",
  "Geothermal",
  "None",
];

export const roofTypeOptions: string[] = [
  "Asphalt Shingles",
  "Architectural Shingles",
  "Metal Roof",
  "Clay Tile",
  "Concrete Tile",
  "Slate",
  "Wood Shake",
  "TPO (Flat)",
  "EPDM / Rubber (Flat)",
  "Tar & Gravel (Built-Up)",
  "Solar Roof",
  "Green / Living Roof",
  "Other",
  "None",
];

export type JobStats = { total: number; pending: number; withBids: number; accepted: number; completed: number };

export type UpgradeTierConfig = { name: string; price: string; period: string; newFeatures: string[] };

// Derived from pricingTiers.ts instead of a hand-copied feature list — the
// old copy here had already drifted (it advertised a "+ export" Home Binder
// feature that doesn't exist anywhere in the real, canonical feature list).
export const upgradeConfig: Record<string, UpgradeTierConfig> = Object.fromEntries(
  homeownerTiers
    .filter((t) => t.monthlyUsd > 0)
    .map((t) => [t.key, { name: t.name, price: formatUsd(t.monthlyUsd), period: "/month", newFeatures: t.features }])
);

export type HomeData = {
  id: string;
  user_id?: string;
  name: string;
  home_type: string;
  year_built: number | null;
  square_feet: number | null;
  street_address?: string;
  city: string;
  state: string;
  hvac_type: string | null;
  roof_type: string | null;
  has_pool: boolean;
  has_septic: boolean;
  has_well_water: boolean;
  photo_url?: string | null;
};

export type TaskRow = {
  home_id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  category: string;
};

export type BinderRow = {
  home_id: string;
  name: string;
  warranty_expiry: string | null;
  item_type: string;
};

export type HomeStats = {
  homeId: string;
  totalTasks: number;
  overdueTasks: number;
  upcomingTasks: number;
  completedTasks: number;
  highPriorityTasks: number;
  binderItemCount: number;
  expiringWarranties: number;
};

export type DrilldownInfo = {
  title: string;
  homeId: string;
  filter: "overdue" | "high_priority" | "upcoming" | "completed" | "binder" | "expiring_warranties";
};
