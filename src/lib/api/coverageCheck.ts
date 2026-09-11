import { supabase } from "@/integrations/supabase/client";
import { guessMimeType } from "@/lib/fileMime";

export type CoverageVerdict = {
  status: "likely_covered" | "possibly_covered" | "not_covered" | "unclear";
  source: string;
  explanation: string;
  next_step: string;
};

type DocFileRef = { url: string; mimeType: string; label: string };

/** Signed, readable references to the user's uploaded warranty/insurance docs. */
export async function loadCoverageDocRefs(userId: string): Promise<DocFileRef[]> {
  const { data, error } = await supabase
    .from("coverage_documents")
    .select("document_type, file_name, file_url, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data || data.length === 0) return [];

  const refs = await Promise.all(
    data.map(async (d: any): Promise<DocFileRef | null> => {
      const label = `[${String(d.document_type).toUpperCase()}] ${d.file_name} (uploaded ${new Date(d.created_at).toLocaleDateString()})`;
      try {
        const parts = String(d.file_url).split("/coverage-docs/");
        const storagePath = parts.length > 1 ? parts[1] : d.file_url;
        const { data: signed } = await supabase.storage.from("coverage-docs").createSignedUrl(storagePath, 120);
        if (!signed?.signedUrl) return null;
        return { url: signed.signedUrl, mimeType: guessMimeType(d.file_name), label };
      } catch {
        return null;
      }
    }),
  );
  return refs.filter((r): r is DocFileRef => !!r);
}

export async function checkCoverage(issue: string, documentFiles: DocFileRef[]): Promise<CoverageVerdict | null> {
  const { data, error } = await supabase.functions.invoke("coverage-check", {
    body: { issue, documentFiles },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return (data?.coverage as CoverageVerdict) ?? null;
}
