const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address } = await req.json();

    if (!address) {
      return new Response(
        JSON.stringify({ success: false, error: 'Address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Searching Zillow for address:', address);

    // Step 1: Search Zillow for the address
    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `site:zillow.com ${address}`,
        limit: 3,
      }),
    });

    const searchData = await searchResponse.json();

    if (!searchResponse.ok || !searchData.success) {
      console.error('Firecrawl search error:', searchData);
      return new Response(
        JSON.stringify({ success: false, error: 'Search failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the best Zillow property URL (homedetails page)
    const results = searchData.data || [];
    const propertyResult = results.find((r: any) =>
      r.url?.includes('zillow.com/homedetails')
    ) || results[0];

    if (!propertyResult?.url) {
      return new Response(
        JSON.stringify({ success: false, error: 'No Zillow listing found for this address' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found Zillow URL:', propertyResult.url);

    // Step 2: Scrape the Zillow property page for structured data
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: propertyResult.url,
        formats: [
          {
            type: 'json',
            prompt: 'Extract property details from this Zillow listing page.',
            schema: {
              type: 'object',
              properties: {
                home_type: {
                  type: 'string',
                  description: 'Type of home: single_family, townhouse, condo, duplex, or mobile'
                },
                year_built: {
                  type: 'number',
                  description: 'Year the home was built'
                },
                square_feet: {
                  type: 'number',
                  description: 'Total square footage of the home'
                },
                city: {
                  type: 'string',
                  description: 'City where the home is located'
                },
                state: {
                  type: 'string',
                  description: 'Two-letter state abbreviation'
                },
                hvac_type: {
                  type: 'string',
                  description: 'Heating/cooling system type: central, heat_pump, furnace, mini_split, window, or none'
                },
                roof_type: {
                  type: 'string',
                  description: 'Roof material: asphalt, metal, tile, slate, or flat'
                },
                has_pool: {
                  type: 'boolean',
                  description: 'Whether the property has a pool'
                },
                bedrooms: {
                  type: 'number',
                  description: 'Number of bedrooms'
                },
                bathrooms: {
                  type: 'number',
                  description: 'Number of bathrooms'
                },
                lot_size: {
                  type: 'string',
                  description: 'Lot size'
                },
                address: {
                  type: 'string',
                  description: 'Full street address'
                }
              }
            }
          }
        ],
        onlyMainContent: true,
      }),
    });

    const scrapeData = await scrapeResponse.json();

    if (!scrapeResponse.ok) {
      console.error('Firecrawl scrape error:', scrapeData);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to scrape property details' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract structured data
    const propertyData = scrapeData.data?.json || scrapeData.json || {};

    console.log('Extracted property data:', JSON.stringify(propertyData));

    // Normalize home_type to match our options
    const normalizeHomeType = (type: string | undefined): string => {
      if (!type) return '';
      const lower = type.toLowerCase();
      if (lower.includes('single') || lower.includes('house') || lower.includes('detached')) return 'single_family';
      if (lower.includes('town')) return 'townhouse';
      if (lower.includes('condo') || lower.includes('apartment')) return 'condo';
      if (lower.includes('duplex') || lower.includes('multi')) return 'duplex';
      if (lower.includes('mobile') || lower.includes('manufactured')) return 'mobile';
      return '';
    };

    // Normalize HVAC type
    const normalizeHvac = (type: string | undefined): string => {
      if (!type) return '';
      const lower = type.toLowerCase();
      if (lower.includes('central')) return 'central';
      if (lower.includes('heat pump')) return 'heat_pump';
      if (lower.includes('furnace') || lower.includes('forced')) return 'furnace';
      if (lower.includes('mini') || lower.includes('split')) return 'mini_split';
      if (lower.includes('window')) return 'window';
      return '';
    };

    // Normalize roof type
    const normalizeRoof = (type: string | undefined): string => {
      if (!type) return '';
      const lower = type.toLowerCase();
      if (lower.includes('asphalt') || lower.includes('shingle') || lower.includes('composition')) return 'asphalt';
      if (lower.includes('metal') || lower.includes('steel')) return 'metal';
      if (lower.includes('tile') || lower.includes('clay') || lower.includes('concrete')) return 'tile';
      if (lower.includes('slate')) return 'slate';
      if (lower.includes('flat') || lower.includes('tpo') || lower.includes('rubber')) return 'flat';
      return '';
    };

    // Normalize year_built to closest decade option
    const normalizeYear = (year: number | undefined): number | null => {
      if (!year) return null;
      return year;
    };

    const result = {
      success: true,
      data: {
        home_type: normalizeHomeType(propertyData.home_type),
        year_built: normalizeYear(propertyData.year_built),
        square_feet: propertyData.square_feet || null,
        city: propertyData.city || '',
        state: (propertyData.state || '').toUpperCase().substring(0, 2),
        hvac_type: normalizeHvac(propertyData.hvac_type),
        roof_type: normalizeRoof(propertyData.roof_type),
        has_pool: propertyData.has_pool || false,
        bedrooms: propertyData.bedrooms || null,
        bathrooms: propertyData.bathrooms || null,
        address: propertyData.address || '',
        zillow_url: propertyResult.url,
      },
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in zillow-lookup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
