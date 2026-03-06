import { supabase } from "@/integrations/supabase/client";

export interface ProviderWithStats {
  id: string;
  user_id: string;
  business_name: string;
  category: string;
  description: string;
  hourly_rate_min: number;
  hourly_rate_max: number;
  currency: string;
  licensed: boolean;
  available: boolean;
  city: string;
  state: string;
  country: string;
  phone: string | null;
  website: string | null;
  years_experience: number;
  avg_rating: number;
  review_count: number;
}

export async function fetchProviders(filters?: {
  category?: string;
  country?: string;
  searchQuery?: string;
  locationQuery?: string;
}): Promise<ProviderWithStats[]> {
  let query = supabase
    .from("providers")
    .select("*");

  if (filters?.category && filters.category !== "All") {
    query = query.eq("category", filters.category);
  }
  if (filters?.country && filters.country !== "all") {
    query = query.eq("country", filters.country);
  }
  if (filters?.searchQuery) {
    const q = filters.searchQuery;
    query = query.or(`business_name.ilike.%${q}%,category.ilike.%${q}%,city.ilike.%${q}%,state.ilike.%${q}%`);
  }
  if (filters?.locationQuery) {
    const q = filters.locationQuery;
    query = query.or(`city.ilike.%${q}%,state.ilike.%${q}%`);
  }

  const { data: providers, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;

  // Fetch stats
  const { data: stats } = await supabase
    .from("provider_stats")
    .select("*");

  const statsMap = new Map(
    (stats || []).map((s: any) => [s.provider_id, s])
  );

  return (providers || []).map((p: any) => {
    const s = statsMap.get(p.id) || { avg_rating: 0, review_count: 0 };
    return {
      ...p,
      avg_rating: Number(s.avg_rating),
      review_count: Number(s.review_count),
    };
  });
}

export async function searchProvidersWithAI(query: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("ai-search-providers", {
    body: { query },
  });
  if (error) throw error;
  return data?.recommendation || "";
}
