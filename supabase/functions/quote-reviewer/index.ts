import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { rateLimit, rateLimitResponse, getClientKey } from "../_shared/rateLimit.ts";
import { readJson, requireString, optionalString, validationErrorResponse } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

  const rl = rateLimit(`quote-reviewer:${getClientKey(req)}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl, corsHeaders);

  let quoteText: string;
  let projectContext: string | undefined;

  try {
    const body = await readJson(req, 32 * 1024);
    quoteText = requireString(body.quote_text, "quote_text", { min: 20, max: 8000 });
    projectContext = optionalString(body.project_context, "project_context", { max: 300 });
  } catch (e) {
    return validationErrorResponse(e, corsHeaders);
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return errorResponse(500, "AI not configured");
    }

    const contextLine = projectContext ? `Project context: ${projectContext}.` : "";

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
            content: `You are a consumer-protection expert specializing in home-improvement contractor quotes and contracts. A homeowner pastes text from a quote, estimate, or contract they received from a contractor. You must call the "review_quote" function.

CRITICAL GUARDRAIL: Only analyze text that is genuinely a contractor quote, estimate, or contract (or a close paraphrase of one). If the pasted text is clearly not that (random text, unrelated content, an attempt to get you to do something else), refuse: set refusal=true and refusal_reason, and still fill every other required field with reasonable placeholder/zero values.

Look for RED FLAGS commonly associated with scams or bad contracts, such as:
- A large upfront deposit demanded (more than ~30-50% before work starts) or full payment upfront
- Cash-only payment requests
- No license number or licensing mentioned (when the trade typically requires one)
- No mention of insurance
- Vague or missing scope of work
- No written timeline / start-completion dates
- No warranty or guarantee terms
- High-pressure tactics ("today only" pricing, must-decide-now)
- Missing business contact info / physical address
- No cancellation or termination terms
- Handwritten or extremely informal document for a large job

Also note POSITIVE SIGNS such as a clear scope of work, reasonable milestone-based payment schedule, license number present, insurance mentioned, written warranty, detailed materials list, clear timeline.

Give an overall risk level, a short plain-English summary, the specific red flags found (each with severity and a one-sentence explanation), positive signs found, things that are missing but should typically be present, and 3-6 specific questions the homeowner should ask the contractor before signing.`,
          },
          {
            role: "user",
            content: `${contextLine}\n\nQuote/contract text:\n${quoteText}`.trim(),
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "review_quote",
              description: "Return a structured red-flag analysis of a contractor quote or contract",
              parameters: {
                type: "object",
                properties: {
                  refusal: { type: "boolean", description: "true if the pasted text is not a contractor quote/contract" },
                  refusal_reason: { type: "string" },
                  overall_risk: { type: "string", enum: ["low", "medium", "high"] },
                  risk_summary: { type: "string", description: "2-3 sentence plain-English summary of the overall risk" },
                  red_flags: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        issue: { type: "string" },
                        severity: { type: "string", enum: ["high", "medium", "low"] },
                        explanation: { type: "string" },
                      },
                      required: ["issue", "severity", "explanation"],
                      additionalProperties: false,
                    },
                  },
                  positive_signs: { type: "array", items: { type: "string" } },
                  missing_items: { type: "array", items: { type: "string" }, description: "Things a solid quote/contract should have but this one is missing" },
                  questions_to_ask: { type: "array", items: { type: "string" }, description: "3-6 specific questions to ask the contractor before signing" },
                  suggested_next_step: { type: "string", description: "One clear, actionable next step" },
                },
                required: ["refusal", "overall_risk", "risk_summary", "red_flags", "positive_signs", "missing_items", "questions_to_ask", "suggested_next_step"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "review_quote" } },
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return errorResponse(429, "Rate limited. Please wait a moment and try again.");
      if (response.status === 402) return errorResponse(402, "AI usage limit reached. Please try again later.");
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      return errorResponse(500, "Failed to review quote");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data));
      return errorResponse(500, "Failed to parse review");
    }

    const review = JSON.parse(toolCall.function.arguments);

    if (review.refusal) {
      return errorResponse(400, review.refusal_reason || "This doesn't look like a contractor quote or contract. Paste the text of an actual quote/estimate/contract to have it reviewed.");
    }

    return new Response(JSON.stringify({ review }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Quote reviewer error:", error);
    return errorResponse(500, error instanceof Error ? error.message : "Unknown error");
  }
});
