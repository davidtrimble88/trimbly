import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { jobTitle, jobCategory, jobDescription, businessName, providerCategory } = await req.json();

    if (!jobTitle) {
      return new Response(JSON.stringify({ error: "jobTitle is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt =
      `A homeowner just hired me for this job:\n` +
      `Title: ${jobTitle}\n` +
      `Category: ${jobCategory || "n/a"}\n` +
      `Description: ${jobDescription || "n/a"}\n\n` +
      `My business: ${businessName || "n/a"} (${providerCategory || "general handyman"}).\n\n` +
      `Suggest 3 natural follow-on services I could pitch to this homeowner — services that ` +
      `logically pair with what I just completed (e.g. HVAC tune-up after duct work, gutter cleaning after roof work). ` +
      `For each, draft a short, friendly message I can send them in-app.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a sales coach for independent home service pros. Suggest realistic, " +
              "non-pushy follow-on services and draft short, friendly pitch messages (2-4 sentences). " +
              "Never invent prices unless asked. Keep tone helpful, not salesy.",
          },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "upsell_suggestions",
              description: "Return 3 follow-on service ideas with draft messages",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        service: { type: "string", description: "Short name of the follow-on service" },
                        why: { type: "string", description: "One-line reason it pairs with the completed job" },
                        urgency: { type: "string", enum: ["high", "medium", "low"], description: "How time-sensitive this follow-on is" },
                        message: { type: "string", description: "Friendly 2-4 sentence pitch the pro can send" },
                      },
                      required: ["service", "why", "urgency", "message"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["suggestions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "upsell_suggestions" } },
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Failed to generate suggestions" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "Failed to parse suggestions" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Upsell error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
