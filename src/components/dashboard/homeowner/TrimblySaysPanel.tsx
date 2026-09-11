import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandMark from "@/components/BrandMark";

export interface TrimblySaysItem {
  id: string | number;
  icon: LucideIcon;
  title: string;
  detail: string;
  tone?: "primary" | "warning" | "danger" | "success" | "intelligence";
}

const toneClasses: Record<NonNullable<TrimblySaysItem["tone"]>, string> = {
  primary: "text-primary",
  warning: "text-warning",
  danger: "text-destructive",
  success: "text-success",
  intelligence: "text-intelligence",
};

interface TrimblySaysPanelProps {
  headline: string;
  items: TrimblySaysItem[];
  actionLabel?: string;
  onAction?: () => void;
}

/** Mirrors the "TRIMBLY SAYS" panel on the public homepage so the portal
 * looks like what people were shown before signing up. Presentation only. */
export default function TrimblySaysPanel({ headline, items, actionLabel, onAction }: TrimblySaysPanelProps) {
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/[0.07] p-5 md:p-6">
      <div className="flex items-center gap-2 text-sm font-bold text-primary">
        <BrandMark className="h-8 w-8" /> TRIMBLY SAYS
      </div>
      <h3 className="mt-4 font-display text-xl font-bold text-foreground">{headline}</h3>
      {items.length > 0 && (
        <div className="mt-3 divide-y divide-primary/15 text-sm">
          {items.map(({ id, icon: Icon, title, detail, tone = "primary" }) => (
            <div key={id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
              <Icon className={`h-4 w-4 shrink-0 ${toneClasses[tone]}`} />
              <p>
                <strong className="text-foreground">{title}</strong>
                <span className="block text-muted-foreground">{detail}</span>
              </p>
            </div>
          ))}
        </div>
      )}
      {actionLabel && onAction && (
        <Button className="mt-5 w-full rounded-lg sm:w-auto sm:px-6" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
