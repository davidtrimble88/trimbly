import { MessageSquare, Gavel, CheckCircle2, Users, Star, Activity as ActivityIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { useHomeownerActivity, type ActivityType } from "@/hooks/useHomeownerActivity";

const iconFor: Record<ActivityType, typeof MessageSquare> = {
  message: MessageSquare,
  bid: Gavel,
  task_completed: CheckCircle2,
  home_shared: Users,
  review: Star,
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** "What's changed since I last looked" — a merged timeline of messages,
 * bids, completed tasks, home shares, and reviews, since there was
 * previously no single place to see recent activity at a glance. */
export default function ActivityFeedTab() {
  const { items, loading } = useHomeownerActivity();

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ActivityIcon}
        title="Nothing new yet"
        description="Messages, bids, completed tasks, and anything else that changes will show up here."
      />
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card divide-y divide-border">
      {items.map((item) => {
        const Icon = iconFor[item.type];
        return (
          <div key={item.id} className="flex items-start gap-3 p-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Icon size={15} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
              {item.sublabel && <p className="text-xs text-muted-foreground truncate mt-0.5">{item.sublabel}</p>}
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{timeAgo(item.createdAt)}</span>
          </div>
        );
      })}
    </div>
  );
}
