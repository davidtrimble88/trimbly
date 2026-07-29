import { LucideIcon } from "lucide-react";

export interface DashboardNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string; // set for items that navigate to a separate route instead of switching tabs
  badge?: number;
  group?: string; // optional sidebar section label; items with no group render ungrouped
}
