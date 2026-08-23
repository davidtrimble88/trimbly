import { extractHeroPhoto } from '../_shared/zillowPhoto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const normalizeHomeType = (type: string | undefined): string => {
  if (!type) return '';
  const lower = String(type).toLowerCase();
  if (lower.includes('town')) return 'townhouse';
  if (lower.includes('condo') || lower.includes('apartment') || lower.includes('co-op')) return 'condo';
  if (lower.includes('duplex') || lower.includes('multi') || lower.includes('triplex')) return 'multi_family';
  if (lower.includes('mobile') || lower.includes('manufactured')) return 'mobile';
  if (lower.includes('single') || lower.includes('house') || lower.includes('detached') || lower.includes('residential')) return 'single_family';
  return '';
};

const normalizeHvac = (type: string | undefined): string => {
  if (!type) return '';
  const lower = String(type).toLowerCase();
  if (lower.includes('heat pump')) return 'heat_pump';
  if (lower.includes('central')) return 'central';
  if (lower.includes('furnace') || lower.includes('forced')) return 'furnace';
  if (lower.includes('mini') || lower.includes('split')) return 'mini_split';
  if (lower.includes('window')) return 'window';
  return '';
};

const normalizeRoof = (type: string | undefined): string => {
  if (!type) return '';
  const lower = String(type).toLowerCase();
  if (lower.includes('asphalt') || lower.includes('shingle') || lower.includes('composition')) return 'asphalt';
  if (lower.includes('metal') || lower.includes('steel')) return 'metal';
  if (lower.includes('tile') || lower.includes('clay') || lower.includes('concrete')) return 'tile';
  if (lower.includes('slate')) return 'slate';
  if (lower.includes('flat') || lower.includes('tpo') || lower.includes('rubber')) return 'flat';
  return '';
};

