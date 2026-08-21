import { ReactNode } from "react";
import { LucideIcon, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UrgentAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

interface DashboardHeroBannerProps {
  greetingName: string;
  /** One line under the greeting — a quick "here's where things stand" summary. */
  summary: ReactNode;
  /** The single most time-sensitive thing right now, if there is one — a
   * concrete next action beats a pile of stat cards for "what should I do." */
  urgentAction?: UrgentAction;
  weatherSlot?: ReactNode;
}

/** Shared focal point for the top of a dashboard — a name/greeting, a
 * one-line status summary, and (if there's genuinely something urgent) a
 * single call-to-action button, rather than dropping straight into stat
 * grids with no lead-in. */
export default function DashboardHeroBanner({ greetingName, summary, urgentAction, weatherSlot }: DashboardHeroBannerProps) {
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-5 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {timeGreeting}, {greetingName.split(" ")[0]}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{summary}</p>
        </div>
        {weatherSlot}
      </div>
      {urgentAction && (
        <Button size="sm" onClick={urgentAction.onClick} className="mt-4 gap-1.5">
          <urgentAction.icon size={14} /> {urgentAction.label} <ArrowRight size={14} />
        </Button>
      )}
    </div>
  );
}
