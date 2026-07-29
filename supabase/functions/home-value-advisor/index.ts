import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { rateLimit, rateLimitResponse, getClientKey } from "../_shared/rateLimit.ts";
import { readJson, requireString, optionalString, requireArray, validationErrorResponse, ValidationError } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VERDICT_ENUM = ["increases_value", "neutral", "decreases_value", "depends"];

type FollowUpAnswer = { question: string; answer: string };

const quickTool = {
  type: "function" as const,
  function: {
    name: "value_advisor_quick",
    description: "Return a rough home-value verdict for a proposed upgrade, plus follow-up questions for a better estimate",
    parameters: {
      type: "object",
      properties: {
        refusal: { type: "boolean", description: "true if the request is not about a home/property upgrade" },
        refusal_reason: { type: "string" },
        project_title: { type: "string", description: "Short label for the project, e.g. 'Deck Addition'" },
        verdict: { type: "string", enum: VERDICT_ENUM },
        estimated_roi_percent_low: { type: "number", description: "Rough low end of % of cost recouped at resale" },
        estimated_roi_percent_high: { type: "number", description: "Rough high end of % of cost recouped at resale" },
        estimated_cost_low: { type: "number", description: "Rough low end project cost in USD" },
        estimated_cost_high: { type: "number", description: "Rough high end project cost in USD" },
        estimated_value_added_low: { type: "number", description: "Rough low end of added resale value in USD" },
        estimated_value_added_high: { type: "number", description: "Rough high end of added resale value in USD" },
        summary: { type: "string", description: "2-3 sentence homeowner-friendly explanation of the verdict" },
        regional_note: { type: "string", description: "Brief note that ROI varies heavily by local market and home condition" },
        follow_up_questions: {
          type: "array",
          items: { type: "string" },
          description: "3-6 specific questions that, if answered, would allow a much more accurate detailed estimate",
        },
      },
      required: [
        "refusal", "project_title", "verdict", "estimated_roi_percent_low", "estimated_roi_percent_high",
        "estimated_cost_low", "estimated_cost_high", "estimated_value_added_low", "estimated_value_added_high",
        "summary", "regional_note", "follow_up_questions",
      ],
      additionalProperties: false,
    },
  },
};

const detailedTool = {
  type: "function" as const,
  function: {
    name: "value_advisor_detailed",
    description: "Return a full detailed home-value estimate and step-by-step project plan",
    parameters: {
      type: "object",
      properties: {
        project_title: { type: "string" },
        verdict: { type: "string", enum: VERDICT_ENUM },
        confidence: { type: "string", enum: ["medium", "high"] },
        estimated_roi_percent_low: { type: "number" },
        estimated_roi_percent_high: { type: "number" },
        estimated_cost_low: { type: "number" },
        estimated_cost_high: { type: "number" },
        estimated_value_added_low: { type: "number" },
        estimated_value_added_high: { type: "number" },
        summary: { type: "string", description: "2-4 sentence updated explanation given the extra detail" },
        materials: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              estimated_cost: { type: "number" },
              quantity: { type: "string" },
            },
            required: ["name", "estimated_cost"],
            additionalProperties: false,
          },
        },
        total_time_estimate: { type: "string", description: "e.g. '3-5 weekends' or '40-60 hours'" },
        overall_skill_level: { type: "string", enum: ["beginner", "intermediate", "advanced", "pro_recommended"] },
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              step_number: { type: "number" },
              title: { type: "string" },
              description: { type: "string" },
              recommendation: { type: "string", enum: ["diy", "pro_recommended", "either"] },
              skill_level: { type: "string", enum: ["beginner", "intermediate", "advanced", "pro_recommended"] },
              estimated_time: { type: "string" },
              diy_cost_estimate: { type: "number" },
              pro_cost_estimate: { type: "number" },
              safety_notes: { type: "string", description: "Empty string if none" },
            },
            required: ["step_number", "title", "description", "recommendation", "skill_level", "estimated_time", "diy_cost_estimate", "pro_cost_estimate", "safety_notes"],
            additionalProperties: false,
          },
        },
        total_diy_cost_low: { type: "number" },
        total_diy_cost_high: { type: "number" },
        total_pro_cost_low: { type: "number" },
        total_pro_cost_high: { type: "number" },
        permits_likely_needed: { type: "boolean" },
        permit_note: { type: "string" },
        tips: { type: "array", items: { type: "string" }, description: "3-5 practical tips" },
      },
      required: [
        "project_title", "verdict", "confidence", "estimated_roi_percent_low", "estimated_roi_percent_high",
        "estimated_cost_low", "estimated_cost_high", "estimated_value_added_low", "estimated_value_added_high",
        "summary", "materials", "total_time_estimate", "overall_skill_level", "steps",
        "total_diy_cost_low", "total_diy_cost_high", "total_pro_cost_low", "total_pro_cost_high",
        "permits_likely_needed", "permit_note", "tips",
      ],
      additionalProperties: false,
    },
  },
};

async function callGateway(apiKey: string, systemPrompt: string, userPrompt: string, tool: typeof quickTool | typeof detailedTool) {
  return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: tool.function.name } },
      temperature: 0.3,
    }),
  });
}

