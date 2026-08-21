import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Star, Briefcase, CheckCircle, MessageSquare, Eye, Sparkles, ExternalLink, ArrowRight } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { bidStatusClasses, bidStatusLabel } from "@/components/dashboard/status";
import type { BidWithJob } from "./types";

interface ProOverviewTabProps {
  providerId: string;
  businessName: string;
  category: string;
  avgRating: string;
  reviewCount: number;
  pendingBids: number;
  acceptedBids: number;
  unreadMessages: number;
  recentBids: BidWithJob[];
  onGoToTab: (tab: string) => void;
}

const ProOverviewTab = ({
  providerId, businessName, category, avgRating, reviewCount, pendingBids, acceptedBids, unreadMessages, recentBids, onGoToTab,
}: ProOverviewTabProps) => {
  const navigate = useNavigate();

  // Bids stay "accepted" even after their job wraps up (job.status flips to
  // "completed" separately), so split the accepted bucket into still-active
  // vs. completed rather than double-counting a bid in two funnel stages.
  const completedBids = recentBids.filter((b) => b.status === "accepted" && b.job?.status === "completed").length;
  const activeAcceptedBids = Math.max(acceptedBids - completedBids, 0);
  const funnelTotal = Math.max(pendingBids + activeAcceptedBids + completedBids, 1);
  const funnelStages: { label: string; value: number; bar: string; text: string }[] = [
    { label: "Pending", value: pendingBids, bar: "bg-warning", text: "text-warning" },
    { label: "Accepted", value: activeAcceptedBids, bar: "bg-primary", text: "text-primary" },
    { label: "Completed", value: completedBids, bar: "bg-success", text: "text-success" },
  ];

  const numericRating = Number(avgRating);
  const filledStars = Number.isFinite(numericRating) ? Math.round(numericRating) : 0;

  const quickActions = [
    { icon: Eye, label: "Browse Job Board", desc: "Find new jobs and send bids", onClick: () => navigate("/job-board") },
    { icon: Briefcase, label: "My Bids", desc: "Track bids and their status", onClick: () => onGoToTab("bids") },
    { icon: Sparkles, label: "Pro Tools", desc: "Quotes, plans, service area, analytics", onClick: () => onGoToTab("tools") },
    { icon: MessageSquare, label: "Messages", desc: "Reply to homeowner inquiries", onClick: () => onGoToTab("messages") },
    { icon: Star, label: "Reviews", desc: "See what homeowners are saying", onClick: () => onGoToTab("reviews") },
    { icon: ExternalLink, label: "Public Profile", desc: "How homeowners see your business", onClick: () => navigate(`/pro/${providerId}`) },
    { icon: Sparkles, label: "Equipment Marketplace", desc: "Rent gear to / from other pros", onClick: () => navigate("/equipment") },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--card-shadow)]">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Bid Pipeline</h2>
        <div className="flex items-center gap-2">
          {funnelStages.map((stage, i) => (
            <div key={stage.label} className="flex flex-1 items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground truncate">{stage.label}</span>
                  <span className={`text-sm font-semibold ${stage.text}`}>{stage.value}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${stage.bar} transition-all`}
                    style={{ width: stage.value > 0 ? `${Math.max((stage.value / funnelTotal) * 100, 8)}%` : "0%" }}
                  />
                </div>
              </div>
              {i < funnelStages.length - 1 && (
                <ArrowRight size={14} className="text-muted-foreground shrink-0 self-end mb-1" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Star} value={avgRating} label={`${reviewCount} review${reviewCount !== 1 ? "s" : ""}`} isEmpty={reviewCount === 0} emptyLabel="No reviews yet" onClick={() => onGoToTab("reviews")} />
        <StatCard icon={Briefcase} value={pendingBids} label="Pending bids" onClick={() => onGoToTab("bids")} />
        <StatCard icon={CheckCircle} value={acceptedBids} label="Accepted" onClick={() => onGoToTab("bids")} tone="success" />
        <StatCard icon={MessageSquare} value={unreadMessages} label="Unread" onClick={() => onGoToTab("messages")} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickActions.map((a) => (
            <button
              key={a.label}
              onClick={a.onClick}
              className="group rounded-xl border border-border bg-card p-4 text-left shadow-[var(--card-shadow)] hover:border-primary/40 hover:shadow-[var(--card-shadow-hover)] transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <a.icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-foreground flex items-center justify-between">
                    {a.label}
                    <ArrowRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">How Homeowners See You</h2>
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display font-semibold text-foreground truncate">{businessName}</span>
                <Badge variant="secondary" className="text-xs">{category}</Badge>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className="flex items-center">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={i < filledStars ? "text-warning" : "text-muted-foreground"}
                      fill={i < filledStars ? "currentColor" : "none"}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {reviewCount > 0 ? `${avgRating} (${reviewCount} review${reviewCount !== 1 ? "s" : ""})` : "No reviews yet"}
                </span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => navigate(`/pro/${providerId}`)}>
              View Public Profile <ExternalLink size={14} />
            </Button>
          </div>
        </Card>
      </div>

      {recentBids.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Bids</h2>
            <button onClick={() => onGoToTab("bids")} className="text-xs text-primary hover:underline">View all</button>
          </div>
          <div className="space-y-2">
            {recentBids.slice(0, 3).map((b) => (
              <button
                key={b.id}
                onClick={() => onGoToTab("bids")}
                className="w-full rounded-lg border border-border bg-card p-3 text-left hover:border-primary/40 transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm text-foreground truncate">{b.job?.title || "Job"}</div>
                  <div className="text-xs text-muted-foreground">
                    {b.job?.city}, {b.job?.state} · {new Date(b.created_at).toLocaleDateString()}
                  </div>
                </div>
                <Badge className={`text-xs ${bidStatusClasses[b.status] || bidStatusClasses.pending}`}>
                  {bidStatusLabel[b.status] || b.status}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProOverviewTab;
