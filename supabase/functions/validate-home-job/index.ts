import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, category, description } = await req.json();
    const text = `${title || ""}\n${category || ""}\n${description || ""}`.trim();

    if (!text) {
      return new Response(JSON.stringify({ is_home_related: false, reason: "Empty job post." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // Fail open so we don't block users if AI is down
      return new Response(JSON.stringify({ is_home_related: true, reason: "AI not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a strict moderator for a HOME SERVICES marketplace (Trimbly).
Only ALLOW posts that are clearly a residential home-related service request a handyman, contractor, or trades pro would perform at someone's house or property.

ALLOWED examples: plumbing, electrical, HVAC, roofing, painting, drywall, flooring, appliance repair, landscaping, lawn care, tree work, pest control, cleaning (home), pressure washing, gutter cleaning, fence/deck, garage door, locksmith, pool/spa, handyman tasks, moving help, junk removal, home renovation, smart home install, well/septic, masonry, window/door, insulation, solar install at a home.

REJECT: jobs, gigs, or services unrelated to a residential home (e.g., web development, marketing, writing, tutoring, dog walking only as a service business, selling items, dating, ride share, food orders, commercial-only B2B work with no home component, spam, hate, sexual, illegal, weapons, drugs, anything obviously not a home service).

Borderline that should be ALLOWED if clearly at a home: home office setup, TV mounting, furniture assembly, EV charger install, security camera install.

Call the "classify_job" function exactly once.`,
          },
          { role: "user", content: text.slice(0, 2000) },
        ],
        tools: [{
          type: "function",
          function: {
            name: "classify_job",
            description: "Classify whether a job post is a residential home service.",
            parameters: {
              type: "object",
              properties: {
                is_home_related: { type: "boolean", description: "True only if this is a residential home service request." },
                reason: { type: "string", description: "Short reason (one sentence) explaining the decision." },
              },
              required: ["is_home_related", "reason"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "classify_job" } },
      }),
    });

    if (response.status === 429 || response.status === 402) {
      // Fail open on rate/credit issues
      return new Response(JSON.stringify({ is_home_related: true, reason: "AI unavailable" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI error", response.status, errText);
      return new Response(JSON.stringify({ is_home_related: true, reason: "AI error (allowed)" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    let result = { is_home_related: true, reason: "" };
    if (call?.function?.arguments) {
      try { result = JSON.parse(call.function.arguments); } catch (_) {}
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("validate-home-job error", e);
    return new Response(JSON.stringify({ is_home_related: true, reason: "Validator error (allowed)" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
