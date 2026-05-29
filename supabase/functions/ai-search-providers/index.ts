import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rateLimit, rateLimitResponse, getClientKey } from "../_shared/rateLimit.ts";
import { readJson, requireString, validationErrorResponse } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rl = rateLimit(`ai-search-providers:${getClientKey(req)}`, { limit: 15, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl, corsHeaders);

  let query: string;
  try {
    const body = await readJson(req, 8 * 1024);
    query = requireString(body.query, "query", { min: 2, max: 500 });
  } catch (e) {
    return validationErrorResponse(e, corsHeaders);
  }

  try {


    // Fetch providers from DB
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: providers } = await supabase
      .from("providers")
      .select("*")
      .limit(50);

    const { data: stats } = await supabase
      .from("provider_stats")
      .select("*");

    const statsMap = new Map(
      (stats || []).map((s: any) => [s.provider_id, s])
    );

    const providerList = (providers || []).map((p: any) => {
      const s = statsMap.get(p.id) || { avg_rating: 0, review_count: 0 };
      return `- ${p.business_name} (${p.category}) in ${p.city}, ${p.state} ${p.country} | Rating: ${s.avg_rating}/5 (${s.review_count} reviews) | $${p.hourly_rate_min}-${p.hourly_rate_max}/hr | ${p.licensed ? "Licensed" : "Not licensed"} | ${p.available ? "Available" : "Booked"}`;
    }).join("\n");

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a helpful home services assistant. Based on the user's query, recommend the best matching service providers from the list below. Be concise and helpful. If no providers match, suggest what they should search for instead.\n\nAvailable providers:\n${providerList || "No providers registered yet."}`,
          },
          { role: "user", content: query },
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    const aiData = await aiResponse.json();
    const recommendation = aiData.choices?.[0]?.message?.content || "No recommendations available at this time.";

    return new Response(JSON.stringify({ recommendation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "AI search failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
