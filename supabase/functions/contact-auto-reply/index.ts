import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 3;

const SITE_KNOWLEDGE = `
Trimbly is a platform connecting homeowners with local home-service professionals (handymen, plumbers, electricians, etc.) and providing AI-driven home maintenance tools.

CORE FEATURES:
- Dashboard (/dashboard): Central hub for homeowners, summary of homes, tasks, messages.
- Maintenance Autopilot (/maintenance): Auto-generated seasonal maintenance schedule per home. Free tier gets basic schedule; Pro gets advanced reminders and product suggestions.
- Digital Home Binder (/binder): Track appliances, warranties, serial numbers, receipts. Free tier: 0 items. Pro: 5 items. Home Super Hero: unlimited.
- Find Pros / Search (/search): Browse and message local providers. AI-powered search.
- AI Job Estimator (/estimator): Pro-only. Upload a photo + description, get cost estimate and DIY-vs-Pro recommendation.
- Coverage Advisor (/coverage): Pro-only. Upload warranty/insurance docs, AI tells you what's covered.
- Post a Job (/post-job): Homeowners post project requests; pros bid on them.
- Messages (/messages): In-app chat with providers. Phone numbers require explicit approval (privacy-first).
- For Pros: Providers register at /pro-register, manage listings, bid on jobs at /job-board.

SUBSCRIPTION TIERS (homeowners):
- Free: 1 home, basic maintenance schedule, browse pros, message pros, post jobs.
- Pro: 1 home, full features (Estimator, Coverage Advisor, Binder up to 5 items, advanced maintenance).
- Home Super Hero: up to 10 homes, unlimited binder items, all Pro features.
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

interface TriageResult {
  should_reply: boolean;
  confidence: number;
  reason: string;
  reply_subject: string;
  reply_body: string;
}

async function callAI(
  contactMsg: any,
  prevTurns: { role: string; content: string }[]
): Promise<TriageResult | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

  const messages = [
    {
      role: "system",
      content: `You are a careful support triage AI for Trimbly. Decide if you can confidently answer the user's question using ONLY the provided site knowledge.

Reply ONLY when ALL of these are true:
1. The question is directly about Trimbly (the site, its features, pricing, account, how-to).
2. The answer is unambiguously contained in the site knowledge below.
3. There is NO billing dispute, refund request, bug report needing investigation, complaint, or anything requiring a human.
4. You are 90%+ confident the reply fully resolves the question.

If the user previously said your last reply was NOT helpful, you'll see their follow-up details. Use those to give a better, more specific answer. If you still cannot confidently answer, set should_reply=false.

Tone: friendly, concise (under 150 words), use the user's first name if available, sign off as "The Trimbly Team". Markdown allowed (links, lists).

SITE KNOWLEDGE:
${SITE_KNOWLEDGE}`,
    },
    {
      role: "user",
      content: `From: ${contactMsg.name} <${contactMsg.email}>\nSubject: ${contactMsg.subject}\n\nOriginal question:\n${contactMsg.body}`,
    },
    ...prevTurns,
  ];

  const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      tools: [
        {
          type: "function",
          function: {
            name: "triage_response",
            description: "Decide whether to auto-reply and draft the reply if so.",
            parameters: {
              type: "object",
              properties: {
                should_reply: { type: "boolean" },
                confidence: { type: "number" },
                reason: { type: "string" },
                reply_subject: { type: "string" },
                reply_body: { type: "string" },
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
    return null;
  }

  const aiData = await aiResp.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return null;
  return JSON.parse(toolCall.function.arguments);
}

async function getSenderId(supabase: any, fallbackUserId: string): Promise<string> {
  const { data: adminRole } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();
  return adminRole?.user_id ?? fallbackUserId;
}

async function escalateToStaff(supabase: any, contactMsg: any, reason: string) {
  await supabase
    .from("contact_messages")
    .update({ status: "escalated" })
    .eq("id", contactMsg.id);

  const senderId = await getSenderId(supabase, contactMsg.user_id);
  await supabase.from("messages").insert({
    sender_id: senderId,
    recipient_id: contactMsg.user_id,
    subject: `Re: ${contactMsg.subject}`,
    body: `Thanks for the extra detail! I'm handing this off to our human team — someone will reply within 48 hours.\n\n— The Trimbly Team`,
    contact_message_id: contactMsg.id,
    ai_meta: { kind: "escalation_notice", reason },
    read: false,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messageId, followUpDetails } = await req.json();
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

    // If status is resolved or escalated, do nothing
    if (msg.status === "resolved" || msg.status === "escalated" || msg.status === "replied") {
      return new Response(JSON.stringify({ skipped: true, reason: "already finalized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentAttempts = msg.ai_attempt_count ?? 0;

    // If user already used up all attempts, escalate
    if (currentAttempts >= MAX_ATTEMPTS) {
      await escalateToStaff(supabase, msg, "max attempts reached");
      return new Response(JSON.stringify({ escalated: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build conversation history from prior AI replies + user follow-ups
    const { data: priorMessages } = await supabase
      .from("messages")
      .select("sender_id, body, ai_meta, created_at")
      .eq("contact_message_id", messageId)
      .order("created_at", { ascending: true });

    const prevTurns: { role: string; content: string }[] = [];
    (priorMessages || []).forEach((m: any) => {
      if (m.ai_meta?.kind === "ai_reply") {
        prevTurns.push({ role: "assistant", content: m.body });
      } else if (m.sender_id === msg.user_id) {
        prevTurns.push({ role: "user", content: m.body });
      }
    });

    if (followUpDetails) {
      prevTurns.push({
        role: "user",
        content: `That wasn't quite what I needed. Here's more detail: ${followUpDetails}`,
      });

      // Persist the user's follow-up as a message in the thread
      await supabase.from("messages").insert({
        sender_id: msg.user_id,
        recipient_id: msg.user_id, // self — represents the follow-up note
        subject: `Re: ${msg.subject}`,
        body: followUpDetails,
        contact_message_id: messageId,
        ai_meta: { kind: "user_followup", attempt: currentAttempts },
        read: true,
      });
    }

    const result = await callAI(msg, prevTurns);
    const nextAttempt = currentAttempts + 1;

    if (!result || !result.should_reply || result.confidence < 0.9) {
      // Mark attempt and decide whether to escalate
      await supabase
        .from("contact_messages")
        .update({ ai_attempt_count: nextAttempt })
        .eq("id", messageId);

      if (nextAttempt >= MAX_ATTEMPTS) {
        await escalateToStaff(supabase, msg, result?.reason ?? "low confidence");
        return new Response(JSON.stringify({ escalated: true, attempts: nextAttempt }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ should_reply: false, attempts: nextAttempt, reason: result?.reason ?? "no AI response" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const senderId = await getSenderId(supabase, msg.user_id);

    const { error: insertErr } = await supabase.from("messages").insert({
      sender_id: senderId,
      recipient_id: msg.user_id,
      subject: result.reply_subject || `Re: ${msg.subject}`,
      body: result.reply_body,
      contact_message_id: messageId,
      ai_meta: {
        kind: "ai_reply",
        attempt: nextAttempt,
        confidence: result.confidence,
        awaiting_feedback: true,
      },
      read: false,
    });

    if (insertErr) {
      console.error("Failed to insert reply message:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to send reply" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("contact_messages")
      .update({
        status: "auto_replied",
        ai_attempt_count: nextAttempt,
        replied_at: new Date().toISOString(),
        replied_by: senderId,
      })
      .eq("id", messageId);

    return new Response(
      JSON.stringify({ should_reply: true, attempts: nextAttempt, confidence: result.confidence }),
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
