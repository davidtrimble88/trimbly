import { ReactNode } from "react";
import BrandMark from "@/components/BrandMark";

interface TrimblyResultCardProps {
  /** Small eyebrow above the line, e.g. "MY HOME". */
  eyebrow?: string;
  /** The "here's what Trimbly found" line. */
  title: string;
  /** Optional chip on the right, e.g. the system or category. */
  tag?: string;
  children: ReactNode;
  className?: string;
}

/** The result card people see on the Trimbly website — reused by every tool
 * page so a diagnosis, an estimate, and a quote review all look like one product. */
export default function TrimblyResultCard({ eyebrow = "MY HOME", title, tag, children, className = "" }: TrimblyResultCardProps) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 shadow-[var(--product-shadow)] ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <BrandMark className="h-9 w-9" />
          <div>
            <p className="text-xs font-bold text-primary">{eyebrow}</p>
            <p className="text-sm font-semibold text-foreground">{title}</p>
          </div>
        </div>
        {tag && <span className="rounded-md bg-accent/15 px-2.5 py-1 text-xs font-bold text-accent-foreground">{tag}</span>}
      </div>
      {children}
    </div>
  );
}
