import { MessageSquare, CheckCircle2, XCircle, Star, DollarSign, Activity as ActivityIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useProActivity, type ProActivityType } from "@/hooks/useProActivity";

const iconFor: Record<ProActivityType, typeof MessageSquare> = {
  message: MessageSquare,
  bid_accepted: CheckCircle2,
  bid_rejected: XCircle,
  review_received: Star,
  quote_paid: DollarSign,
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

export default function ProActivityFeedTab({ providerId }: { providerId: string | null }) {
  const { items, loading } = useProActivity(providerId);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
          <ActivityIcon className="w-8 h-8 text-primary" />
        </div>
        <h3 className="font-display text-xl font-bold text-foreground mb-2">Nothing new yet</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Messages, bid results, reviews, and paid quotes will show up here.
        </p>
      </div>
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
