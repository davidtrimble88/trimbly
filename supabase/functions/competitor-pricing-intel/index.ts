const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function extractJson(response: string): any {
  let cleaned = response.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const start = cleaned.search(/[\{\[]/);
  const isArr = start !== -1 && cleaned[start] === '[';
  const end = cleaned.lastIndexOf(isArr ? ']' : '}');
  if (start === -1 || end === -1) throw new Error('No JSON in response');
  cleaned = cleaned.substring(start, end + 1);
  try {
    return JSON.parse(cleaned);
  } catch {
    cleaned = cleaned.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']').replace(/[\x00-\x1F\x7F]/g, '');
    return JSON.parse(cleaned);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { category, city, state, hourlyMin, hourlyMax } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const prompt = `You are a market analyst. Estimate realistic hourly rates for ${category} pros in ${city}, ${state}, USA in 2026. The user currently charges $${hourlyMin}–$${hourlyMax}/hr.

Return ONLY a raw JSON object (no markdown) with these exact keys:
- marketLow (number, raw integer, no commas)
- marketHigh (number)
- marketMedian (number)
- sampleSize (number)
- yourPosition ("below" | "average" | "above")
- insight (1-2 sentence actionable tip)
- competitors (array of 4-5 objects: {name, range, note})

Base estimates on BLS data, regional cost of living, and trade rates. Be realistic.`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('AI gateway error:', res.status, errText);
      return new Response(JSON.stringify({ error: errText }), { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    const intel = extractJson(content);
    return new Response(JSON.stringify(intel), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('competitor-pricing-intel error:', e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
