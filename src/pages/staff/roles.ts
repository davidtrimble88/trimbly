// Staff role definitions and per-nav permissions
export type StaffRole = "admin" | "moderator" | "support" | "analyst";

export const STAFF_ROLES: { value: StaffRole; label: string; description: string }[] = [
  { value: "admin", label: "Admin", description: "Full access to everything, including managing staff." },
  { value: "moderator", label: "Moderator", description: "Moderation queue, providers, jobs, and broadcasts." },
  { value: "support", label: "Support", description: "Contact inbox, user accounts, and outreach." },
  { value: "analyst", label: "Analyst", description: "Read-only access to dashboard, searches, and error logs." },
];

// Each nav key maps to the set of roles allowed to see and visit it.
export const NAV_PERMISSIONS: Record<string, StaffRole[]> = {
  dashboard: ["admin", "moderator", "support", "analyst"],
  analytics: ["admin", "analyst"],
  business: ["admin", "analyst"],
  tax: ["admin"],
  contacts: ["admin", "support"],
  users: ["admin", "support"],
  providers: ["admin", "moderator"],
  jobs: ["admin", "moderator"],
  searches: ["admin", "analyst"],
  errors: ["admin", "analyst"],
  outreach: ["admin", "support"],
  moderation: ["admin", "moderator"],
  broadcasts: ["admin", "moderator", "support"],
  team: ["admin"], // only admins can manage staff
};

export function canAccess(navKey: string, roles: StaffRole[]): boolean {
  const allowed = NAV_PERMISSIONS[navKey] || [];
  return roles.some((r) => allowed.includes(r));
}

export function isStaff(roles: StaffRole[]): boolean {
  return roles.some((r) => (["admin", "moderator", "support", "analyst"] as StaffRole[]).includes(r));
}
