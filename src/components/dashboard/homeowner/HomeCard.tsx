import { useNavigate } from "react-router-dom";
import {
  Home as HomeIcon, MapPin, MoreVertical, Pencil, FileText, Trash2, FolderOpen,
  Calendar, Ruler, Thermometer, AlertTriangle, Clock, CalendarCheck, CheckCircle2, Brain, Shield,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import StatCard from "@/components/dashboard/StatCard";
import UpgradeGate from "@/components/dashboard/UpgradeGate";
import { homeTypeLabels, type HomeData, type HomeStats, type DrilldownInfo } from "./types";

// Fields that meaningfully improve AI maintenance schedule accuracy, in priority order.
const COMPLETENESS_FIELDS: { key: keyof HomeData; label: string }[] = [
  { key: "year_built", label: "year built" },
  { key: "square_feet", label: "square footage" },
  { key: "hvac_type", label: "HVAC type" },
  { key: "roof_type", label: "roof type" },
  { key: "street_address", label: "street address" },
];

interface HomeCardProps {
  home: HomeData;
  stats?: HomeStats;
  isPro: boolean;
  currentUserId?: string;
  onEdit: (home: HomeData) => void;
  onDelete: (home: HomeData) => void;
  onDrilldown: (info: DrilldownInfo) => void;
}

const HomeCard = ({ home, stats, isPro, currentUserId, onEdit, onDelete, onDrilldown }: HomeCardProps) => {
  const navigate = useNavigate();
  const homeAge = home.year_built ? new Date().getFullYear() - home.year_built : null;
  const isShared = !!currentUserId && !!home.user_id && home.user_id !== currentUserId;

  const missingFields = COMPLETENESS_FIELDS.filter((f) => !home[f.key]);
  const completeness = Math.round(
    ((COMPLETENESS_FIELDS.length - missingFields.length) / COMPLETENESS_FIELDS.length) * 100
  );
  const nextMissingField = missingFields[0];

  const accentClass = !stats
    ? "bg-border"
    : stats.overdueTasks > 0
      ? "bg-destructive"
      : stats.highPriorityTasks > 0
        ? "bg-accent"
        : stats.upcomingTasks > 0
          ? "bg-primary"
          : "bg-secondary";

  return (
    <Card className="overflow-hidden shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] transition-shadow">
      <div className={`h-1.5 w-full ${accentClass}`} />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <HomeIcon size={18} className="text-primary" />
            </div>
            <div>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                {home.name}
                {isShared && <Badge variant="secondary" className="text-[10px] font-normal">Shared with you</Badge>}
              </CardTitle>
              <CardDescription className="flex items-center gap-1 mt-1">
                <MapPin size={13} />
                {home.city}, {home.state?.toUpperCase()}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-xs shrink-0">
              {homeTypeLabels[home.home_type] || home.home_type}
            </Badge>
            {!isShared && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(home)}>
                    <Pencil size={14} className="mr-2" /> Edit Home
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/dashboard/homes/${home.id}/report`)}>
                    <FileText size={14} className="mr-2" /> Printable Report
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(home)} className="text-destructive focus:text-destructive">
                    <Trash2 size={14} className="mr-2" /> Remove Home
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Home details row */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {home.year_built && (
            <span className="flex items-center gap-1">
              <Calendar size={12} /> Built {home.year_built} {homeAge ? `(${homeAge} yrs)` : ""}
            </span>
          )}
          {home.square_feet && (
            <span className="flex items-center gap-1">
              <Ruler size={12} /> {home.square_feet.toLocaleString()} sq ft
            </span>
          )}
          {home.hvac_type && (
            <span className="flex items-center gap-1">
              <Thermometer size={12} /> {home.hvac_type}
            </span>
          )}
        </div>

        {/* Feature badges */}
        <div className="flex flex-wrap gap-1.5">
          {home.roof_type && <Badge variant="secondary" className="text-xs">{home.roof_type} roof</Badge>}
          {home.has_pool && <Badge variant="secondary" className="text-xs">Pool</Badge>}
          {home.has_septic && <Badge variant="secondary" className="text-xs">Septic</Badge>}
          {home.has_well_water && <Badge variant="secondary" className="text-xs">Well Water</Badge>}
        </div>

        {/* Profile completeness nudge - only shown when there's something to gain */}
        {completeness < 100 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Profile {completeness}% complete</span>
              {nextMissingField && (
                <button
                  onClick={() => onEdit(home)}
                  className="text-primary hover:underline font-medium shrink-0"
                >
                  Add {nextMissingField.label} →
                </button>
              )}
            </div>
            <Progress
              value={completeness}
              className={`h-1.5 ${completeness < 50 ? "[&>div]:bg-warning" : ""}`}
            />
          </div>
        )}

        {/* Maintenance stats - always shown, clickable */}
        <div className="grid grid-cols-2 gap-2">
          <StatCard
            icon={AlertTriangle}
            value={stats?.overdueTasks ?? 0}
            label="Overdue"
            isEmpty={!stats?.overdueTasks}
            emptyLabel="None overdue"
            onClick={() => onDrilldown({ title: `${home.name} — Overdue`, homeId: home.id, filter: "overdue" })}
            tone="danger"
          />
          <StatCard
            icon={Clock}
            value={stats?.highPriorityTasks ?? 0}
            label="High priority"
            isEmpty={!stats?.highPriorityTasks}
            emptyLabel="None urgent"
            onClick={() => onDrilldown({ title: `${home.name} — High Priority`, homeId: home.id, filter: "high_priority" })}
            tone="warning"
          />
          <StatCard
            icon={CalendarCheck}
            value={stats?.upcomingTasks ?? 0}
            label="Upcoming"
            onClick={() => onDrilldown({ title: `${home.name} — Upcoming`, homeId: home.id, filter: "upcoming" })}
          />
          <StatCard
            icon={CheckCircle2}
            value={stats?.completedTasks ?? 0}
            label="Completed"
            onClick={() => onDrilldown({ title: `${home.name} — Completed`, homeId: home.id, filter: "completed" })}
            tone="success"
          />
        </div>

        {/* Pro-gated: Binder & warranty stats */}
        <UpgradeGate
          hasAccess={isPro}
          variant="inline"
          featureName="Binder & warranty insights"
          description="Track appliance manuals and get warranty expiration alerts."
          pricingRoute="/#pricing"
        >
          <div className="border-t border-border pt-3 space-y-2">
            <button
              onClick={() => onDrilldown({ title: `${home.name} — Binder Items`, homeId: home.id, filter: "binder" })}
              className="flex items-center justify-between text-sm w-full hover:bg-muted/50 rounded-lg px-2 py-1 transition-colors"
            >
              <span className="text-muted-foreground flex items-center gap-1.5">
                <FolderOpen size={14} /> Binder items
              </span>
              <span className="font-medium text-foreground">{stats?.binderItemCount ?? 0}</span>
            </button>
            {!!stats?.expiringWarranties && (
              <button
                onClick={() => onDrilldown({ title: `${home.name} — Expiring Warranties`, homeId: home.id, filter: "expiring_warranties" })}
                className="flex items-center justify-between text-sm w-full hover:bg-muted/50 rounded-lg px-2 py-1 transition-colors"
              >
                <span className="text-accent flex items-center gap-1.5">
                  <Shield size={14} /> Warranties expiring soon
                </span>
                <span className="font-medium text-accent">{stats.expiringWarranties}</span>
              </button>
            )}
          </div>
        </UpgradeGate>
      </CardContent>

      <CardFooter className="gap-2">
        <Button variant="default" size="sm" className="flex-1" onClick={() => navigate("/maintenance")}>
          <CalendarCheck size={14} className="mr-1.5" /> Maintenance
        </Button>
        {isPro && (
          <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate("/binder")}>
            <FolderOpen size={14} className="mr-1.5" /> Binder
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => navigate("/estimator")}>
          <Brain size={14} />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default HomeCard;
