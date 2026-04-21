import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_KNOWLEDGE = `
HomeHero is a platform connecting homeowners with local home-service professionals (handymen, plumbers, electricians, etc.) and providing AI-driven home maintenance tools.

CORE FEATURES:
- Dashboard (/dashboard): Central hub for homeowners, summary of homes, tasks, messages.
- Maintenance Autopilot (/maintenance): Auto-generated seasonal maintenance schedule per home. Free tier gets basic schedule; Pro gets advanced reminders and product suggestions.
- Digital Home Binder (/binder): Track appliances, warranties, serial numbers, receipts. Free tier: 0 items. Pro: 5 items. Multi-Home Pro: unlimited.
- Find Pros / Search (/search): Browse and message local providers. AI-powered search.
- AI Job Estimator (/estimator): Pro-only. Upload a photo + description, get cost estimate and DIY-vs-Pro recommendation.
- Coverage Advisor (/coverage): Pro-only. Upload warranty/insurance docs, AI tells you what's covered.
- Post a Job (/post-job): Homeowners post project requests; pros bid on them.
- Messages (/messages): In-app chat with providers. Phone numbers require explicit approval (privacy-first).
- For Pros: Providers register at /pro-register, manage listings, bid on jobs at /job-board.

SUBSCRIPTION TIERS (homeowners):
- Free: 1 home, basic maintenance schedule, browse pros, message pros, post jobs.
- Pro: 1 home, full features (Estimator, Coverage Advisor, Binder up to 5 items, advanced maintenance).
- Multi-Home Pro: up to 10 homes, unlimited binder items, all Pro features.
- Manage subscription: currently handled by contacting support (billing not yet self-serve).

ACCOUNT:
- Sign up at /auth. Email auto-confirms (no verification email needed).
- Reset password at /auth → "Forgot password" or /reset-password.
- Two account types at signup: Homeowner or Service Provider.

PRIVACY:
- All initial provider contact goes through in-app messaging.
- Providers cannot see homeowner phone numbers unless the homeowner explicitly approves it.

REPLIES:
- Replies to support messages arrive in the user's in-app /messages inbox, typically within 48 hours.
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messageId } = await req.json();
    if (!messageId) {
      return new Response(JSON.stringify({ error: "messageId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch the contact message
    const { data: msg, error: msgErr } = await supabase
      .from("contact_messages")
      .select("*")
      .eq("id", messageId)
      .maybeSingle();

    if (msgErr || !msg) {
      return new Response(JSON.stringify({ error: "Message not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (msg.status !== "new") {
      return new Response(JSON.stringify({ skipped: true, reason: "already handled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    // Ask the AI to classify + draft a reply, using tool calling for structured output
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `You are a careful support triage AI for HomeHero. Decide if you can confidently answer the user's question using ONLY the provided site knowledge.

Reply ONLY when ALL of these are true:
1. The question is directly about HomeHero (the site, its features, pricing, account, how-to).
2. The answer is unambiguously contained in the site knowledge below.
3. There is NO billing dispute, refund request, bug report needing investigation, complaint, or anything requiring a human.
4. You are 90%+ confident the reply fully resolves the question.

Otherwise set should_reply=false and let a human handle it.

Tone: friendly, concise (under 150 words), use the user's first name if available, sign off as "The HomeHero Team". Markdown allowed (links, lists).

SITE KNOWLEDGE:
${SITE_KNOWLEDGE}`,
          },
          {
            role: "user",
            content: `From: ${msg.name} <${msg.email}>\nSubject: ${msg.subject}\n\n${msg.body}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "triage_response",
              description: "Decide whether to auto-reply and draft the reply if so.",
              parameters: {
                type: "object",
                properties: {
                  should_reply: {
                    type: "boolean",
                    description: "True only if highly confident answer is in site knowledge.",
                  },
                  confidence: {
                    type: "number",
                    description: "0-1 confidence score.",
                  },
                  reason: {
                    type: "string",
                    description: "Brief reason for the decision.",
                  },
                  reply_subject: { type: "string" },
                  reply_body: {
                    type: "string",
                    description: "Markdown reply body. Empty if should_reply is false.",
                  },
                },
                required: ["should_reply", "confidence", "reason", "reply_subject", "reply_body"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "triage_response" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI failed", status: aiResp.status }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.log("No tool call returned, skipping auto-reply");
      return new Response(JSON.stringify({ should_reply: false, reason: "no tool call" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log("Triage result:", { confidence: result.confidence, should_reply: result.should_reply, reason: result.reason });

    if (!result.should_reply || result.confidence < 0.9) {
      return new Response(JSON.stringify({ should_reply: false, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find a system "AI Assistant" sender — use the user themselves as recipient,
    // sender_id = the message author so it appears as a reply from HomeHero.
    // We use the user's own id for sender to satisfy RLS-free service insert.
    // For UX, set sender_id to recipient_id so the user sees a self-addressed reply
    // is not ideal — instead, we'll insert with the user's id as both is wrong too.
    // Best approach: use service role to insert with sender_id = recipient_id (self),
    // OR pick a designated admin user. We'll use the user's id as sender of an "AI reply"
    // is misleading. Instead: pick any admin as sender.

    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();

    const senderId = adminRole?.user_id ?? msg.user_id;

    // Insert reply into messages inbox
    const { error: insertErr } = await supabase.from("messages").insert({
      sender_id: senderId,
      recipient_id: msg.user_id,
      subject: result.reply_subject || `Re: ${msg.subject}`,
      body: `🤖 *Automated reply from HomeHero AI Assistant*\n\n${result.reply_body}\n\n---\n*If this didn't fully answer your question, just reply and a human will follow up within 48 hours.*`,
      read: false,
    });

    if (insertErr) {
      console.error("Failed to insert reply message:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to send reply" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark contact message as auto-replied
    await supabase
      .from("contact_messages")
      .update({
        status: "auto_replied",
        replied_at: new Date().toISOString(),
        replied_by: senderId,
      })
      .eq("id", messageId);

    return new Response(
      JSON.stringify({ should_reply: true, confidence: result.confidence }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("contact-auto-reply error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
