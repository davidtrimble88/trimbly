import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  value: React.ReactNode;
  label: string;
  emptyLabel?: string;
  isEmpty?: boolean;
  onClick?: () => void;
}

const StatCard = ({ icon: Icon, value, label, emptyLabel, isEmpty, onClick }: StatCardProps) => {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`rounded-xl border border-border bg-card p-5 text-center shadow-[var(--card-shadow)] transition-all ${
        onClick ? "hover:border-primary/40 hover:shadow-[var(--card-shadow-hover)] cursor-pointer" : ""
      }`}
    >
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2.5">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      {isEmpty && emptyLabel ? (
        <p className="text-sm font-medium text-muted-foreground">{emptyLabel}</p>
      ) : (
        <>
          <p className="font-display text-2xl font-semibold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </>
      )}
    </Tag>
  );
};

export default StatCard;
