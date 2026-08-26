import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { rateLimit, rateLimitResponse, getClientKey } from "../_shared/rateLimit.ts";
import { readJson, requireArray, validationErrorResponse } from "../_shared/validation.ts";
import { buildDocumentContentParts, type DocFileRef } from "../_shared/documentFiles.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rl = rateLimit(`coverage-chat:${getClientKey(req)}`, { limit: 20, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl, corsHeaders);

  let messages: Array<{ role: string; content: string }>;
  let documentFiles: DocFileRef[] = [];
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
  } catch (e) {
    return validationErrorResponse(e, corsHeaders);
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const documentParts = documentFiles.length > 0 ? await buildDocumentContentParts(documentFiles) : [];

    const systemPrompt = `You are an expert insurance and home warranty advisor. The user has uploaded their coverage documents, each labeled [WARRANTY] or [INSURANCE], attached below as readable files/images. Use these to answer their questions accurately.

If the user asks about something not covered in their documents, clearly state that you couldn't find that information in their uploaded documents.

Be specific when referencing coverage limits, deductibles, exclusions, and claim procedures. Always cite which document the information comes from.

When something the user asks about IS covered:
- If it's covered by only one of warranty or insurance, say so plainly.
- If it's covered by BOTH a [WARRANTY] and an [INSURANCE] document, explicitly recommend which one to file the claim on, and explain why in plain terms (e.g. lower deductible, no effect on future premiums, faster turnaround, higher coverage limit, fewer exclusions that might apply here). Don't just list both — give a clear recommendation.
- After answering, offer to help them word the claim submission to improve the odds it gets approved (e.g. "Want help wording this claim so it's more likely to be approved?"). If they say yes, draft language that: describes the issue factually and specifically, cites the exact policy/warranty section and page that covers it, uses the document's own terminology rather than the user's casual phrasing, and avoids language that could sound like a pre-existing condition or excluded cause unless that's genuinely accurate. Never suggest omitting relevant facts or misrepresenting the cause of the problem — the goal is clear, well-supported wording, not deception.

A document may still come through marked "content not available", "too large", or "could not load" below — that means you were NOT given that file's actual content. Never invent, estimate, or guess specific figures (dollar limits, deductibles, percentages) for a document marked this way; tell the user you couldn't read that particular file and ask them to re-upload it or paste the relevant terms as text.

${documentParts.length === 0 ? "\nNo documents have been uploaded yet. Let the user know they should upload their warranty or insurance documents first." : ""}`;

    const chatMessages: Array<Record<string, unknown>> = [{ role: "system", content: systemPrompt }];
    if (documentParts.length > 0) {
      chatMessages.push({ role: "user", content: [{ type: "text", text: "Here are my uploaded coverage documents:" }, ...documentParts] });
      chatMessages.push({ role: "assistant", content: "Got it — I've reviewed your uploaded documents. What would you like to know?" });
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
    console.error("coverage-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