const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : parseInt(String(v).replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Zillow homedetails URLs embed the address: /homedetails/123-Main-St-Austin-TX-78701/12345_zpid/ */
function parseZillowUrl(url: string): { city: string; state: string } {
  try {
    const slug = decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean)[1] || '');
    const parts = slug.split('-');
    const stateIdx = parts.findIndex((p, i) => /^[A-Z]{2}$/.test(p) && /^\d{5}$/.test(parts[i + 1] || ''));
    if (stateIdx > 0) {
      const state = parts[stateIdx];
      // city is the token(s) right before the state; take up to 3 preceding capitalized words
      const cityWords: string[] = [];
      for (let i = stateIdx - 1; i >= 0 && cityWords.length < 3; i--) {
        const w = parts[i];
        if (!/^[A-Za-z']+$/.test(w)) break;
        cityWords.unshift(w);
      }
      return { city: cityWords.join(' '), state };
    }
  } catch (_e) { /* ignore */ }
  return { city: '', state: '' };
}

/** Ask Lovable AI to pull structured fields out of the scraped page text. */
async function extractWithAI(markdown: string): Promise<Record<string, unknown>> {
  const key = Deno.env.get('LOVABLE_API_KEY');
  if (!key || !markdown) return {};
  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Extract property facts from the Zillow listing text. Only use facts stated in the text. Use null when unknown.' },
          { role: 'user', content: markdown.slice(0, 30000) },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'save_property',
            parameters: {
              type: 'object',
              properties: {
                home_type: { type: ['string', 'null'] },
                year_built: { type: ['number', 'null'] },
                square_feet: { type: ['number', 'null'] },
                city: { type: ['string', 'null'] },
                state: { type: ['string', 'null'] },
                hvac_type: { type: ['string', 'null'] },
                roof_type: { type: ['string', 'null'] },
                has_pool: { type: ['boolean', 'null'] },
                bedrooms: { type: ['number', 'null'] },
                bathrooms: { type: ['number', 'null'] },
                address: { type: ['string', 'null'] },
              },
              required: [],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'save_property' } },
      }),
    });
    const json = await res.json();
    const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    return args ? JSON.parse(args) : {};
  } catch (e) {
    console.error('AI extraction failed:', e);
    return {};
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address } = await req.json();
    if (!address) {
      return new Response(JSON.stringify({ success: false, error: 'Address is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'Firecrawl not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Searching Zillow for address:', address);

    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: `site:zillow.com ${address}`, limit: 3 }),
    });
    const searchData = await searchResponse.json();

    if (!searchResponse.ok || !searchData.success) {
      console.error('Firecrawl search error:', searchData);
      return new Response(JSON.stringify({ success: false, error: 'Search failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = searchData.data || [];
    const propertyResult = results.find((r: any) => r.url?.includes('zillow.com/homedetails')) || results[0];
    if (!propertyResult?.url) {
      return new Response(JSON.stringify({ success: false, error: 'No Zillow listing found for this address' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Found Zillow URL:', propertyResult.url);

    // Scrape the listing as markdown (for AI field extraction) and, separately,
    // as rawHtml (for the hero photo — Firecrawl's cleaned 'html' format strips
    // <script> tags, but the gallery's photo array is embedded as JSON inside
    // one (__NEXT_DATA__), so only rawHtml preserves it; see
    // _shared/zillowPhoto.ts). These two scrapes are independent requests
    // against the same URL, so run them concurrently instead of back-to-back —
    // each one already waits 3s for the page to render, and doing that twice
    // in sequence was most of why this lookup felt like it had hung.
    //
    // The photo scrape is only attempted against an actual /homedetails/
    // listing page — the field-extraction fallback below will use any Zillow
    // result (a city search page, say) when no exact listing matched, which is
    // fine for guessing at home_type/year_built but would grab a photo of the
    // wrong house entirely, so skip the photo step in that case.
    const isListingPage = propertyResult.url.includes('zillow.com/homedetails');

    const scrapeMarkdown = async (): Promise<string> => {
      try {
        const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: propertyResult.url, formats: ['markdown'], onlyMainContent: true, waitFor: 3000 }),
        });
        const data = await res.json();
        return data?.data?.markdown || data?.markdown || '';
      } catch (e) {
        console.error('Scrape failed:', e);
        return '';
      }
    };

    const scrapePhoto = async (): Promise<string | null> => {
      if (!isListingPage) return null;
      try {
        const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: propertyResult.url, formats: ['rawHtml'], onlyMainContent: false, waitFor: 3000 }),
        });
        const data = await res.json();
        return extractHeroPhoto(data);
      } catch (e) {
        console.error('Photo scrape failed:', e);
        return null;
      }
    };

    let [markdown, photoUrl] = await Promise.all([scrapeMarkdown(), scrapePhoto()]);

    // Fall back to the search snippet if the page couldn't be scraped.
    if (!markdown) markdown = [propertyResult.title, propertyResult.description].filter(Boolean).join('\n');

    const propertyData: any = await extractWithAI(markdown);
    console.log('Extracted property data:', JSON.stringify(propertyData));

    const fromUrl = parseZillowUrl(propertyResult.url);

    const result = {
      success: true,
      data: {
        home_type: normalizeHomeType(propertyData.home_type),
        year_built: toNum(propertyData.year_built),
        square_feet: toNum(propertyData.square_feet),
        city: propertyData.city || fromUrl.city || '',
        state: (propertyData.state || fromUrl.state || '').toUpperCase().substring(0, 2),
        hvac_type: normalizeHvac(propertyData.hvac_type),
        roof_type: normalizeRoof(propertyData.roof_type),
        has_pool: typeof propertyData.has_pool === 'boolean' ? propertyData.has_pool : null,
        bedrooms: toNum(propertyData.bedrooms),
        bathrooms: propertyData.bathrooms ?? null,
        address: propertyData.address || '',
        zillow_url: propertyResult.url,
        photo_url: photoUrl,
      },
    };

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error in zillow-lookup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
