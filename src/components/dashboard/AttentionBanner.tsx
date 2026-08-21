import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AttentionBannerProps {
  severity: "warning" | "danger";
  title: string;
  items: string[];
  actionLabel?: string;
  onAction?: () => void;
}

export default function AttentionBanner({ severity, title, items, actionLabel, onAction }: AttentionBannerProps) {
  if (items.length === 0) return null;

  const isDanger = severity === "danger";

  return (
    <div className={`mb-6 rounded-lg border p-4 flex items-start gap-3 ${isDanger ? "border-destructive/50 bg-destructive/10" : "border-warning/50 bg-warning/10"}`}>
      <AlertTriangle className={`mt-0.5 shrink-0 ${isDanger ? "text-destructive" : "text-warning"}`} size={20} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground">{title}</p>
        <ul className="text-sm text-muted-foreground mt-1 space-y-0.5">
          {items.map((item, i) => (
            <li key={i}>
              <span className={`font-medium ${isDanger ? "text-destructive" : "text-warning"}`}>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      {actionLabel && onAction && (
        <Button size="sm" variant="outline" onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}
