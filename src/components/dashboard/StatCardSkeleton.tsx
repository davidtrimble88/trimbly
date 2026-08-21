import { Skeleton } from "@/components/ui/skeleton";

/** Loading placeholder shaped like StatCard (icon circle + value + label),
 * so a row of these mimics the real stat-card grid instead of a blank box. */
export default function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-center shadow-[var(--card-shadow)]">
      <Skeleton className="w-10 h-10 rounded-full mx-auto mb-2.5" />
      <Skeleton className="h-6 w-12 mx-auto mb-1.5" />
      <Skeleton className="h-3 w-16 mx-auto" />
    </div>
  );
}
