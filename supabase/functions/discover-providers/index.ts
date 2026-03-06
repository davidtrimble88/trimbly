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

    const webQuery = `${categoryHint} ${queryHint} contractor near ${locationHint || countryHint} phone number reviews ratings`.trim();

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
        const markdown = r.markdown ? r.markdown.substring(0, 2500) : r.description || "";
        return `--- Result ${i + 1} ---\nTitle: ${title}\nURL: ${url}\nDescription: ${r.description || ""}\n${markdown}`;
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
            content: `You extract real service provider information from web search results. Only include providers where you can confirm the business name from the search results.

For each confirmed real business found in the search results:
- Extract all available information directly from the scraped content
- If a phone number or website URL appears anywhere in the search results for that business, include it
- If the business is a well-known real company and you know their publicly listed phone number or website from your training data, you may include it
- IMPORTANT: Extract ratings and review counts from Google, HomeAdvisor, Angi, Yelp, or BBB if present in the search results. Look for patterns like "4.8 stars", "4.8/5", "X reviews", "rated 4.8"
- Do NOT invent fictional businesses. Only list businesses that appear in the search results.

Return a JSON array. Each provider object must have exactly these fields:
- business_name (string, must be from the search results)
- category (one of: Plumbing, Electrical, Handyman, HVAC, Landscaping, Painting, Roofing, Cleaning)
- description (string, from search results or your knowledge of the business)
- city (string)
- state (string, 2-letter code)
- country ("US" or "CA")
- phone (string formatted as "(XXX) XXX-XXXX", from search results or publicly known number, or null if unknown)
- website (string URL — MUST be the company's own website domain, NOT a review/directory site like yelp.com, homeadvisor.com, angieslist.com, bbb.org, google.com, thumbtack.com, houzz.com, yellowpages.com, nextdoor.com, facebook.com. Set to null if only review site URLs are found)
- licensed (boolean, true if mentioned or typically required for the trade in that state)
- insured (boolean, true if mentioned)
- years_experience (number, if mentioned, otherwise 0)
- avg_rating (number, e.g. 4.8, from Google/Yelp/HomeAdvisor/Angi/BBB if found, or 0 if unknown)
- review_count (number, total reviews from the source, or 0 if unknown)
- rating_source (string, e.g. "Google", "HomeAdvisor", "Yelp", "Angi", "BBB", or null if no rating found)

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
      avg_rating: p.avg_rating || 0,
      review_count: p.review_count || 0,
      rating_source: p.rating_source || null,
    }));

    // Verify websites and scrape for missing phone numbers in parallel
    const enrichPromises = normalizedProviders.map(async (p: any) => {
      if (!p.website) return p;
      try {
        // Scrape the website to verify it works AND find phone numbers
        const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${firecrawlApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: p.website,
            formats: ["markdown"],
            onlyMainContent: false,
            waitFor: 3000,
          }),
        });

        if (!scrapeRes.ok) {
          return { ...p, website: null, website_verified: false };
        }

        const scrapeData = await scrapeRes.json();
        const pageContent = scrapeData?.data?.markdown || scrapeData?.markdown || "";
        
        // Website is live
        let enriched = { ...p, website_verified: true };

        // Extract phone number from page if we don't have one
        if (!p.phone && pageContent) {
          const phoneMatch = pageContent.match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
          if (phoneMatch) {
            const digits = phoneMatch[0].replace(/\D/g, "");
            enriched.phone = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
          }
        }

        return enriched;
      } catch {
        return { ...p, website: null, website_verified: false };
      }
    });

    normalizedProviders = await Promise.all(enrichPromises);

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
