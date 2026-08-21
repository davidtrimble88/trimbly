import { Home as HomeIcon, Plus, ListChecks, AlertTriangle, CalendarClock, ShieldAlert } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import StatCard from "@/components/dashboard/StatCard";
import WeatherAlertsBanner from "@/components/home/WeatherAlertsBanner";
import HomeCard from "./HomeCard";
import type { HomeData, HomeStats, TaskRow, DrilldownInfo } from "./types";

interface MyHomesTabProps {
  homes: HomeData[];
  homeStats: Record<string, HomeStats>;
  allTasks: TaskRow[];
  loadingHomes: boolean;
  maxHomes: number;
  isPro: boolean;
  currentUserId?: string;
  onAddHome: () => void;
  onEditHome: (home: HomeData) => void;
  onDeleteHome: (home: HomeData) => void;
  onDrilldown: (info: DrilldownInfo) => void;
}

const MyHomesTab = ({
  homes, homeStats, allTasks, loadingHomes, maxHomes, isPro, currentUserId, onAddHome, onEditHome, onDeleteHome, onDrilldown,
}: MyHomesTabProps) => {
  const ownedHomes = currentUserId ? homes.filter((h) => h.user_id === currentUserId) : homes;
  const totalTasks = Object.values(homeStats).reduce((s, h) => s + h.totalTasks, 0);
  const overdueTotal = Object.values(homeStats).reduce((s, h) => s + h.overdueTasks, 0);
  const upcomingTotal = Object.values(homeStats).reduce((s, h) => s + h.upcomingTasks, 0);
  const warrantyTotal = Object.values(homeStats).reduce((s, h) => s + h.expiringWarranties, 0);

  return (
    <div className="mb-12">
      <WeatherAlertsBanner homeIds={homes.map((h) => h.id)} />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <HomeIcon size={20} className="text-primary" />
          Your Homes
          <span className="text-sm font-normal text-muted-foreground">({ownedHomes.length}/{maxHomes})</span>
        </h2>
        {ownedHomes.length < maxHomes && (
          <Button size="sm" onClick={onAddHome}>
            <Plus size={14} className="mr-1.5" /> Add Home
          </Button>
        )}
      </div>

      {loadingHomes ? (
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : homes.length === 0 ? (
        <Card className="text-center py-10">
          <CardContent>
            <HomeIcon size={40} className="mx-auto text-primary mb-3" />
            <h3 className="font-display font-bold text-lg mb-1">Add your first home</h3>
            <p className="text-muted-foreground text-sm mb-4 max-w-sm mx-auto">
              Trimbly tailors every recommendation to your home's age, size, and systems. Takes under a minute.
            </p>
            <Button onClick={onAddHome}>
              <Plus size={14} className="mr-1.5" /> Set up my home
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {homes.length > 1 && (
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-1.5">
                  <HomeIcon size={16} className="text-primary" /> Portfolio overview — {homes.length} properties
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <StatCard icon={ListChecks} value={totalTasks} label="Total tasks" />
                  <StatCard icon={AlertTriangle} value={overdueTotal} label="Overdue" isEmpty={overdueTotal === 0} emptyLabel="None overdue" tone="danger" />
                  <StatCard icon={CalendarClock} value={upcomingTotal} label="Upcoming" />
                  <StatCard icon={ShieldAlert} value={warrantyTotal} label="Warranties expiring" isEmpty={warrantyTotal === 0} emptyLabel="None expiring" tone="warning" />
                </div>
                {allTasks.filter((t) => t.status !== "completed" && t.due_date).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Across all properties, soonest due</p>
                    <ul className="divide-y divide-border">
                      {allTasks
                        .filter((t) => t.status !== "completed" && t.due_date)
                        .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
                        .slice(0, 6)
                        .map((t, i) => {
                          const home = homes.find((h) => h.id === t.home_id);
                          return (
                            <li key={i} className="py-2 flex items-center justify-between gap-2 text-sm">
                              <span className="truncate">{t.title} <span className="text-muted-foreground">· {home?.name || "Property"}</span></span>
                              <Badge variant={t.status === "overdue" ? "destructive" : "outline"} className="shrink-0">{t.due_date}</Badge>
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          <div className="grid md:grid-cols-2 gap-6">
            {homes.map((home) => (
              <HomeCard
                key={home.id}
                home={home}
                stats={homeStats[home.id]}
                isPro={isPro}
                currentUserId={currentUserId}
                onEdit={onEditHome}
                onDelete={onDeleteHome}
                onDrilldown={onDrilldown}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default MyHomesTab;
