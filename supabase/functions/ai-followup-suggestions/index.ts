const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { homeownerName, businessName, lastMessage, daysSince } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const prompt = `You are ${businessName}, a service pro. A homeowner named ${homeownerName} messaged you ${daysSince} days ago and never replied. Their last message was: "${lastMessage}". Write a SHORT, friendly, no-pressure follow-up (2-3 sentences max). Ask one specific clarifying question to re-engage them. Sign off with just your business name. Do not be salesy.`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      return new Response(JSON.stringify({ error: await res.text() }), { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const data = await res.json();
    const draft = data.choices?.[0]?.message?.content?.trim() || '';
    return new Response(JSON.stringify({ draft }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
