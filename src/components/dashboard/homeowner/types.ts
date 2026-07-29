export const tierOrder: Record<string, number> = { free: 0, homeowner_pro: 1, multi_pro: 2 };
export const tierLabels: Record<string, string> = { free: "Free", homeowner_pro: "Home Hero", multi_pro: "Home Super Hero" };

export const homeTypeLabels: Record<string, string> = {
  single_family: "Single Family",
  townhouse: "Townhouse",
  condo: "Condo",
  multi_family: "Multi-Family",
  mobile: "Mobile Home",
};

export type JobStats = { total: number; pending: number; withBids: number; accepted: number; completed: number };

export type UpgradeTierConfig = { name: string; price: string; period: string; newFeatures: string[] };

export const upgradeConfig: Record<string, UpgradeTierConfig> = {
  homeowner_pro: {
    name: "Home Hero",
    price: "$5",
    period: "/month",
    newFeatures: [
      "Unlimited job requests",
      "AI job estimator (unlimited)",
      "Advanced maintenance schedules",
      "Priority pro matching",
      "Emergency support channel",
      "Digital Home Binder (5 items) + export",
      "Coverage Advisor (AI-powered)",
      "Seasonal checklists",
    ],
  },
  multi_pro: {
    name: "Home Super Hero",
    price: "$20",
    period: "/month",
    newFeatures: [
      "Up to 10 home profiles",
      "View homes individually or all together",
      "Unlimited Digital Home Binder entries",
    ],
  },
};

export type HomeData = {
  id: string;
  name: string;
  home_type: string;
  year_built: number | null;
  square_feet: number | null;
  city: string;
  state: string;
  hvac_type: string | null;
  roof_type: string | null;
  has_pool: boolean;
  has_septic: boolean;
  has_well_water: boolean;
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
