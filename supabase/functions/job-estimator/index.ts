import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, category, city, state } = await req.json();

    if (!description || description.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Please provide a detailed description (at least 10 characters)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const locationContext = city && state ? `Location: ${city}, ${state}.` : "";
    const categoryContext = category ? `Category: ${category}.` : "";

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
            content: `You are a professional home services cost estimator. Given a job description, provide a detailed estimate.

You must call the "job_estimate" function with accurate, realistic data based on current US/Canadian market rates.

Guidelines:
- Provide a realistic cost range (low to high) in USD
- List specific materials needed with individual costs
- Give an estimated time range in hours
- Rate difficulty from 1-5
- Recommend DIY vs hiring a pro with clear reasoning
- Include 2-3 practical tips
- Consider the location for pricing if provided`,
          },
          {
            role: "user",
            content: `Estimate this home job:\n\n${description}\n\n${categoryContext} ${locationContext}`.trim(),
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "job_estimate",
              description: "Return a structured job cost estimate",
              parameters: {
                type: "object",
                properties: {
                  job_title: { type: "string", description: "Short title for the job" },
                  category: { type: "string", enum: ["Plumbing", "Electrical", "Handyman", "HVAC", "Landscaping", "Painting", "Roofing", "Cleaning", "Other"] },
                  cost_low: { type: "number", description: "Low end cost estimate in USD" },
                  cost_high: { type: "number", description: "High end cost estimate in USD" },
                  time_hours_low: { type: "number", description: "Minimum hours to complete" },
                  time_hours_high: { type: "number", description: "Maximum hours to complete" },
                  difficulty: { type: "number", description: "1-5 difficulty rating (1=easy, 5=expert)" },
                  diy_recommended: { type: "boolean", description: "Whether DIY is recommended" },
                  diy_reasoning: { type: "string", description: "Why DIY is or isn't recommended" },
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
                    description: "List of materials needed",
                  },
                  tips: {
                    type: "array",
                    items: { type: "string" },
                    description: "2-3 practical tips",
                  },
                  summary: { type: "string", description: "Brief overview paragraph of the job and what to expect" },
                },
                required: ["job_title", "category", "cost_low", "cost_high", "time_hours_low", "time_hours_high", "difficulty", "diy_recommended", "diy_reasoning", "materials", "tips", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "job_estimate" } },
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "Failed to generate estimate" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "Failed to parse estimate" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const estimate = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ estimate }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Job estimator error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
