import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

type Mode = "draft_reply" | "summarize" | "scope_check";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { mode, thread, latestMessage, tone, businessName } = await req.json() as {
      mode: Mode;
      thread?: { sender: string; body: string; created_at?: string }[];
      latestMessage?: string;
      tone?: string;
      businessName?: string;
    };

    if (!mode) {
      return new Response(JSON.stringify({ error: "mode required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const threadText = (thread || []).map(m => `[${m.sender}]: ${m.body}`).join("\n\n");

    let systemPrompt = "";
    let userPrompt = "";

    if (mode === "draft_reply") {
      systemPrompt = `You are an expert assistant for a home-service pro (${businessName || "the pro"}). Write professional, concise replies to homeowners. Tone: ${tone || "friendly + professional"}. Always: confirm scope, give a clear next step (visit, quote, schedule), avoid binding commitments, never quote firm prices without seeing the job. Keep it under 120 words.`;
      userPrompt = `Conversation so far:\n${threadText}\n\nDraft a reply to the homeowner's latest message.`;
    } else if (mode === "summarize") {
      systemPrompt = "Summarize home-service message threads for a busy contractor. Output: 2-3 bullets covering what the homeowner wants, key constraints (timing, budget, access), and any open questions. Be terse.";
      userPrompt = `Thread:\n${threadText}\n\nSummary:`;
    } else if (mode === "scope_check") {
      systemPrompt = `You analyze homeowner messages for scope creep against an original job. Return JSON: { "scope_creep": boolean, "added_items": string[], "flags": string[], "advice": string }. "flags" includes things like "rush job", "demands free work", "unclear access", "payment vague".`;
      userPrompt = `Original thread:\n${threadText}\n\nLatest homeowner message:\n${latestMessage || ""}\n\nAnalyze for scope creep and red flags. Return JSON only.`;
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        ...(mode === "scope_check" ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!aiRes.ok) {
      const text = await aiRes.text();
      return new Response(JSON.stringify({ error: text }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await aiRes.json();
    const content = data.choices?.[0]?.message?.content || "";

    let result: any = { content };
    if (mode === "scope_check") {
      try { result = { ...result, parsed: JSON.parse(content) }; } catch { /* keep raw */ }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
