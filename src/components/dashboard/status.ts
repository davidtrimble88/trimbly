// Domain status → token-backed class maps. Single source of truth so we don't
// scatter ad hoc bg-green-100/text-yellow-500/etc. across dashboard components.

export const bidStatusClasses: Record<string, string> = {
  accepted: "bg-primary/10 text-primary",
  rejected: "bg-destructive/10 text-destructive",
  pending: "bg-secondary text-secondary-foreground",
};

export const bidStatusLabel: Record<string, string> = {
  accepted: "Accepted",
  rejected: "Rejected",
  pending: "Pending",
};
