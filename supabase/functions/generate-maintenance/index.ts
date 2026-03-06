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
    const { home } = await req.json();

    if (!home) {
      return new Response(
        JSON.stringify({ error: "Home profile is required" }),
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

    const currentMonth = new Date().toLocaleString("en-US", { month: "long" });
    const currentYear = new Date().getFullYear();

    const homeDescription = [
      `Home type: ${home.home_type || "single family"}`,
      home.year_built ? `Built: ${home.year_built}` : null,
      home.square_feet ? `Size: ${home.square_feet} sq ft` : null,
      home.city && home.state ? `Location: ${home.city}, ${home.state}` : null,
      home.hvac_type ? `HVAC: ${home.hvac_type}` : null,
      home.roof_type ? `Roof: ${home.roof_type}` : null,
      home.has_pool ? "Has a pool" : null,
      home.has_septic ? "Has septic system" : null,
      home.has_well_water ? "Has well water" : null,
      home.notes ? `Additional notes: ${home.notes}` : null,
    ].filter(Boolean).join(". ");

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
            content: `You are a home maintenance expert. Generate a personalized annual maintenance schedule based on the home profile.

Current date context: ${currentMonth} ${currentYear}.

Create tasks that are specific to the home's characteristics (age, location climate, features like pool/septic).
Assign realistic due dates starting from today going forward 12 months.
Each task should have a specific season and recurrence interval.

For tasks that require purchasing supplies or products (like air filters, batteries, cleaning chemicals, sealant, etc.), include a specific Amazon search term in products_search_term. Be specific with sizes/types when possible. Leave it as empty string for tasks that don't need products (like inspections or professional services).

You must call the "maintenance_schedule" function with the generated tasks.`,
          },
          {
            role: "user",
            content: `Generate a maintenance schedule for this home:\n\n${homeDescription}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "maintenance_schedule",
              description: "Return a list of maintenance tasks for the home",
              parameters: {
                type: "object",
                properties: {
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Short task name" },
                        description: { type: "string", description: "What to do and why" },
                        category: { type: "string", enum: ["HVAC", "Plumbing", "Electrical", "Exterior", "Interior", "Landscaping", "Safety", "Appliances", "Pool", "Septic", "General"] },
                        priority: { type: "string", enum: ["low", "medium", "high"] },
                        due_date: { type: "string", description: "ISO date string YYYY-MM-DD" },
                        recurrence_months: { type: "number", description: "How often to repeat in months (0 = one-time)" },
                        season: { type: "string", enum: ["spring", "summer", "fall", "winter", "any"] },
                        products_search_term: { type: "string", description: "Amazon search term for required product/supply, e.g. 'HVAC air filter 20x25x1', 'smoke detector 10 year battery', 'gutter guard mesh'. Leave empty string if no product needed." },
                      },
                      required: ["title", "description", "category", "priority", "due_date", "recurrence_months", "season", "products_search_term"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["tasks"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "maintenance_schedule" } },
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please wait and try again." }), {
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
      return new Response(JSON.stringify({ error: "Failed to generate schedule" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "Failed to parse schedule" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const schedule = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ tasks: schedule.tasks }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate schedule error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
