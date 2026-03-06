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

    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlApiKey) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a search query for real businesses
    const locationHint = city && state ? `${city}, ${state}` : state || city || "";
    const countryHint = country === "CA" ? "Canada" : "United States";
    const categoryHint = category && category !== "All" ? category : "home services";
    const queryHint = searchQuery || "";

    const webQuery = `${categoryHint} ${queryHint} contractor near ${locationHint || countryHint} phone number reviews`.trim();

    console.log("Firecrawl search query:", webQuery);

    // Step 1: Search the web with Firecrawl
    const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${firecrawlApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: webQuery,
        limit: 20,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    if (!searchResponse.ok) {
      const errText = await searchResponse.text();
      console.error("Firecrawl search error:", searchResponse.status, errText);
      if (searchResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (searchResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Search usage limit reached." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Web search failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchData = await searchResponse.json();
    const results = searchData?.data || [];

    if (results.length === 0) {
      return new Response(JSON.stringify({ providers: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Compile scraped content for AI extraction
    const scrapedContent = results
      .slice(0, 15)
      .map((r: any, i: number) => {
        const title = r.title || "Unknown";
        const url = r.url || "";
        const markdown = r.markdown ? r.markdown.substring(0, 1500) : r.description || "";
        return `--- Result ${i + 1} ---\nTitle: ${title}\nURL: ${url}\n${markdown}`;
      })
      .join("\n\n");

    // Step 3: Use AI to extract structured provider data from real search results
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
            content: `You extract real service provider information from web search results. Only include providers where you can confirm the business name from the search results. Do NOT invent or fabricate any information. If a field is not found in the data, use null or appropriate defaults.

Return a JSON array. Each provider object must have exactly these fields:
- business_name (string, from the search results)
- category (one of: Plumbing, Electrical, Handyman, HVAC, Landscaping, Painting, Roofing, Cleaning)
- description (string, extracted from search results, or empty string)
- city (string, from search results or empty)
- state (string, 2-letter code or empty)
- country ("US" or "CA")
- phone (string, only if found in search results, otherwise null)
- website (string URL, only if found in search results, otherwise null)
- licensed (boolean, true only if explicitly mentioned)
- insured (boolean, true only if explicitly mentioned)
- years_experience (number, only if mentioned, otherwise 0)

Return ONLY the JSON array, no markdown fences, no explanation. If no real providers can be extracted, return an empty array [].`,
          },
          {
            role: "user",
            content: `Extract real ${categoryHint} service providers from these web search results. Location context: ${locationHint || countryHint}.\n\n${scrapedContent}`,
          },
        ],
        max_tokens: 8000,
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI extraction error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Failed to extract provider data" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content;
    
    let providers = [];
    
    // Handle case where content is already parsed as an object/array
    if (Array.isArray(rawContent)) {
      providers = rawContent;
    } else if (typeof rawContent === "object" && rawContent !== null) {
      providers = [rawContent];
    } else {
      let content = String(rawContent || "[]");
      content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      
      // Clean control characters
      content = content.replace(/[\x00-\x1F\x7F]/g, (c) => c === '\n' || c === '\r' || c === '\t' ? c : '');
      
      try {
        providers = JSON.parse(content);
      } catch (e1) {
        console.error("Initial parse failed:", (e1 as Error).message);
        // Extract JSON array
        const jsonStart = content.indexOf("[");
        const jsonEnd = content.lastIndexOf("]");
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          let extracted = content.substring(jsonStart, jsonEnd + 1);
          try {
            providers = JSON.parse(extracted);
          } catch {
            // Fix trailing commas and try again
            extracted = extracted.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
            try {
              providers = JSON.parse(extracted);
            } catch {
              // Last resort: find last complete object
              const lastBrace = extracted.lastIndexOf("}");
              if (lastBrace > 0) {
                try {
                  providers = JSON.parse(extracted.substring(0, lastBrace + 1) + "]");
                } catch {
                  console.error("All parse attempts failed");
                }
              }
            }
          }
        }
      }
    }
    
    console.log(`Parsed ${Array.isArray(providers) ? providers.length : 0} providers from AI response`);

    // Normalize and add IDs
    let normalizedProviders = (Array.isArray(providers) ? providers : []).map((p: any, i: number) => ({
      id: `web-${Date.now()}-${i}`,
      source: "web",
      business_name: p.business_name || "Unknown Provider",
      category: p.category || categoryHint || "Handyman",
      description: p.description || "",
      hourly_rate_min: 0,
      hourly_rate_max: 0,
      currency: p.country === "CA" ? "CAD" : "USD",
      licensed: p.licensed ?? false,
      insured: p.insured ?? false,
      available: true,
      city: p.city || "",
      state: p.state || "",
      country: p.country || (country === "CA" ? "CA" : "US"),
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

    // Filter out entries with no real business name
    normalizedProviders = normalizedProviders.filter(
      (p: any) => p.business_name && p.business_name !== "Unknown Provider"
    );

    return new Response(JSON.stringify({ providers: normalizedProviders.slice(0, 20) }), {
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
