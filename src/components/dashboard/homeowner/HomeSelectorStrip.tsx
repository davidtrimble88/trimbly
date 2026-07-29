import { LayoutGrid, Home as HomeIcon, Building2, Building, Caravan } from "lucide-react";
import type { HomeData, HomeStats } from "./types";

const typeIcon: Record<string, typeof HomeIcon> = {
  single_family: HomeIcon,
  townhouse: Building,
  condo: Building2,
  multi_family: Building2,
  mobile: Caravan,
};

const accentFor = (stats?: HomeStats) => {
  if (!stats) return "bg-border";
  if (stats.overdueTasks > 0) return "bg-destructive";
  if (stats.highPriorityTasks > 0) return "bg-accent";
  if (stats.upcomingTasks > 0) return "bg-primary";
  return "bg-secondary";
};

interface HomeSelectorStripProps {
  homes: HomeData[];
  homeStats: Record<string, HomeStats>;
  selectedId: string;
  onSelect: (id: string) => void;
}

const HomeSelectorStrip = ({ homes, homeStats, selectedId, onSelect }: HomeSelectorStripProps) => {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 mb-4">
      <button
        onClick={() => onSelect("all")}
        className={`shrink-0 w-36 rounded-xl border p-3 text-left transition-all ${
          selectedId === "all"
            ? "border-primary bg-primary/5 shadow-[var(--card-shadow)]"
            : "border-border bg-card hover:border-primary/40"
        }`}
      >
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center mb-2">
          <LayoutGrid size={16} className="text-primary" />
        </div>
        <p className="font-semibold text-sm text-foreground truncate">All Homes</p>
        <p className="text-xs text-muted-foreground">{homes.length} propert{homes.length !== 1 ? "ies" : "y"}</p>
      </button>

      {homes.map((home) => {
        const Icon = typeIcon[home.home_type] || HomeIcon;
        const stats = homeStats[home.id];
        const isSelected = selectedId === home.id;
        const needsAttention = !!stats && (stats.overdueTasks > 0 || stats.highPriorityTasks > 0);
        return (
          <button
            key={home.id}
            onClick={() => onSelect(home.id)}
            className={`shrink-0 w-36 rounded-xl border overflow-hidden text-left transition-all ${
              isSelected ? "border-primary shadow-[var(--card-shadow)]" : "border-border bg-card hover:border-primary/40"
            }`}
          >
            <div className={`h-1.5 w-full ${accentFor(stats)}`} />
            <div className={`p-3 ${isSelected ? "bg-primary/5" : ""}`}>
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Icon size={16} className="text-primary" />
              </div>
              <p className="font-semibold text-sm text-foreground truncate">{home.name}</p>
              <p className="text-xs text-muted-foreground truncate">{home.city}, {home.state}</p>
              {needsAttention ? (
                <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium text-destructive">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive" /> Needs attention
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium text-secondary-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary" /> All caught up
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default HomeSelectorStrip;
