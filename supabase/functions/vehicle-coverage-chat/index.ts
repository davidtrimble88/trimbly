import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { rateLimit, rateLimitResponse, getClientKey } from "../_shared/rateLimit.ts";
import { readJson, requireArray, optionalString, validationErrorResponse } from "../_shared/validation.ts";
import { buildDocumentContentParts, type DocFileRef } from "../_shared/documentFiles.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rl = rateLimit(`vehicle-coverage-chat:${getClientKey(req)}`, { limit: 20, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl, corsHeaders);

  let messages: Array<{ role: string; content: string }>;
  let documentFiles: DocFileRef[] = [];
  let vehicleContext: string | undefined;
  try {
    const body = await readJson(req, 256 * 1024);
    messages = requireArray(body.messages, "messages", { min: 1, max: 50 });
    for (const m of messages) {
      if (!m || typeof m !== "object") throw new Error("invalid message");
      if (typeof (m as any).role !== "string" || typeof (m as any).content !== "string") {
        throw new Error("invalid message");
      }
      if ((m as any).content.length > 8000) throw new Error("message too long");
    }
    if (body.documentFiles !== undefined) {
      const raw = requireArray(body.documentFiles, "documentFiles", { max: 8 });
      for (const f of raw) {
        if (!f || typeof f !== "object") throw new Error("invalid documentFiles entry");
        if (typeof (f as any).url !== "string" || !(f as any).url.startsWith("http")) throw new Error("invalid document url");
        if (typeof (f as any).mimeType !== "string") throw new Error("invalid document mimeType");
        if (typeof (f as any).label !== "string" || (f as any).label.length > 300) throw new Error("invalid document label");
      }
      documentFiles = raw as DocFileRef[];
    }
    vehicleContext = optionalString(body.vehicleContext, "vehicleContext", { max: 8_000 });
  } catch (e) {
    return validationErrorResponse(e, corsHeaders);
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const documentParts = documentFiles.length > 0 ? await buildDocumentContentParts(documentFiles) : [];

    const systemPrompt = `You are an expert automotive insurance, warranty, and extended-service-contract advisor. The user has uploaded their vehicle coverage documents (auto insurance policies, manufacturer warranties, extended warranties, service contracts) and is asking about a specific issue with their vehicle.

Your job is to:
1. **Determine coverage**: Carefully analyze whether the described issue is covered by ANY of the uploaded policies. Cite the specific document, section/clause name, coverage limit, and deductible whenever possible. If the documents are ambiguous, say so.
2. **Help the user file a strong claim**: Write the claim description in clear, factual, insurance-friendly language that maximizes the chance of approval. Use precise terminology the adjuster expects (e.g., "sudden mechanical failure," "covered peril," "comprehensive loss," "manufacturer defect"). Avoid words that trigger denials (e.g., "wear and tear," "neglected maintenance," "pre-existing"). Provide the user a ready-to-submit claim statement they can copy.
3. **List required documentation**: itemize photos, receipts, repair estimates, police reports, diagnostic codes, or maintenance records they should gather BEFORE filing.
4. **Suggested talking points** when calling the insurer or warranty admin — short scripted lines.

Then ALWAYS finish with a "Should You File This Claim?" section structured exactly like this:

### Pros of filing
- Be specific with dollar estimates when possible (e.g., "Likely covers ~$2,400 of a ~$2,800 transmission repair after your $400 deductible").
- Mention deductible vs. estimated repair cost.
- Mention whether it preserves out-of-pocket cash flow.

### Cons of filing
- Estimate the **likely premium increase** (insurance: typically 20-40% surcharge for 3-5 years after an at-fault or comprehensive claim; warranty claims usually do NOT raise rates but may count toward a claim cap).
- Mention loss of any claim-free discount.
- Mention surcharge duration (e.g., "stays on your CLUE report for 5-7 years").
- Mention risk of policy non-renewal if multiple claims in a short window.
- Mention deductible cost.

### Bottom-line recommendation
Give a clear "File it" or "Pay out of pocket" recommendation based on a rough break-even calculation: if (estimated repair − deductible) > (estimated premium increase over surcharge period), recommend filing. Otherwise recommend paying out of pocket. Show the math.

Always include this disclaimer at the end: "Estimates are general — confirm exact figures with your insurer before filing."

${vehicleContext ? `\n--- VEHICLE CONTEXT ---\n${vehicleContext}\n--- END VEHICLE CONTEXT ---` : ""}

Your uploaded coverage documents are attached below as readable files/images, labeled by type and vehicle. A document may still come through marked "content not available", "too large", or "could not load" — this means you were NOT given that file's actual content. Never cite a specific coverage limit, deductible, or clause as if you read it in a document marked this way; say you couldn't read that particular file and ask the user to re-upload it or paste the relevant terms as text instead. General industry-typical estimates (premium surcharge ranges, etc.) are fine to use as clearly-labeled estimates, just don't attribute invented numbers to a specific unread document.

${documentParts.length === 0 ? "\nNo documents have been uploaded yet. Tell the user to upload their auto insurance policy or vehicle warranty first so you can analyze coverage." : ""}`;

    const chatMessages: Array<Record<string, unknown>> = [{ role: "system", content: systemPrompt }];
    if (documentParts.length > 0) {
      chatMessages.push({ role: "user", content: [{ type: "text", text: "Here are my uploaded vehicle coverage documents:" }, ...documentParts] });
      chatMessages.push({ role: "assistant", content: "Got it — I've reviewed your uploaded documents. Tell me what happened." });
    }
    chatMessages.push(...messages);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: chatMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("vehicle-coverage-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
