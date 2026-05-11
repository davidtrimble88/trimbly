import { corsHeaders } from '@supabase/supabase-js/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { category, city, state, hourlyMin, hourlyMax } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const prompt = `You are a market analyst. Estimate realistic hourly rates for ${category} pros in ${city}, ${state}, USA in 2026. The user currently charges $${hourlyMin}–$${hourlyMax}/hr.

Return a JSON object with: marketLow (number), marketHigh (number), marketMedian (number), sampleSize (number, your confidence sample), yourPosition ("below" | "average" | "above"), insight (1-2 sentence actionable tip), competitors (array of 4-5 fictional but realistic local competitor names with realistic price ranges, format: [{name, range, note}]).

Base estimates on typical BLS data, regional cost of living, and trade union rates. Be realistic — not generic.`;

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
      return new Response(JSON.stringify({ error: await res.text() }), { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    const intel = JSON.parse(content);
    return new Response(JSON.stringify(intel), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
