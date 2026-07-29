// Domain status → token-backed class maps. Single source of truth so we don't
// scatter ad hoc bg-green-100/text-orange-500/etc. across homeowner dashboard components.

export const taskUrgencyClasses: Record<"overdue" | "high_priority" | "upcoming" | "completed", string> = {
  overdue: "bg-destructive/10 text-destructive",
  high_priority: "bg-accent/10 text-accent",
  upcoming: "bg-primary/10 text-primary",
  completed: "bg-secondary text-secondary-foreground",
};

export const taskUrgencyIconClasses: Record<"overdue" | "high_priority" | "upcoming" | "completed", string> = {
  overdue: "text-destructive",
  high_priority: "text-accent",
  upcoming: "text-primary",
  completed: "text-secondary-foreground",
};
