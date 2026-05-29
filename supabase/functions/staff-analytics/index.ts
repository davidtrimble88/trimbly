// Server-side analytics aggregation. Uses service-role to scan all rows
// regardless of RLS, paginates past the 1000-row PostgREST cap so it scales
// to millions, and returns pre-aggregated buckets the UI can render instantly.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Region taxonomy. State/province codes are uppercased before lookup.
const US_REGIONS: Record<string, string> = {
  // Northeast
  CT: "US — Northeast", ME: "US — Northeast", MA: "US — Northeast", NH: "US — Northeast",
  RI: "US — Northeast", VT: "US — Northeast", NJ: "US — Northeast", NY: "US — Northeast", PA: "US — Northeast",
  // Midwest
  IL: "US — Midwest", IN: "US — Midwest", MI: "US — Midwest", OH: "US — Midwest", WI: "US — Midwest",
  IA: "US — Midwest", KS: "US — Midwest", MN: "US — Midwest", MO: "US — Midwest",
  NE: "US — Midwest", ND: "US — Midwest", SD: "US — Midwest",
  // South
  DE: "US — South", FL: "US — South", GA: "US — South", MD: "US — South", NC: "US — South",
  SC: "US — South", VA: "US — South", DC: "US — South", WV: "US — South", AL: "US — South",
  KY: "US — South", MS: "US — South", TN: "US — South", AR: "US — South", LA: "US — South",
  OK: "US — South", TX: "US — South",
  // West
  AZ: "US — West", CO: "US — West", ID: "US — West", MT: "US — West", NV: "US — West",
  NM: "US — West", UT: "US — West", WY: "US — West", AK: "US — West", CA: "US — West",
  HI: "US — West", OR: "US — West", WA: "US — West",
};

const CA_REGIONS: Record<string, string> = {
  NL: "CA — Atlantic", PE: "CA — Atlantic", NS: "CA — Atlantic", NB: "CA — Atlantic",
  QC: "CA — Central", ON: "CA — Central",
  MB: "CA — Prairies", SK: "CA — Prairies", AB: "CA — Prairies",
  BC: "CA — West",
  YT: "CA — North", NT: "CA — North", NU: "CA — North",
};

function regionFor(country: string | null | undefined, state: string | null | undefined): string {
  const c = (country || "").toUpperCase();
  const s = (state || "").toUpperCase().trim();
  if (c === "CA" || c === "CAN" || c === "CANADA") return CA_REGIONS[s] || "CA — Other";
  if (c === "" || c === "US" || c === "USA" || c === "UNITED STATES") return US_REGIONS[s] || "US — Other";
  return `${c || "International"}`;
}

function stateKey(country: string | null | undefined, state: string | null | undefined): string {
  const c = (country || "US").toUpperCase();
  const s = (state || "").toUpperCase().trim() || "Unknown";
  return `${c}-${s}`;
}

