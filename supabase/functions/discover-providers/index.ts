import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category, city, state, country, searchQuery } = await req.json();

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const locationHint = city && state ? `${city}, ${state}` : state || city || "";
    const countryHint = country === "CA" ? "Canada" : "United States";
    const categoryHint = category && category !== "All" ? category : "home services";
    const queryHint = searchQuery || "";

    const prompt = `Find real, legitimate ${categoryHint} service providers ${locationHint ? `in or near ${locationHint}, ${countryHint}` : `across ${countryHint}`}${queryHint ? ` matching "${queryHint}"` : ""}.

Return up to 20 real service providers that a homeowner could actually hire. Use your knowledge of real businesses, common business names, and realistic details for the area. Include a mix of:
- Well-known local companies
- Independent contractors
- Franchise locations

For each provider, include realistic details based on typical businesses in that area.`;

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
            content: "You are a home services directory assistant. Return provider data as a JSON array. Each provider object must have exactly these fields: business_name (string), category (one of: Plumbing, Electrical, Handyman, HVAC, Landscaping, Painting, Roofing, Cleaning), description (1-2 sentence description), hourly_rate_min (number), hourly_rate_max (number), licensed (boolean), insured (boolean), city (string), state (2-letter code), country (US or CA), phone (string like '(555) 123-4567'), website (string URL or null), years_experience (number). Do NOT include rating or review_count. Return ONLY the JSON array, no markdown, no explanation.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 3000,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "Failed to discover providers" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "[]";

    // Strip markdown fences if present
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let providers = [];
    try {
      providers = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      providers = [];
    }

    // Normalize and add IDs
    let normalizedProviders = (Array.isArray(providers) ? providers : []).map((p: any, i: number) => ({
      id: `web-${Date.now()}-${i}`,
      source: "web",
      business_name: p.business_name || "Unknown Provider",
      category: p.category || "Handyman",
      description: p.description || "",
      hourly_rate_min: p.hourly_rate_min || 50,
      hourly_rate_max: p.hourly_rate_max || 100,
      currency: p.country === "CA" ? "CAD" : "USD",
      licensed: p.licensed ?? false,
      insured: p.insured ?? false,
      available: true,
      city: p.city || "",
      state: p.state || "",
      country: p.country || "US",
      phone: p.phone || null,
      website: p.website || null,
      website_verified: false,
      years_experience: p.years_experience || 0,
      subscription_tier: "free",
      avg_rating: 0,
      review_count: 0,
    }));

    // Verify websites in parallel
    const verifyPromises = normalizedProviders.map(async (p: any) => {
      if (!p.website) return p;
      try {
        const res = await fetch(p.website, { method: "HEAD", redirect: "follow" });
        if (res.ok || res.status === 301 || res.status === 302) {
          return { ...p, website_verified: true };
        }
        return { ...p, website: null, website_verified: false };
      } catch {
        return { ...p, website: null, website_verified: false };
      }
    });

    normalizedProviders = await Promise.all(verifyPromises);

    return new Response(JSON.stringify({ providers: normalizedProviders }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Discover providers error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Discovery failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
