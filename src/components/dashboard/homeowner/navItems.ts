import {
  Home, LayoutDashboard, Sparkles, UserCircle, CalendarCheck, FolderOpen,
  Wrench, Brain, MessageSquare, Shield, Briefcase, Car, LifeBuoy,
} from "lucide-react";
import { DashboardNavItem } from "@/components/dashboard/types";

export const homeownerNavGroups = ["Dashboard", "Quick Links"];

/**
 * Full homeowner nav as href-based items, for pages OTHER than Dashboard.tsx itself.
 * Dashboard.tsx keeps its own tab-switch version of the first 4 items — this variant
 * routes them back to /dashboard so satellite pages (Estimator, Binder, etc.) share
 * the exact same sidebar the Dashboard hub uses.
 */
export function buildHomeownerSatelliteNavItems(hasGarage: boolean): DashboardNavItem[] {
  return [
    { id: "overview", label: "Home Base", icon: LayoutDashboard, href: "/dashboard", group: "Dashboard" },
    { id: "homes", label: "My Homes", icon: Home, href: "/dashboard?tab=homes", group: "Dashboard" },
    { id: "tools", label: "Home Tools", icon: Sparkles, href: "/dashboard?tab=tools", group: "Dashboard" },
    { id: "profile", label: "Profile", icon: UserCircle, href: "/dashboard?tab=profile", group: "Dashboard" },
    { id: "maintenance", label: "Maintenance Autopilot", icon: CalendarCheck, href: "/maintenance", group: "Quick Links" },
    { id: "binder", label: "Home Binder", icon: FolderOpen, href: "/binder", group: "Quick Links" },
    { id: "find-pro", label: "Find a Pro", icon: Wrench, href: "/search", group: "Quick Links" },
    { id: "estimator", label: "AI Estimator", icon: Brain, href: "/estimator", group: "Quick Links" },
    { id: "messages", label: "Messages", icon: MessageSquare, href: "/messages", group: "Quick Links" },
    { id: "coverage", label: "Coverage Advisor", icon: Shield, href: "/coverage", group: "Quick Links" },
    { id: "post-job", label: "Post a Job", icon: Briefcase, href: "/post-job", group: "Quick Links" },
    { id: "garage", label: hasGarage ? "Garage" : "Add Garage", icon: Car, href: hasGarage ? "/garage" : "/garage/upsell", group: "Quick Links" },
    { id: "support", label: "Support & Tickets", icon: LifeBuoy, href: "/support", group: "Quick Links" },
  ];
}
