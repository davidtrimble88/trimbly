import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase, Plus, Clock, Gavel, CheckCircle2, PartyPopper,
  Wrench, ListChecks, AlertTriangle, CalendarClock, FolderOpen,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/dashboard/StatCard";
import UpgradeGate from "@/components/dashboard/UpgradeGate";
import HomeSelectorStrip from "./HomeSelectorStrip";
import GarageAnalyticsSection from "./GarageAnalyticsSection";
import { upgradeConfig, type JobStats, type HomeData, type HomeStats, type TaskRow } from "./types";

interface HomeownerOverviewTabProps {
  jobStats: JobStats;
  subscriptionTier: string;
  homes: HomeData[];
  homeStats: Record<string, HomeStats>;
  allTasks: TaskRow[];
  isPro: boolean;
  onGoToHomes: () => void;
}

const HomeownerOverviewTab = ({
  jobStats, subscriptionTier, homes, homeStats, allTasks, isPro, onGoToHomes,
}: HomeownerOverviewTabProps) => {
  const navigate = useNavigate();
  const nextTier = subscriptionTier === "free" ? "homeowner_pro" : "multi_pro";
  const cfg = upgradeConfig[nextTier];

  const [selectedHomeId, setSelectedHomeId] = useState<string>("all");
  const selectedHome = selectedHomeId !== "all" ? homes.find((h) => h.id === selectedHomeId) : undefined;

  const statsInScope = useMemo(
    () => (selectedHomeId === "all" ? Object.values(homeStats) : homeStats[selectedHomeId] ? [homeStats[selectedHomeId]] : []),
    [selectedHomeId, homeStats],
  );

  const totalTasks = statsInScope.reduce((s, h) => s + h.totalTasks, 0);
  const overdueTotal = statsInScope.reduce((s, h) => s + h.overdueTasks, 0);
  const highPriorityTotal = statsInScope.reduce((s, h) => s + h.highPriorityTasks, 0);
  const upcomingTotal = statsInScope.reduce((s, h) => s + h.upcomingTasks, 0);
  const completedTotal = statsInScope.reduce((s, h) => s + h.completedTasks, 0);
  const binderTotal = statsInScope.reduce((s, h) => s + h.binderItemCount, 0);
  const warrantyTotal = statsInScope.reduce((s, h) => s + h.expiringWarranties, 0);

  const tasksInScope = selectedHomeId === "all" ? allTasks : allTasks.filter((t) => t.home_id === selectedHomeId);
  const soonestDue = tasksInScope
    .filter((t) => t.status !== "completed" && t.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* ─── Home Maintenance Summary ─── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Wrench size={20} className="text-primary" />
            Home Maintenance
            <span className="text-sm font-normal text-muted-foreground">
              {selectedHome ? `— ${selectedHome.name}` : homes.length > 0 ? `(${homes.length} home${homes.length !== 1 ? "s" : ""})` : ""}
            </span>
          </h2>
          {homes.length > 0 && (
            <Button size="sm" variant="outline" onClick={onGoToHomes}>View Homes</Button>
          )}
        </div>

        {homes.length === 0 ? (
          <Card className="text-center py-10">
            <CardContent>
              <Wrench size={36} className="mx-auto text-primary mb-3" />
              <h3 className="font-display font-bold text-lg mb-1">Add a home to start tracking maintenance</h3>
              <p className="text-muted-foreground text-sm mb-4 max-w-sm mx-auto">
                Once you add a home, Trimbly builds a personalized maintenance schedule and tracks it here.
              </p>
              <Button onClick={onGoToHomes}><Plus size={14} className="mr-1.5" /> Add your first home</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <HomeSelectorStrip homes={homes} homeStats={homeStats} selectedId={selectedHomeId} onSelect={setSelectedHomeId} />

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <StatCard icon={ListChecks} value={totalTasks} label="Total Tasks" onClick={onGoToHomes} />
              <StatCard icon={AlertTriangle} value={overdueTotal} label="Overdue" isEmpty={overdueTotal === 0} emptyLabel="None overdue" onClick={onGoToHomes} />
              <StatCard icon={Clock} value={highPriorityTotal} label="High Priority" isEmpty={highPriorityTotal === 0} emptyLabel="None urgent" onClick={onGoToHomes} />
              <StatCard icon={CalendarClock} value={upcomingTotal} label="Upcoming" onClick={onGoToHomes} />
              <StatCard icon={CheckCircle2} value={completedTotal} label="Completed" onClick={onGoToHomes} />
            </div>

            {soonestDue.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {selectedHome ? `Coming up next for ${selectedHome.name}` : "Coming up next, across your homes"}
                  </p>
                  <ul className="divide-y divide-border">
                    {soonestDue.map((t, i) => {
                      const home = homes.find((h) => h.id === t.home_id);
                      return (
                        <li key={i} className="py-2 flex items-center justify-between gap-2 text-sm">
                          <span className="truncate">
                            {t.title}
                            {!selectedHome && <span className="text-muted-foreground"> · {home?.name || "Property"}</span>}
                          </span>
                          <Badge variant={t.status === "overdue" ? "destructive" : "outline"} className="shrink-0">{t.due_date}</Badge>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            )}

            <div className="mt-3">
              <UpgradeGate
                hasAccess={isPro}
                variant="inline"
                featureName="Binder & warranty insights"
                description="Track appliance manuals and get warranty expiration alerts across every home."
                pricingRoute="/#pricing"
              >
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <FolderOpen size={14} /> {binderTotal} binder item{binderTotal !== 1 ? "s" : ""}
                  </span>
                  {warrantyTotal > 0 && (
                    <span className="flex items-center gap-1.5 text-accent">
                      <AlertTriangle size={14} /> {warrantyTotal} warrant{warrantyTotal !== 1 ? "ies" : "y"} expiring soon
                    </span>
                  )}
                </div>
              </UpgradeGate>
            </div>
          </>
        )}
      </div>

      {/* ─── My Job Posts ─── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Briefcase size={20} className="text-primary" />
            My Job Posts
            <span className="text-sm font-normal text-muted-foreground">({jobStats.total})</span>
          </h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate("/job-board")}>View Board</Button>
            <Button size="sm" onClick={() => navigate("/post-job")}>
              <Plus size={14} className="mr-1.5" /> Post Job
            </Button>
          </div>
        </div>
        {jobStats.total === 0 ? (
          <Card className="text-center py-10">
            <CardContent>
              <Briefcase size={36} className="mx-auto text-primary mb-3" />
              <h3 className="font-display font-bold text-lg mb-1">No job posts yet</h3>
              <p className="text-muted-foreground text-sm mb-4 max-w-sm mx-auto">
                Post a repair or project and local pros will bid on it — usually within a day.
              </p>
              <Button onClick={() => navigate("/post-job")}><Plus size={14} className="mr-1.5" /> Post your first job</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard icon={Briefcase} value={jobStats.total} label="Total Posts" onClick={() => navigate("/post-job")} />
            <StatCard icon={Clock} value={jobStats.pending} label="Pending" onClick={() => navigate("/post-job")} />
            <StatCard icon={Gavel} value={jobStats.withBids} label="With Bids" onClick={() => navigate("/post-job")} />
            <StatCard icon={CheckCircle2} value={jobStats.accepted} label="Accepted" onClick={() => navigate("/post-job")} />
            <StatCard icon={PartyPopper} value={jobStats.completed} label="Completed" onClick={() => navigate("/post-job")} />
          </div>
        )}
      </div>

      <GarageAnalyticsSection />

      <UpgradeGate
        hasAccess={subscriptionTier === "multi_pro"}
        featureName={`Unlock ${cfg.name}`}
        description={`${cfg.price}${cfg.period} — here's what you'll get by upgrading.`}
        benefits={cfg.newFeatures}
        pricingRoute="/#pricing"
      >
        <></>
      </UpgradeGate>
    </div>
  );
};

export default HomeownerOverviewTab;
