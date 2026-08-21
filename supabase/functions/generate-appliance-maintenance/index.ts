// Suggests routine maintenance tasks for a single appliance/system just
// added to a homeowner's binder — deliberately scoped to one item, unlike
// generate-maintenance which schedules the whole home. Many binder items
// (furniture, decor, small electronics) genuinely need no scheduled upkeep,
// so the model is explicitly told it's fine to return an empty tasks array
// rather than inventing busywork; the caller shows a pick-list of whatever
// comes back and lets the homeowner choose which (if any) to actually add.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { rateLimit, rateLimitResponse, getClientKey } from "../_shared/rateLimit.ts";
import { readJson, validationErrorResponse, ValidationError } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rl = rateLimit(`generate-appliance-maintenance:${getClientKey(req)}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl, corsHeaders);

  let appliance: Record<string, unknown>;
  let home: Record<string, unknown>;
  try {
    const body = await readJson(req, 8 * 1024);
    if (!body.appliance || typeof body.appliance !== "object" || Array.isArray(body.appliance)) {
      throw new ValidationError("Appliance details are required");
    }
    appliance = body.appliance as Record<string, unknown>;
    if (typeof appliance.name !== "string" || !appliance.name.trim()) {
      throw new ValidationError("Appliance name is required");
    }
    home = (body.home && typeof body.home === "object" && !Array.isArray(body.home)) ? body.home as Record<string, unknown> : {};
  } catch (e) {
    return validationErrorResponse(e, corsHeaders);
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentMonth = new Date().toLocaleString("en-US", { month: "long" });
    const currentYear = new Date().getFullYear();

    const applianceDescription = [
      `Name: ${appliance.name}`,
      appliance.brand ? `Brand: ${appliance.brand}` : null,
      appliance.model_number ? `Model: ${appliance.model_number}` : null,
      home.city && home.state ? `Home location: ${home.city}, ${home.state}` : null,
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
            content: `You are a home maintenance expert. A homeowner just added a single item to their home inventory (binder). Suggest routine maintenance tasks for THIS SPECIFIC ITEM ONLY — do not suggest general home maintenance unrelated to it.

Current date context: ${currentMonth} ${currentYear}.

Many items need NO routine scheduled maintenance at all (furniture, decor, small electronics, etc.) — for those, return an empty tasks array rather than inventing busywork. Only suggest tasks that are genuinely standard, widely-recommended maintenance for this specific type of item (e.g. HVAC systems need filter changes, water heaters need flushing/anode checks, refrigerators need coil cleaning and water filter changes, smoke/CO detectors need battery and unit-age checks, garage door openers need lubrication and safety-sensor checks).

Assign realistic due dates starting from today going forward 12 months.

For tasks that require purchasing supplies (filters, batteries, etc.), include a specific Amazon search term in products_search_term, incorporating the brand/model when it helps find the exact right part. Leave it as an empty string for tasks that don't need a product.

You must call the "appliance_maintenance" function. Pass an empty tasks array if this item genuinely doesn't warrant scheduled maintenance.`,
          },
          {
            role: "user",
            content: `Suggest maintenance tasks (or none) for this item:\n\n${applianceDescription}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "appliance_maintenance",
              description: "Return a list of maintenance tasks for this single item, or an empty list if none apply",
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
                        products_search_term: { type: "string", description: "Amazon search term for required product/supply. Leave empty string if no product needed." },
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
        tool_choice: { type: "function", function: { name: "appliance_maintenance" } },
        temperature: 0.3,
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

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ tasks: result.tasks || [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Generate appliance maintenance error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
