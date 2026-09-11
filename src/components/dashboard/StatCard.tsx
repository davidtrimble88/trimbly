import { useEffect, useRef, useState } from "react";
import { LucideIcon } from "lucide-react";

export type StatCardTone = "default" | "success" | "warning" | "danger";

interface StatCardProps {
  icon: LucideIcon;
  value: React.ReactNode;
  label: string;
  emptyLabel?: string;
  isEmpty?: boolean;
  onClick?: () => void;
  /** Colors the icon circle (and the value, for warning/danger) to match what
   * the number means: "danger" for overdue/urgent, "warning" for
   * expiring-soon/needs-attention, "success" for a satisfying completed
   * count, "default" (the original neutral primary tint) otherwise. */
  tone?: StatCardTone;
}

const toneClasses: Record<StatCardTone, { circle: string; icon: string; value: string }> = {
  default: { circle: "bg-primary/10", icon: "text-primary", value: "text-foreground" },
  success: { circle: "bg-success/15", icon: "text-success", value: "text-foreground" },
  warning: { circle: "bg-warning/15", icon: "text-warning", value: "text-warning" },
  danger: { circle: "bg-destructive/15", icon: "text-destructive", value: "text-destructive" },
};

const StatCard = ({ icon: Icon, value, label, emptyLabel, isEmpty, onClick, tone = "default" }: StatCardProps) => {
  const Tag = onClick ? "button" : "div";
  const t = toneClasses[isEmpty ? "default" : tone];

  // Mount-only entrance — a ref (not state derived from props) so a parent
  // re-render (e.g. editing a sibling home) never replays it.
  const mountedRef = useRef(false);
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    setAnimate(true);
  }, []);

  return (
    <Tag
      onClick={onClick}
      className={`w-full rounded-2xl border border-border bg-card p-5 text-left shadow-[var(--card-shadow)] transition-all ${
        animate ? "animate-fade-in-up" : ""
      } ${onClick ? "hover:border-primary/40 hover:shadow-[var(--card-shadow-hover)] cursor-pointer" : ""}`}
    >
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${t.circle}`}>
        <Icon className={`h-[1.15rem] w-[1.15rem] ${t.icon}`} strokeWidth={1.8} />
      </div>
      {isEmpty && emptyLabel ? (
        <p className="font-body text-sm font-medium text-muted-foreground">{emptyLabel}</p>
      ) : (
        <>
          <p className={`font-display text-[1.75rem] font-bold leading-none ${t.value}`}>{value}</p>
          <p className="mt-1.5 font-body text-xs text-muted-foreground">{label}</p>
        </>
      )}
    </Tag>
  );
};

export default StatCard;
