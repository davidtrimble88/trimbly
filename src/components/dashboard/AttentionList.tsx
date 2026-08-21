import { Badge } from "@/components/ui/badge";

export interface AttentionListItem {
  id: string | number;
  label: string;
  sublabel?: string;
  date?: string;
  urgent?: boolean;
}

interface AttentionListProps {
  items: AttentionListItem[];
  emptyText?: string;
}

export default function AttentionList({ items, emptyText }: AttentionListProps) {
  if (items.length === 0) {
    if (!emptyText) return null;
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.id} className="py-2 flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2 min-w-0">
            <span className={`size-1.5 rounded-full shrink-0 ${item.urgent ? "bg-destructive" : "bg-muted-foreground"}`} />
            <span className="truncate">
              {item.label}
              {item.sublabel && <span className="text-muted-foreground"> · {item.sublabel}</span>}
            </span>
          </span>
          {item.date && (
            <Badge variant={item.urgent ? "destructive" : "outline"} className="shrink-0">{item.date}</Badge>
          )}
        </li>
      ))}
    </ul>
  );
}
