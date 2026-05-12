import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { symptom, system_type, home_context } = await req.json();

    if (!symptom || symptom.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Please describe the symptom in more detail (at least 10 characters)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sysCtx = system_type ? `Affected system: ${system_type}.` : "";
    const homeCtx = home_context ? `Home context: ${home_context}.` : "";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert home-systems diagnostician (HVAC, plumbing, electrical, appliances, roofing, structural).
A homeowner describes a symptom (a noise, smell, leak, behavior, error code). You must return a structured triage.

CRITICAL GUARDRAIL: You ONLY diagnose home and property systems. If the symptom is about a human body, pet/animal health, vehicle, electronics not part of a home, or anything unrelated to a home or property, you must refuse. Set "refusal" to true and "refusal_reason" to a brief explanation.

Rules:
- Be concrete and homeowner-friendly. Avoid jargon unless explained.
- If the symptom suggests a SAFETY hazard (gas smell, smoke, electrical burning, carbon monoxide, water near electrical, structural collapse risk) → set urgency to "emergency" and safety_warning with what to do RIGHT NOW (shut off, evacuate, call 911 / utility).
- "diy_recommended" is true ONLY if it's clearly safe and within the skill of an average homeowner. When in doubt, recommend a pro.
- Provide 2-4 likely_causes ordered by probability.
- Provide 2-5 diy_steps the homeowner can safely try first (or an empty array if unsafe).
- Provide when_to_call_pro: short bullets describing the trigger that means stop DIY and call.
- estimated_cost_low/high in USD reflect realistic pro repair ranges.`,
          },
          {
            role: "user",
            content: `Symptom: ${symptom}\n\n${sysCtx} ${homeCtx}`.trim(),
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "symptom_triage",
              description: "Return a structured home-systems symptom triage",
              parameters: {
                type: "object",
                properties: {
                  refusal: { type: "boolean", description: "Set to true if the symptom is not about a home or property system" },
                  refusal_reason: { type: "string", description: "Brief explanation of why the request was refused" },
                  diagnosis_title: { type: "string", description: "Short plain-English label, e.g. 'Likely refrigerant leak'" },
                  system: {
                    type: "string",
                    enum: ["HVAC", "Plumbing", "Electrical", "Appliance", "Roofing", "Structural", "Water Heater", "Other"],
                  },
                  urgency: {
                    type: "string",
                    enum: ["emergency", "urgent", "soon", "monitor"],
                    description: "emergency=call 911/utility now; urgent=same day pro; soon=within a week; monitor=schedule when convenient",
                  },
                  urgency_reasoning: { type: "string", description: "1-2 sentence why this urgency level" },
                  safety_warning: {
                    type: "string",
                    description: "Immediate safety actions if any (empty string if none)",
                  },
                  likely_causes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        cause: { type: "string" },
                        likelihood: { type: "string", enum: ["high", "medium", "low"] },
                      },
                      required: ["cause", "likelihood"],
                      additionalProperties: false,
                    },
                  },
                  diy_recommended: { type: "boolean" },
                  diy_steps: {
                    type: "array",
                    items: { type: "string" },
                    description: "Safe steps the homeowner can try, in order",
                  },
                  when_to_call_pro: {
                    type: "array",
                    items: { type: "string" },
                    description: "Triggers that mean stop DIY and call a pro",
                  },
                  recommended_pro_type: {
                    type: "string",
                    description: "e.g. 'HVAC technician', 'Licensed plumber', 'Master electrician'",
                  },
                  estimated_cost_low: { type: "number", description: "USD low end for typical pro repair" },
                  estimated_cost_high: { type: "number", description: "USD high end for typical pro repair" },
                  summary: { type: "string", description: "2-3 sentence plain summary for the homeowner" },
                },
                required: [
                  "refusal", "diagnosis_title", "system", "urgency", "urgency_reasoning", "safety_warning",
                  "likely_causes", "diy_recommended", "diy_steps", "when_to_call_pro",
                  "recommended_pro_type", "estimated_cost_low", "estimated_cost_high", "summary"
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "symptom_triage" } },
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please wait a moment and try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please try again later." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Failed to analyze symptom" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "Failed to parse triage" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const triage = JSON.parse(toolCall.function.arguments);

    if (triage.refusal) {
      return new Response(JSON.stringify({ error: triage.refusal_reason || "I can only help with home and property systems. Please describe a symptom related to your home (e.g., HVAC, plumbing, electrical, appliances, roofing, or structural issues)." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ triage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Symptom triage error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
