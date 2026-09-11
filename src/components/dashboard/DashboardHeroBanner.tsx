import { ReactNode } from "react";
import { LucideIcon, ArrowRight, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandMark from "@/components/BrandMark";

interface UrgentAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

interface DashboardHeroBannerProps {
  greetingName: string;
  /** One line under the greeting — a quick "here's where things stand" summary. */
  summary: ReactNode;
  /** Small at-a-glance health chip, like the one shown on the public homepage. */
  status?: { label: string; tone: "success" | "warning" | "danger" };
  /** The single most time-sensitive thing right now, if there is one — a
   * concrete next action beats a pile of stat cards for "what should I do." */
  urgentAction?: UrgentAction;
  weatherSlot?: ReactNode;
}

const statusToneClasses = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
};


/** Shared focal point for the top of a dashboard — a name/greeting, a
 * one-line status summary, and (if there's genuinely something urgent) a
 * single call-to-action button, rather than dropping straight into stat
 * grids with no lead-in. */
export default function DashboardHeroBanner({ greetingName, summary, status, urgentAction, weatherSlot }: DashboardHeroBannerProps) {
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="mb-8 rounded-2xl border border-border bg-card p-6 shadow-[var(--card-shadow)] md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <BrandMark className="mt-1 hidden h-11 w-11 shrink-0 sm:block" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">{timeGreeting}</p>
            <h1 className="mt-1 font-display text-3xl font-bold leading-tight text-foreground md:text-4xl">
              {greetingName.split(" ")[0]}'s Home
            </h1>
            <p className="mt-2 font-body text-[0.95rem] text-muted-foreground">{summary}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status && (
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${statusToneClasses[status.tone]}`}>
              <Activity className="h-4 w-4" /> {status.label}
            </div>
          )}
          {weatherSlot}
        </div>
      </div>

      {urgentAction && (
        <Button onClick={urgentAction.onClick} className="mt-5 h-11 gap-2 rounded-full px-5 text-sm">
          <urgentAction.icon size={15} /> {urgentAction.label} <ArrowRight size={15} />
        </Button>
      )}
    </div>
  );
}
