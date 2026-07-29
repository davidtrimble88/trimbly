import { supabase } from "@/integrations/supabase/client";

export type RiskLevel = "low" | "medium" | "high";

export interface RedFlag {
  issue: string;
  severity: RiskLevel;
  explanation: string;
}

export interface QuoteReview {
  overall_risk: RiskLevel;
  risk_summary: string;
  red_flags: RedFlag[];
  positive_signs: string[];
  missing_items: string[];
  questions_to_ask: string[];
  suggested_next_step: string;
}

export async function reviewQuote(params: { quoteText: string; projectContext?: string }): Promise<QuoteReview> {
  const { data, error } = await supabase.functions.invoke("quote-reviewer", {
    body: { quote_text: params.quoteText, project_context: params.projectContext },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.review;
}
