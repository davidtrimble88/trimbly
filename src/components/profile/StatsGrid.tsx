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
      <Card key={s.label}>
        <CardContent className="p-4 text-center">
          <s.icon size={20} className="text-primary mx-auto mb-2" />
          <div className="text-2xl font-bold text-foreground">{s.value}</div>
          <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
        </CardContent>
      </Card>
    ))}
  </div>
);

export default StatsGrid;
