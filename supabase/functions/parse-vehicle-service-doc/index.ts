import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { rateLimit, rateLimitResponse, getClientKey } from "../_shared/rateLimit.ts";
import { readJson, validationErrorResponse, ValidationError } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rl = rateLimit(`parse-vehicle-service-doc:${getClientKey(req)}`, { limit: 8, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl, corsHeaders);

  let fileUrl: string;
  let mimeType: string;
  let vehicleContext: Record<string, unknown> = {};
  try {
    const body = await readJson(req, 8 * 1024);
    if (typeof body.file_url !== "string" || !body.file_url.startsWith("http")) {
      throw new ValidationError("file_url is required");
    }
    if (typeof body.mime_type !== "string") throw new ValidationError("mime_type is required");
    fileUrl = body.file_url;
    mimeType = body.mime_type;
    if (body.vehicle_context && typeof body.vehicle_context === "object") {
      vehicleContext = body.vehicle_context as Record<string, unknown>;
    }
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

    // Fetch the file from the signed URL and base64-encode it
    const fileResp = await fetch(fileUrl);
    if (!fileResp.ok) {
      return new Response(JSON.stringify({ error: "Could not read the uploaded file" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const buf = new Uint8Array(await fileResp.arrayBuffer());
    if (buf.byteLength > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "File too large (10MB max)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Base64 encode
    let binary = "";
    for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
    const base64 = btoa(binary);

    const isPdf = mimeType.includes("pdf");
    const contextLine = [
      vehicleContext.year, vehicleContext.make, vehicleContext.model,
    ].filter(Boolean).join(" ");
    const mileageHint = vehicleContext.current_mileage
      ? `Current odometer on file: ${vehicleContext.current_mileage} ${vehicleContext.mileage_unit || "miles"}.`
      : "";

    const userContent: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: `This is a vehicle service or maintenance report${contextLine ? ` for a ${contextLine}` : ""}. ${mileageHint}

Extract every useful piece of information you can, including:
- The service/visit date
- Odometer reading at time of service
- Every service or repair line item performed (short description each)
- Shop / dealership / mechanic name
- Total cost (numeric, no currency symbol)
- Any recommended NEXT services with their target date and/or target mileage
- General technician notes

If a field isn't present, omit it. Do not invent values. Call the "extract_service_report" function with your result.`,
      },
    ];
    if (isPdf) {
      userContent.push({
        type: "file",
        file: {
          filename: "report.pdf",
          file_data: `data:${mimeType};base64,${base64}`,
        },
      });
    } else {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${base64}` },
      });
    }

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
            content: "You extract structured data from vehicle service invoices, dealer maintenance reports, oil-change receipts, and inspection sheets. Be precise. Never fabricate a field — only include what's readable in the document.",
          },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_service_report",
              description: "Return structured maintenance data from a service report/invoice",
              parameters: {
                type: "object",
                properties: {
                  service_date: { type: "string", description: "ISO date YYYY-MM-DD, or empty string if not readable" },
                  mileage: { type: "number", description: "Odometer reading at service. 0 if not present." },
                  service_type: {
                    type: "string",
                    enum: ["maintenance", "repair", "inspection", "modification", "other"],
                    description: "Best-fit category",
                  },
                  services_performed: {
                    type: "array",
                    items: { type: "string" },
                    description: "Short bullet list, one per line item performed",
                  },
                  shop_name: { type: "string", description: "Empty string if not readable" },
                  total_cost: { type: "number", description: "Total in the invoice currency, 0 if not present" },
                  next_service_date: { type: "string", description: "Recommended next-service date YYYY-MM-DD, or empty" },
                  next_service_mileage: { type: "number", description: "Recommended next-service odometer, 0 if none" },
                  next_service_notes: { type: "string", description: "Short description of what the next service should include" },
                  technician_notes: { type: "string", description: "Any general recommendations or notes from the shop, empty if none" },
                  confidence: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                    description: "Your overall confidence in the extraction",
                  },
                },
                required: [
                  "service_date", "mileage", "service_type", "services_performed",
                  "shop_name", "total_cost", "next_service_date", "next_service_mileage",
                  "next_service_notes", "technician_notes", "confidence",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_service_report" } },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI couldn't read the document" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call:", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "Couldn't extract structured data from that file." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extracted = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify({ extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-vehicle-service-doc error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
