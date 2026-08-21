import { LucideIcon } from "lucide-react";

export interface DashboardNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string; // set for items that navigate to a separate route instead of switching tabs
  badge?: number;
  /** Pins a small pulsing dot next to this item to flag a new feature,
   * until the destination page marks it seen via markFeatureSeen(). */
  featureKey?: string;
  group?: string; // optional sidebar section label; items with no group render ungrouped
}
