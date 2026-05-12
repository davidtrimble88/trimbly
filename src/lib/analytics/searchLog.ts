import { supabase } from "@/integrations/supabase/client";

export type SearchType = "provider" | "ai" | "manual";

interface LogParams {
  search_type: SearchType;
  query: string;
  category?: string | null;
  location?: string | null;
  results_count?: number | null;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget search logger. Captures the user id when signed in,
 * stores anonymously otherwise. Never throws — analytics must not break UX.
 */
export async function logSearch(params: LogParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("search_logs").insert([{
      user_id: user?.id ?? null,
      search_type: params.search_type,
      query: (params.query || "").slice(0, 500),
      category: params.category ?? null,
      location: params.location ?? null,
      results_count: params.results_count ?? null,
      metadata: params.metadata ?? {},
    }]);
  } catch {
    // ignore — analytics best-effort
  }
}
