import { useEffect, useState } from "react";
import { checkCoverage, loadCoverageDocRefs, type CoverageVerdict } from "@/lib/api/coverageCheck";

type DocRef = { url: string; mimeType: string; label: string };

/** Shared "is this covered?" behaviour so every tool page (diagnosis, estimate,
 * quote review) can answer the same question from the same uploaded documents. */
export function useCoverageCheck(userId: string | undefined) {
  const [docRefs, setDocRefs] = useState<DocRef[]>([]);
  const [docsChecked, setDocsChecked] = useState(false);
  const [coverage, setCoverage] = useState<CoverageVerdict | null>(null);
  const [coverageLoading, setCoverageLoading] = useState(false);
  const [coverageError, setCoverageError] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const refs = await loadCoverageDocRefs(userId);
      if (!cancelled) { setDocRefs(refs); setDocsChecked(true); }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const reset = () => { setCoverage(null); setCoverageError(false); };

  /** Runs only when the person has actually uploaded warranty/insurance docs. */
  const run = async (issue: string) => {
    if (docRefs.length === 0) return;
    setCoverageLoading(true);
    setCoverage(null);
    setCoverageError(false);
    try {
      setCoverage(await checkCoverage(issue, docRefs));
    } catch {
      setCoverageError(true);
    } finally {
      setCoverageLoading(false);
    }
  };

  return { docRefs, docsChecked, coverage, coverageLoading, coverageError, run, reset };
}
