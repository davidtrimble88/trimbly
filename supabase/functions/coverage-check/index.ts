import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { rateLimit, rateLimitResponse, getClientKey } from "../_shared/rateLimit.ts";
import { buildDocumentContentParts, type DocFileRef } from "../_shared/documentFiles.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rl = rateLimit(`coverage-check:${getClientKey(req)}`, { limit: 20, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl, corsHeaders);

  try {
    const body = await req.json();
    const issue: string = typeof body.issue === "string" ? body.issue.slice(0, 4000) : "";
    const documentFiles: DocFileRef[] = Array.isArray(body.documentFiles) ? body.documentFiles.slice(0, 8) : [];

    if (!issue.trim()) {
      return new Response(JSON.stringify({ error: "Missing issue" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (documentFiles.length === 0) {
      return new Response(JSON.stringify({ coverage: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const documentParts = await buildDocumentContentParts(documentFiles);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You review a homeowner's uploaded coverage documents (each labeled [WARRANTY] or [INSURANCE]) and decide whether a specific home problem is likely covered.

Rules:
- Base your answer ONLY on the attached documents. Never invent limits, deductibles, or terms.
- If a document is marked "content not available", "too large", or "could not load", you did NOT receive it — say so and set status to "unclear".
- Cite which document (warranty or insurance) supports your answer and, when the document states them, the relevant deductible or limit.
- If both a warranty and an insurance policy could cover it, recommend which one to file on and why in one short sentence.
- Keep "explanation" to 2-3 plain sentences a homeowner can act on.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Here are my coverage documents. Is this problem covered?\n\nProblem: ${issue}` },
              ...documentParts,
            ],
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "coverage_verdict",
            description: "Whether the described home problem appears covered by the uploaded documents",
            parameters: {
              type: "object",
              properties: {
                status: { type: "string", enum: ["likely_covered", "possibly_covered", "not_covered", "unclear"] },
                source: { type: "string", description: "e.g. 'Home warranty', 'Homeowners insurance', 'Both', or 'None'" },
                explanation: { type: "string" },
                next_step: { type: "string", description: "One short claim-related next step, or empty string" },
              },
              required: ["status", "source", "explanation", "next_step"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "coverage_verdict" } },
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const msg = status === 429
        ? "Rate limited. Please wait a moment and try again."
        : status === 402
          ? "AI usage limit reached. Please try again later."
          : "Failed to check coverage";
      if (status !== 429 && status !== 402) console.error("coverage-check AI error:", status, await response.text());
      return new Response(JSON.stringify({ error: msg }), {
        status: status === 429 || status === 402 ? status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) {
      return new Response(JSON.stringify({ error: "Failed to parse coverage result" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ coverage: JSON.parse(args) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("coverage-check error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
