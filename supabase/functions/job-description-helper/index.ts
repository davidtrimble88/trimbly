import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, category, description, city, state } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ctx = [
      title ? `Title: ${title}` : "",
      category ? `Category: ${category}` : "",
      city && state ? `Location: ${city}, ${state}` : "",
      description ? `Current description: ${description}` : "(no description yet)",
    ].filter(Boolean).join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You help homeowners write clear job posts so contractors can give accurate bids. Analyze what's in the post and call the "job_post_help" function with:
- missing_info: 3-6 specific questions the homeowner should answer (measurements, materials, age of system, access, urgency, etc.) tailored to the category.
- tips: 2-4 short tips for getting accurate bids.
- improved_description: a rewritten, well-structured description using ONLY facts already provided — do not invent details. If info is missing, leave placeholders in [brackets] for the homeowner to fill in.
Keep it concise and practical.`,
          },
          { role: "user", content: ctx },
        ],
        tools: [{
          type: "function",
          function: {
            name: "job_post_help",
            description: "Return structured help for writing a job post",
            parameters: {
              type: "object",
              properties: {
                missing_info: { type: "array", items: { type: "string" } },
                tips: { type: "array", items: { type: "string" } },
                improved_description: { type: "string" },
              },
              required: ["missing_info", "tips", "improved_description"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "job_post_help" } },
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI usage limit reached." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI request failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "No suggestions returned" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
