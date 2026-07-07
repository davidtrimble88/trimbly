// Returns anonymized pricing stats (count, min, max, average, rough median)
// for a job category in a given state, drawn from real bids and quotes on
// the platform. Uses the service role to read across all bids/quotes
// (individual bid RLS is scoped to the job owner + bidder only) but only
// ever returns aggregated numbers — never a specific bid, provider, or job.
import { createClient } from "npm:@supabase/supabase-js@2";
import { getClientKey, rateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIN_SAMPLE_SIZE = 3; // don't reveal pricing signal from a tiny, potentially identifying sample

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.floor((sorted.length - 1) * p);
  return sorted[idx];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const rl = rateLimit(`pricing-insights:${getClientKey(req)}`, { limit: 30, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl, corsHeaders);

    const body = await req.json().catch(() => ({}));
    const category = (body.category || "").toString().trim();
    const state = (body.state || "").toString().trim();
    if (!category || !state) {
      return new Response(JSON.stringify({ error: "category and state are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Bids are the closest signal to "what pros actually quote for this kind
    // of job locally" — join through jobs to filter by category/state.
    const { data: jobs } = await admin
      .from("jobs")
      .select("id")
      .eq("category", category)
      .eq("state", state)
      .limit(500);
    const jobIds = (jobs || []).map((j) => j.id);

    let amounts: number[] = [];
    if (jobIds.length > 0) {
      const { data: bids } = await admin
        .from("job_bids")
        .select("bid_amount")
        .in("job_id", jobIds)
        .not("bid_amount", "is", null)
        .limit(1000);
      amounts = (bids || []).map((b) => Number(b.bid_amount)).filter((n) => n > 0);
    }

    if (amounts.length < MIN_SAMPLE_SIZE) {
      return new Response(JSON.stringify({ available: false, sampleSize: amounts.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sorted = [...amounts].sort((a, b) => a - b);
    const avg = amounts.reduce((s, n) => s + n, 0) / amounts.length;

    return new Response(JSON.stringify({
      available: true,
      sampleSize: amounts.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      average: Math.round(avg),
      typicalLow: Math.round(percentile(sorted, 0.25)),
      typicalHigh: Math.round(percentile(sorted, 0.75)),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("pricing-insights error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message || "Failed to load pricing data" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
