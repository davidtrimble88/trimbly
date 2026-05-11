import { supabase } from "@/integrations/supabase/client";

export interface SymptomTriage {
  diagnosis_title: string;
  system: string;
  urgency: "emergency" | "urgent" | "soon" | "monitor";
  urgency_reasoning: string;
  safety_warning: string;
  likely_causes: { cause: string; likelihood: "high" | "medium" | "low" }[];
  diy_recommended: boolean;
  diy_steps: string[];
  when_to_call_pro: string[];
  recommended_pro_type: string;
  estimated_cost_low: number;
  estimated_cost_high: number;
  summary: string;
}

export async function getSymptomTriage(params: {
  symptom: string;
  system_type?: string;
  home_context?: string;
}): Promise<SymptomTriage> {
  const { data, error } = await supabase.functions.invoke("ai-symptom-triage", {
    body: params,
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.triage;
}
