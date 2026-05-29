// Business analytics aggregation: subscriptions, users, and revenue (MRR/ARR).
// Service-role scan + paginated reads so it scales past the 1k PostgREST cap.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tier -> monthly USD. Keep in sync with subscriptions memory + pro pricing.
const HOMEOWNER_PRICE: Record<string, number> = { free: 0, homeowner_pro: 5, multi_pro: 20 };
const PROVIDER_PRICE: Record<string, number> = { free: 0, pro: 29 };

const HOMEOWNER_LABEL: Record<string, string> = {
  free: "Free",
  homeowner_pro: "Home Hero ($5)",
  multi_pro: "Home Super Hero ($20)",
};
const PROVIDER_LABEL: Record<string, string> = {
  free: "Free Provider",
  pro: "Pro Provider ($29)",
};

async function fetchAll(client: any, table: string, columns: string): Promise<any[]> {
  const pageSize = 1000;
  const rows: any[] = [];
  let from = 0;
  const HARD_CAP = 500_000;
  while (from < HARD_CAP) {
    const { data, error } = await client.from(table).select(columns).range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userJwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!userJwt) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${userJwt}` } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roles } = await authClient.from("user_roles").select("role").eq("user_id", user.id);
    const allowed = (roles || []).some((r: any) => r.role === "admin" || r.role === "analyst");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const [profiles, providers, jobs, bids, rentals, agreements] = await Promise.all([
      fetchAll(admin, "profiles", "id, user_type, subscription_tier, created_at, suspended"),
      fetchAll(admin, "providers", "id, user_id, subscription_tier, category, country, state, city, created_at, verified, featured"),
      fetchAll(admin, "jobs", "id, status, created_at"),
      fetchAll(admin, "job_bids", "id, bid_amount, status, created_at"),
      fetchAll(admin, "equipment_rentals", "id, price_day, available, created_at"),
      fetchAll(admin, "rental_agreements", "id, total, status, created_at, owner_signature, renter_signature"),
    ]);

    // --- Users ---
    const homeowners = profiles.filter((p: any) => (p.user_type || "homeowner") === "homeowner");
    const providerProfiles = profiles.filter((p: any) => p.user_type === "provider");
    const suspended = profiles.filter((p: any) => p.suspended).length;

    // --- Homeowner subscription distribution + MRR ---
    const homeownerByTier = new Map<string, number>();
    let homeownerMRR = 0;
    for (const p of homeowners) {
      const tier = (p.subscription_tier || "free") as string;
      homeownerByTier.set(tier, (homeownerByTier.get(tier) || 0) + 1);
      homeownerMRR += HOMEOWNER_PRICE[tier] ?? 0;
    }

    // --- Provider subscription distribution + MRR ---
    const providerByTier = new Map<string, number>();
    let providerMRR = 0;
    for (const pr of providers) {
      const tier = (pr.subscription_tier || "free") as string;
      providerByTier.set(tier, (providerByTier.get(tier) || 0) + 1);
      providerMRR += PROVIDER_PRICE[tier] ?? 0;
    }

    const subscriptionBreakdown = [
      ...Array.from(homeownerByTier.entries()).map(([k, count]) => ({
        audience: "Homeowner",
        tier_key: k,
        tier: HOMEOWNER_LABEL[k] || k,
        count,
        monthly_price: HOMEOWNER_PRICE[k] ?? 0,
        mrr: count * (HOMEOWNER_PRICE[k] ?? 0),
      })),
      ...Array.from(providerByTier.entries()).map(([k, count]) => ({
        audience: "Provider",
        tier_key: k,
        tier: PROVIDER_LABEL[k] || k,
        count,
        monthly_price: PROVIDER_PRICE[k] ?? 0,
        mrr: count * (PROVIDER_PRICE[k] ?? 0),
      })),
    ].sort((a, b) => b.mrr - a.mrr);

    const paidHomeowners = homeowners.filter((p: any) => (p.subscription_tier || "free") !== "free").length;
    const paidProviders = providers.filter((pr: any) => (pr.subscription_tier || "free") !== "free").length;
    const totalHomeowners = homeowners.length;
    const totalProviders = providers.length;
    const totalMRR = homeownerMRR + providerMRR;
    const totalARR = totalMRR * 12;
    const arpu = (totalHomeowners + totalProviders) > 0 ? totalMRR / (totalHomeowners + totalProviders) : 0;
    const arppu = (paidHomeowners + paidProviders) > 0 ? totalMRR / (paidHomeowners + paidProviders) : 0;

    // --- Growth: last 12 months of signups + cumulative MRR contribution ---
    const now = new Date();
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      months.push(monthKey(d));
    }
    const monthIndex = new Map(months.map((m, i) => [m, i]));

    const growth = months.map((m) => ({
      month: m, homeowners_new: 0, providers_new: 0, paid_new: 0,
      jobs_new: 0, bids_new: 0, rentals_new: 0, agreements_new: 0,
    }));

    for (const p of profiles) {
      if (!p.created_at) continue;
      const k = monthKey(new Date(p.created_at));
      const idx = monthIndex.get(k);
      if (idx === undefined) continue;
      if (p.user_type === "provider") growth[idx].providers_new += 1;
      else growth[idx].homeowners_new += 1;
      if ((p.subscription_tier || "free") !== "free") growth[idx].paid_new += 1;
    }
    for (const j of jobs) {
      const idx = monthIndex.get(monthKey(new Date(j.created_at)));
      if (idx !== undefined) growth[idx].jobs_new += 1;
    }
    for (const b of bids) {
      const idx = monthIndex.get(monthKey(new Date(b.created_at)));
      if (idx !== undefined) growth[idx].bids_new += 1;
    }
    for (const r of rentals) {
      const idx = monthIndex.get(monthKey(new Date(r.created_at)));
      if (idx !== undefined) growth[idx].rentals_new += 1;
    }
    for (const a of agreements) {
      const idx = monthIndex.get(monthKey(new Date(a.created_at)));
      if (idx !== undefined) growth[idx].agreements_new += 1;
    }

    // --- Marketplace economics ---
    const bidAmounts = bids.map((b: any) => Number(b.bid_amount)).filter((n: number) => n > 0);
    const acceptedBids = bids.filter((b: any) => b.status === "accepted");
    const acceptedBidAmounts = acceptedBids.map((b: any) => Number(b.bid_amount)).filter((n: number) => n > 0);
    const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
    const avg = (a: number[]) => (a.length ? sum(a) / a.length : 0);

    const gmv_bids_total = sum(bidAmounts);
    const gmv_bids_accepted = sum(acceptedBidAmounts);

    const signedAgreements = agreements.filter((a: any) => a.owner_signature && a.renter_signature);
    const gmv_rentals_signed = sum(signedAgreements.map((a: any) => Number(a.total) || 0));

    const completedJobs = jobs.filter((j: any) => j.status === "completed").length;
    const activeJobs = jobs.filter((j: any) => j.status === "pending" || j.status === "in_progress" || j.status === "active").length;

    // --- Top providers by tier for context ---
    const verifiedProviders = providers.filter((p: any) => p.verified).length;
    const featuredProviders = providers.filter((p: any) => p.featured).length;
    const availableRentals = rentals.filter((r: any) => r.available).length;

    const totals = {
      total_users: totalHomeowners + totalProviders,
      homeowners: totalHomeowners,
      providers: totalProviders,
      paid_homeowners: paidHomeowners,
      paid_providers: paidProviders,
      paid_total: paidHomeowners + paidProviders,
      suspended_users: suspended,
      conversion_rate: (totalHomeowners + totalProviders) > 0
        ? ((paidHomeowners + paidProviders) / (totalHomeowners + totalProviders)) * 100
        : 0,
      mrr: totalMRR,
      arr: totalARR,
      mrr_homeowners: homeownerMRR,
      mrr_providers: providerMRR,
      arpu, arppu,
      gmv_bids_total, gmv_bids_accepted, gmv_rentals_signed,
      total_jobs: jobs.length, completed_jobs: completedJobs, active_jobs: activeJobs,
      total_bids: bids.length, accepted_bids: acceptedBids.length,
      avg_bid: avg(bidAmounts),
      verified_providers: verifiedProviders,
      featured_providers: featuredProviders,
      total_rentals: rentals.length,
      available_rentals: availableRentals,
      signed_agreements: signedAgreements.length,
    };

    return new Response(
      JSON.stringify({ totals, subscriptionBreakdown, growth, generated_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
