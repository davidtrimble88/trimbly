// Tax estimate aggregation for Trimbly (registered in Hollywood, CA / City of Los Angeles).
// Computes annualized revenue from current subscriptions + YTD subscription revenue
// estimated from each paying user's tenure, then returns the raw inputs needed
// for federal/state/local tax estimates. The UI does the per-entity-type math
// so the user can flip C-Corp / S-Corp / LLC / Sole-Prop without re-fetching.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HOMEOWNER_PRICE: Record<string, number> = { free: 0, homeowner_pro: 5, multi_pro: 20 };
const PROVIDER_PRICE: Record<string, number> = { free: 0, pro: 29 };

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

function monthsBetween(from: Date, to: Date): number {
  if (to <= from) return 0;
  const years = to.getUTCFullYear() - from.getUTCFullYear();
  const months = to.getUTCMonth() - from.getUTCMonth();
  return Math.max(0, years * 12 + months) + (to.getUTCDate() >= from.getUTCDate() ? 1 : 0);
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
    const allowed = (roles || []).some((r: any) => r.role === "admin");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const [profiles, providers, agreements] = await Promise.all([
      fetchAll(admin, "profiles", "id, user_type, subscription_tier, created_at"),
      fetchAll(admin, "providers", "id, user_id, subscription_tier, created_at"),
      fetchAll(admin, "rental_agreements", "id, total, status, created_at, owner_signature, renter_signature"),
    ]);

    const now = new Date();
    const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

    // --- Current MRR from active subscriptions ---
    let homeownerMRR = 0;
    let providerMRR = 0;
    let paidHomeowners = 0;
    let paidProviders = 0;
    let ytdSubRevenue = 0; // approximate YTD from tier * months active inside current year

    for (const p of profiles) {
      if ((p.user_type || "homeowner") !== "homeowner") continue;
      const tier = p.subscription_tier || "free";
      const price = HOMEOWNER_PRICE[tier] ?? 0;
      if (price > 0) {
        paidHomeowners += 1;
        homeownerMRR += price;
        const start = p.created_at ? new Date(p.created_at) : null;
        if (start) {
          const effStart = start > yearStart ? start : yearStart;
          ytdSubRevenue += price * monthsBetween(effStart, now);
        }
      }
    }
    for (const pr of providers) {
      const tier = pr.subscription_tier || "free";
      const price = PROVIDER_PRICE[tier] ?? 0;
      if (price > 0) {
        paidProviders += 1;
        providerMRR += price;
        const start = pr.created_at ? new Date(pr.created_at) : null;
        if (start) {
          const effStart = start > yearStart ? start : yearStart;
          ytdSubRevenue += price * monthsBetween(effStart, now);
        }
      }
    }

    const mrr = homeownerMRR + providerMRR;
    const arr = mrr * 12;

    // --- Marketplace revenue we facilitate (informational; not Trimbly revenue) ---
    const signedAgreements = agreements.filter((a: any) => a.owner_signature && a.renter_signature);
    const gmv_rentals_signed = signedAgreements.reduce((acc: number, a: any) => acc + (Number(a.total) || 0), 0);
    const gmv_rentals_ytd = signedAgreements
      .filter((a: any) => a.created_at && new Date(a.created_at) >= yearStart)
      .reduce((acc: number, a: any) => acc + (Number(a.total) || 0), 0);

    // --- Project full-year revenue: YTD + (MRR * remaining months) ---
    const monthsElapsed = Math.max(1, now.getUTCMonth() + 1);
    const monthsRemaining = 12 - monthsElapsed;
    const projectedYearRevenue = ytdSubRevenue + mrr * monthsRemaining;

    return new Response(JSON.stringify({
      revenue: {
        mrr,
        arr,
        homeowner_mrr: homeownerMRR,
        provider_mrr: providerMRR,
        ytd_sub_revenue: Math.round(ytdSubRevenue * 100) / 100,
        projected_year_revenue: Math.round(projectedYearRevenue * 100) / 100,
        gmv_rentals_ytd: Math.round(gmv_rentals_ytd * 100) / 100,
        gmv_rentals_lifetime: Math.round(gmv_rentals_signed * 100) / 100,
        months_elapsed: monthsElapsed,
        months_remaining: monthsRemaining,
      },
      users: {
        paid_homeowners: paidHomeowners,
        paid_providers: paidProviders,
        paid_total: paidHomeowners + paidProviders,
        total_homeowners: profiles.filter((p: any) => (p.user_type || "homeowner") === "homeowner").length,
        total_providers: providers.length,
      },
      jurisdiction: {
        federal: "United States — IRS",
        state: "California — Franchise Tax Board (FTB)",
        city: "Los Angeles (Hollywood) — Office of Finance",
        registered_address: "Hollywood, CA",
      },
      tax_year: now.getUTCFullYear(),
      generated_at: now.toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
