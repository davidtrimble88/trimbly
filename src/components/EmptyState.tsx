import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

type EmptyStateTone = "primary" | "accent" | "warning";

const toneCircle: Record<EmptyStateTone, string> = {
  primary: "bg-primary/10",
  accent: "bg-accent/10",
  warning: "bg-warning/10",
};
const toneIcon: Record<EmptyStateTone, string> = {
  primary: "text-primary",
  accent: "text-accent",
  warning: "text-warning",
};

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondary?: ReactNode;
  /** Varies the icon-circle color by context (default "primary") so every
   * empty state in the app doesn't look identical regardless of what it's
   * for — e.g. "accent" for vehicle/garage contexts, "warning" for
   * something the user should address soon. */
  tone?: EmptyStateTone;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, actionHref, onAction, secondary, tone = "primary" }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 ${toneCircle[tone]}`}>
        <Icon className={`w-8 h-8 ${toneIcon[tone]}`} />
      </div>
      <h3 className="font-display text-xl font-bold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">{description}</p>
      {actionLabel && (actionHref ? (
        <Button asChild><Link to={actionHref}>{actionLabel}</Link></Button>
      ) : onAction ? (
        <Button onClick={onAction}>{actionLabel}</Button>
      ) : null)}
      {secondary && <div className="mt-3">{secondary}</div>}
    </div>
  );
}