async function fetchAll(client: any, table: string, columns: string): Promise<any[]> {
  const pageSize = 1000;
  const rows: any[] = [];
  let from = 0;
  // Safety cap so a runaway scan can't blow memory; bump as the project scales.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userJwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!userJwt) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Verify caller is staff/admin before exposing aggregated data
    const authClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${userJwt}` } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: roles } = await authClient.from("user_roles").select("role").eq("user_id", user.id);
    const allowed = (roles || []).some((r: any) => r.role === "admin" || r.role === "analyst");
    if (!allowed) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const [homes, providers, jobs, bids, rentals] = await Promise.all([
      fetchAll(admin, "homes", "user_id, city, state, country"),
      fetchAll(admin, "providers", "id, city, state, country, category"),
      fetchAll(admin, "jobs", "id, city, state, country, category, budget_min, budget_max"),
      fetchAll(admin, "job_bids", "id, job_id, bid_amount"),
      fetchAll(admin, "equipment_rentals", "id, city, state, country, category, price_day, deposit_amount, available"),
    ]);

    // Build job lookup so bids can inherit job geography
    const jobIdx = new Map<string, any>();
    for (const j of jobs) jobIdx.set(j.id, j);

    type Bucket = {
      key: string;
      label: string;
      region: string;
      country: string;
      state: string;
      homeowners: Set<string>;
      providers: number;
      jobs: number;
      rentals: number;
      bidAmounts: number[];
      rentalDayPrices: number[];
    };
    const stateBuckets = new Map<string, Bucket>();
    const regionBuckets = new Map<string, Omit<Bucket, "key" | "label" | "country" | "state">>();

    const ensureState = (country: string, state: string): Bucket => {
      const k = stateKey(country, state);
      if (!stateBuckets.has(k)) {
        const region = regionFor(country, state);
        stateBuckets.set(k, {
          key: k, label: `${(state || "Unknown").toUpperCase()}, ${(country || "US").toUpperCase()}`,
          region, country: (country || "US").toUpperCase(), state: (state || "Unknown").toUpperCase(),
          homeowners: new Set(), providers: 0, jobs: 0, rentals: 0, bidAmounts: [], rentalDayPrices: [],
        });
      }
      return stateBuckets.get(k)!;
    };
    const ensureRegion = (region: string) => {
      if (!regionBuckets.has(region)) {
        regionBuckets.set(region, {
          region, homeowners: new Set(), providers: 0, jobs: 0, rentals: 0, bidAmounts: [], rentalDayPrices: [],
        });
      }
      return regionBuckets.get(region)!;
    };

    for (const h of homes) {
      const b = ensureState(h.country, h.state);
      b.homeowners.add(h.user_id);
      ensureRegion(b.region).homeowners.add(h.user_id);
    }
    for (const p of providers) {
      const b = ensureState(p.country, p.state);
      b.providers += 1;
      ensureRegion(b.region).providers += 1;
    }
    for (const j of jobs) {
      const b = ensureState(j.country, j.state);
      b.jobs += 1;
      ensureRegion(b.region).jobs += 1;
    }
    for (const r of rentals) {
      const b = ensureState(r.country, r.state);
      b.rentals += 1;
      const day = Number(r.price_day);
      if (day > 0) b.rentalDayPrices.push(day);
      const reg = ensureRegion(b.region);
      reg.rentals += 1;
      if (day > 0) reg.rentalDayPrices.push(day);
    }
    for (const bid of bids) {
      const job = jobIdx.get(bid.job_id);
      if (!job) continue;
      const amt = Number(bid.bid_amount);
      if (!(amt > 0)) continue;
      const b = ensureState(job.country, job.state);
      b.bidAmounts.push(amt);
      ensureRegion(b.region).bidAmounts.push(amt);
    }

    const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

    const byState = Array.from(stateBuckets.values()).map((b) => ({
      key: b.key, label: b.label, region: b.region, country: b.country, state: b.state,
      homeowners: b.homeowners.size, providers: b.providers, jobs: b.jobs, rentals: b.rentals,
      total_users: b.homeowners.size + b.providers,
      bid_count: b.bidAmounts.length,
      avg_bid: avg(b.bidAmounts),
      min_bid: b.bidAmounts.length ? Math.min(...b.bidAmounts) : 0,
      max_bid: b.bidAmounts.length ? Math.max(...b.bidAmounts) : 0,
      rental_count: b.rentals,
      avg_rental_day: avg(b.rentalDayPrices),
    }));

    const byRegion = Array.from(regionBuckets.values()).map((b) => ({
      region: b.region,
      homeowners: b.homeowners.size, providers: b.providers, jobs: b.jobs, rentals: b.rentals,
      total_users: b.homeowners.size + b.providers,
      bid_count: b.bidAmounts.length,
      avg_bid: avg(b.bidAmounts),
      avg_rental_day: avg(b.rentalDayPrices),
    }));

    // Category aggregates (platform-wide)
    const bidsByCategory = new Map<string, number[]>();
    for (const bid of bids) {
      const job = jobIdx.get(bid.job_id);
      if (!job) continue;
      const amt = Number(bid.bid_amount);
      if (!(amt > 0)) continue;
      const cat = job.category || "Unknown";
      if (!bidsByCategory.has(cat)) bidsByCategory.set(cat, []);
      bidsByCategory.get(cat)!.push(amt);
    }
    const byCategory = Array.from(bidsByCategory.entries()).map(([category, amounts]) => ({
      category, bids: amounts.length, avg_bid: avg(amounts),
      min_bid: Math.min(...amounts), max_bid: Math.max(...amounts),
    })).sort((a, b) => b.bids - a.bids);

    const totals = {
      homeowners: new Set(homes.map((h: any) => h.user_id)).size,
      providers: providers.length,
      jobs: jobs.length,
      bids: bids.length,
      rentals: rentals.length,
      states_active: byState.length,
      regions_active: byRegion.length,
      avg_bid_overall: avg(bids.map((b: any) => Number(b.bid_amount)).filter((n: number) => n > 0)),
    };

    return new Response(
      JSON.stringify({ totals, byRegion, byState, byCategory, generated_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
