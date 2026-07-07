import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { rateLimit, rateLimitResponse, getClientKey } from "../_shared/rateLimit.ts";
import { readJson, requireArray, optionalString, validationErrorResponse } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rl = rateLimit(`energy-advisor-chat:${getClientKey(req)}`, { limit: 20, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl, corsHeaders);

  let messages: Array<{ role: string; content: string }>;
  let homeContext: string | undefined;
  try {
    const body = await readJson(req, 64 * 1024);
    messages = requireArray(body.messages, "messages", { min: 1, max: 50 });
    for (const m of messages) {
      if (!m || typeof m !== "object") throw new Error("invalid message");
      if (typeof (m as any).role !== "string" || typeof (m as any).content !== "string") {
        throw new Error("invalid message");
      }
      if ((m as any).content.length > 4000) throw new Error("message too long");
    }
    homeContext = optionalString(body.homeContext, "homeContext", { max: 4_000 });
  } catch (e) {
    return validationErrorResponse(e, corsHeaders);
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a home energy efficiency and utility-cost-savings advisor. Your job is to give concrete, prioritized, cost-aware recommendations — not generic tips.

For every recommendation you make, include:
1. **What to do** (specific, e.g. "Add R-38 blown-in insulation to the attic" not "improve insulation")
2. **Rough cost to do it** (a realistic USD range for a typical home)
3. **Rough annual savings** (a realistic USD range based on the home's profile)
4. **Simple payback period** (cost ÷ annual savings, in years)
5. Whether it's realistically a **DIY** task or needs a **licensed pro** (and which trade — HVAC, electrician, insulation contractor, etc.)

Prioritize recommendations by payback period (fastest first), and call out any available rebates or tax credits generically (e.g., "heat pumps often qualify for federal/state rebates — check energystar.gov/rebate-finder for what's available in your area," without inventing specific dollar amounts you're not sure of).

Keep the tone practical and numbers-driven — homeowners are making a spend-vs-save decision, treat it like one.

${homeContext ? `\n--- HOME PROFILE ---\n${homeContext}\n--- END HOME PROFILE ---` : "\nNo home profile provided yet — ask the user for their home's age, square footage, HVAC type, and location/climate before giving specific numbers."}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("energy-advisor-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
