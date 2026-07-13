import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

export interface Stat {
  label: string;
  value: string | number;
  icon: LucideIcon;
}

const StatsGrid = ({ stats }: { stats: Stat[] }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {stats.map((s) => (
      <Card key={s.label} className="shadow-[var(--card-shadow)]">
        <CardContent className="p-4 text-center">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <s.icon size={17} className="text-primary" />
          </div>
          <div className="font-display text-2xl font-semibold text-foreground">{s.value}</div>
          <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
        </CardContent>
      </Card>
    ))}
  </div>
);

export default StatsGrid;
