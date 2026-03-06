import { supabase } from "@/integrations/supabase/client";

export interface JobEstimate {
  job_title: string;
  category: string;
  cost_low: number;
  cost_high: number;
  time_hours_low: number;
  time_hours_high: number;
  difficulty: number;
  diy_recommended: boolean;
  diy_reasoning: string;
  materials: { name: string; estimated_cost: number; quantity?: string }[];
  tips: string[];
  summary: string;
}

export async function getJobEstimate(params: {
  description: string;
  category?: string;
  city?: string;
  state?: string;
}): Promise<JobEstimate> {
  const { data, error } = await supabase.functions.invoke("job-estimator", {
    body: params,
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.estimate;
}
