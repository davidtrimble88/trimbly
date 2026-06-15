import { supabase } from "@/integrations/supabase/client";

export interface ProviderWithStats {
  id: string;
  user_id?: string;
  business_name: string;
  category: string;
  description: string;
  hourly_rate_min: number;
  hourly_rate_max: number;
  currency: string;
  licensed: boolean;
  insured: boolean;
  available: boolean;
  city: string;
  state: string;
  country: string;
  phone: string | null;
  website: string | null;
  years_experience: number;
  license_number?: string;
  insurance_details?: string;
  subscription_tier: "free" | "pro" | "elite";
  avg_rating: number;
  review_count: number;
  rating_source?: string | null;
  source?: "db" | "web";
}

export async function fetchProviders(filters?: {
  category?: string;
  country?: string;
  searchQuery?: string;
  locationQuery?: string;
}): Promise<ProviderWithStats[]> {
  // Fetch registered providers from DB
  // Note: sensitive columns (phone, license_number, license_expiry, insurance_details, insurance_expiry)
  // are intentionally excluded so this query works for anonymous visitors and never leaks PII.
  let query = supabase.from("providers").select(
    "id, user_id, business_name, category, description, hourly_rate_min, hourly_rate_max, currency, licensed, insured, available, city, state, country, website, years_experience, subscription_tier, verified, featured, bio, gallery_urls, emergency_available, emergency_rate_multiplier, service_radius_miles, business_hours, slug, provider_type, created_at"
  );

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

  const { data: stats } = await supabase.from("provider_stats").select("*");
  const statsMap = new Map((stats || []).map((s: any) => [s.provider_id, s]));

  const dbProviders: ProviderWithStats[] = (providers || []).map((p: any) => {
    const s = statsMap.get(p.id) || { avg_rating: 0, review_count: 0 };
    return { ...p, avg_rating: Number(s.avg_rating), review_count: Number(s.review_count), source: "db" as const };
  });

  // Sort: elite first, then pro, then free
  const tierOrder = { elite: 0, pro: 1, free: 2 };
  dbProviders.sort((a, b) => {
    const tierDiff = (tierOrder[a.subscription_tier] ?? 2) - (tierOrder[b.subscription_tier] ?? 2);
    if (tierDiff !== 0) return tierDiff;
    return b.avg_rating - a.avg_rating;
  });

  return dbProviders;
}

export async function discoverWebProviders(filters: {
  category?: string;
  city?: string;
  state?: string;
  country?: string;
  searchQuery?: string;
}): Promise<ProviderWithStats[]> {
  const { data, error } = await supabase.functions.invoke("discover-providers", {
    body: filters,
  });
  if (error) throw error;
  return data?.providers || [];
}

export async function searchProvidersWithAI(query: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("ai-search-providers", {
    body: { query },
  });
  if (error) throw error;
  return data?.recommendation || "";
}