function errorResponse(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rl = rateLimit(`home-value-advisor:${getClientKey(req)}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl, corsHeaders);

  let mode: string;
  let description: string;
  let homeContext: string | undefined;
  let followUpAnswers: FollowUpAnswer[] = [];

  try {
    const body = await readJson(req, 32 * 1024);
    mode = requireString(body.mode, "mode", { min: 1, max: 20 });
    if (mode !== "quick" && mode !== "detailed") {
      throw new ValidationError("mode must be 'quick' or 'detailed'", "mode");
    }
    description = requireString(body.description, "description", { min: 10, max: 4000 });
    homeContext = optionalString(body.home_context, "home_context", { max: 500 });

    if (mode === "detailed") {
      const rawAnswers = requireArray<Record<string, unknown>>(body.follow_up_answers, "follow_up_answers", { min: 1, max: 20 });
      followUpAnswers = rawAnswers.map((a, i) => ({
        question: requireString(a.question, `follow_up_answers[${i}].question`, { min: 1, max: 500 }),
        answer: requireString(a.answer, `follow_up_answers[${i}].answer`, { min: 1, max: 1000 }),
      }));
    }
  } catch (e) {
    return validationErrorResponse(e, corsHeaders);
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return errorResponse(500, "AI not configured");
    }

    const homeCtx = homeContext ? `Home context: ${homeContext}.` : "";

    let response: Response;

    if (mode === "quick") {
      const systemPrompt = `You are a real estate and home-improvement value advisor. A homeowner describes a home upgrade or renovation they are considering. You must call the "value_advisor_quick" function.

CRITICAL GUARDRAIL: You ONLY advise on home/property upgrades, renovations, and improvements and their effect on home value. If the request is not about a home/property upgrade, refuse: set refusal=true and refusal_reason to a brief explanation, and still fill every other required field with reasonable placeholder/zero values.

Guidelines:
- This is a ROUGH, low-confidence estimate since you don't have full project details yet.
- Ground your verdict in typical US resale ROI ranges for the project type (e.g. minor kitchen remodel ~70-80% ROI, major kitchen remodel ~50-60%, bathroom remodel ~60-70%, deck addition ~65-90%, finished basement ~65-75%, new roof ~60-70%, landscaping ~100%+ for modest projects, swimming pool often neutral-to-negative in many markets) but caveat heavily since specifics are unknown.
- Give realistic rough cost and added-value ranges in USD.
- Generate 3-6 SPECIFIC follow-up questions tailored precisely to this project (size, materials/quality tier, scope, current condition, etc.) that would meaningfully sharpen the estimate.
- Keep the summary to 2-3 sentences, homeowner-friendly, no jargon.`;

      const userPrompt = `Proposed upgrade: ${description}\n\n${homeCtx}`.trim();
      response = await callGateway(LOVABLE_API_KEY, systemPrompt, userPrompt, quickTool);
    } else {
      const qaText = followUpAnswers.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n");
      const systemPrompt = `You are a real estate and home-improvement value advisor and general contractor. A homeowner described a home upgrade and has now answered follow-up questions. Use ALL of this detail to give a much more accurate, thorough estimate. You must call the "value_advisor_detailed" function.

Guidelines:
- Provide an updated, more confident value/ROI verdict given the extra detail (confidence should be "medium" or "high", never lower).
- Provide a full materials list with realistic individual estimated costs (current US market rates).
- Provide the overall skill level required and a total time estimate.
- Break the project into ordered, SPECIFIC steps (typically 4-10). For each step: a clear title and description, whether DIY or a pro is recommended (or "either"), the skill level for that step, an estimated time, an estimated DIY cost and an estimated pro-hire cost for that specific step, and safety_notes (empty string if none apply).
- Sum step costs sensibly into total_diy_cost_low/high and total_pro_cost_low/high — these should reflect doing the ENTIRE project either fully DIY or fully hiring pros.
- Note whether permits are likely required for this type of project and any relevant note.
- Give 3-5 practical, specific tips.
- Be realistic and grounded, not generic.`;

      const userPrompt = `Original proposed upgrade: ${description}\n\n${homeCtx}\n\nFollow-up details from the homeowner:\n${qaText}`.trim();
      response = await callGateway(LOVABLE_API_KEY, systemPrompt, userPrompt, detailedTool);
    }

    if (!response.ok) {
      if (response.status === 429) {
        return errorResponse(429, "Rate limited. Please wait a moment and try again.");
      }
      if (response.status === 402) {
        return errorResponse(402, "AI usage limit reached. Please try again later.");
      }
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      return errorResponse(500, "Failed to generate estimate");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data));
      return errorResponse(500, "Failed to parse estimate");
    }

    const result = JSON.parse(toolCall.function.arguments);

    if (mode === "quick" && result.refusal) {
      return errorResponse(400, result.refusal_reason || "I can only help evaluate home and property upgrades. Please describe a renovation or improvement you're considering for your home.");
    }

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Home value advisor error:", error);
    return errorResponse(500, error instanceof Error ? error.message : "Unknown error");
  }
});
