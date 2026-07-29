import { supabase } from "@/integrations/supabase/client";

export type ValueVerdict = "increases_value" | "neutral" | "decreases_value" | "depends";
export type SkillLevel = "beginner" | "intermediate" | "advanced" | "pro_recommended";

export interface QuickValueEstimate {
  project_title: string;
  verdict: ValueVerdict;
  estimated_roi_percent_low: number;
  estimated_roi_percent_high: number;
  estimated_cost_low: number;
  estimated_cost_high: number;
  estimated_value_added_low: number;
  estimated_value_added_high: number;
  summary: string;
  regional_note: string;
  follow_up_questions: string[];
}

export interface DetailedValueStep {
  step_number: number;
  title: string;
  description: string;
  recommendation: "diy" | "pro_recommended" | "either";
  skill_level: SkillLevel;
  estimated_time: string;
  diy_cost_estimate: number;
  pro_cost_estimate: number;
  safety_notes: string;
}

export interface DetailedValueEstimate {
  project_title: string;
  verdict: ValueVerdict;
  confidence: "medium" | "high";
  estimated_roi_percent_low: number;
  estimated_roi_percent_high: number;
  estimated_cost_low: number;
  estimated_cost_high: number;
  estimated_value_added_low: number;
  estimated_value_added_high: number;
  summary: string;
  materials: { name: string; estimated_cost: number; quantity?: string }[];
  total_time_estimate: string;
  overall_skill_level: SkillLevel;
  steps: DetailedValueStep[];
  total_diy_cost_low: number;
  total_diy_cost_high: number;
  total_pro_cost_low: number;
  total_pro_cost_high: number;
  permits_likely_needed: boolean;
  permit_note: string;
  tips: string[];
}

export async function getQuickValueEstimate(params: {
  description: string;
  homeContext?: string;
}): Promise<QuickValueEstimate> {
  const { data, error } = await supabase.functions.invoke("home-value-advisor", {
    body: { mode: "quick", description: params.description, home_context: params.homeContext },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.result;
}

export async function getDetailedValueEstimate(params: {
  description: string;
  homeContext?: string;
  followUpAnswers: { question: string; answer: string }[];
}): Promise<DetailedValueEstimate> {
  const { data, error } = await supabase.functions.invoke("home-value-advisor", {
    body: {
      mode: "detailed",
      description: params.description,
      home_context: params.homeContext,
      follow_up_answers: params.followUpAnswers,
    },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.result;
}
