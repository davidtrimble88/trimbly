import { Link } from "react-router-dom";
import { Loader2, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CoverageVerdict } from "@/lib/api/coverageCheck";

const coverageStatusLabel: Record<CoverageVerdict["status"], string> = {
  likely_covered: "Likely covered",
  possibly_covered: "May be covered",
  not_covered: "Not covered",
  unclear: "Couldn't confirm from your documents",
};

interface CoverageCalloutProps {
  loading: boolean;
  error: boolean;
  verdict: CoverageVerdict | null;
  /** True once we know whether the person has uploaded any documents. */
  docsChecked: boolean;
  hasDocs: boolean;
  /** Shown when there is nothing uploaded yet. */
  emptyPrompt?: string;
  className?: string;
}

/** The coverage answer, worded and styled the same everywhere it appears. */
export default function CoverageCallout({
  loading, error, verdict, docsChecked, hasDocs, emptyPrompt, className = "",
}: CoverageCalloutProps) {
  return (
    <div className={`rounded-lg bg-primary/[0.08] p-3 text-sm text-foreground ${className}`}>
      {loading ? (
        <span className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking your warranty and insurance documents…
        </span>
      ) : verdict ? (
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p>
              <strong>Coverage:</strong> {coverageStatusLabel[verdict.status]}
              {verdict.source && verdict.source !== "None" ? ` — ${verdict.source}` : ""}
            </p>
            <p className="mt-1 text-muted-foreground">{verdict.explanation}</p>
            {verdict.next_step && <p className="mt-1 text-muted-foreground">{verdict.next_step}</p>}
          </div>
        </div>
      ) : error ? (
        <span className="flex items-start gap-2 text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          We couldn't check your coverage documents this time. Try again in a moment.
        </span>
      ) : docsChecked && !hasDocs ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <strong>Coverage:</strong>{" "}
              {emptyPrompt ??
                "This might be covered. Add your home warranty or insurance policy and Trimbly will check it against issues like this one automatically."}
            </span>
          </div>
          <Button asChild size="sm" variant="outline" className="bg-card">
            <Link to="/coverage"><Upload size={14} className="mr-1.5" /> Upload your documents</Link>
          </Button>
        </div>
      ) : (
        <span className="flex items-center gap-2 text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-primary" /> Checking your coverage…
        </span>
      )}
    </div>
  );
}
