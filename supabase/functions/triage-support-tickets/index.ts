// Staff-triggered AI pass over open support tickets: assigns a feature
// area, issue type, and urgency to each ticket, writes a one-line plain-
// English summary, and — critically — assigns a shared group key/label to
// tickets describing the same underlying issue so duplicates cluster
// together in the staff UI instead of being read one by one.
//
// All tickets in scope are sent to the model in a single batch (not one
// call per ticket) specifically so it has the cross-ticket context needed
// to detect duplicates and assign matching group keys.
import { createClient } from "npm:@supabase/supabase-js@2";
import { rateLimit, rateLimitResponse, getClientKey } from "../_shared/rateLimit.ts";
import { readJson, requireArray, validationErrorResponse } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_STATUSES = ["open", "in_progress"];
const ALLOWED_STATUSES = ["open", "in_progress", "resolved", "closed"];
// Beta-scale safety cap — comfortably above any realistic current ticket
// volume, but bounds the AI payload/cost if this ever runs unattended.
const MAX_TICKETS = 200;
const AREA_ENUM = [
  "account_auth", "billing_subscription", "home_binder", "coverage_advisor",
  "maintenance_scheduling", "garage_vehicles", "provider_job_matching",
  "messaging", "mobile_app_pwa", "discount_codes", "staff_admin",
  "performance_reliability", "other",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const rl = rateLimit(`triage-support-tickets:${getClientKey(req)}`, { limit: 5, windowMs: 5 * 60_000 });
  if (!rl.ok) return rateLimitResponse(rl, corsHeaders);

  let statuses: string[] = DEFAULT_STATUSES;
  try {
    const body = await readJson(req, 4 * 1024).catch(() => ({} as Record<string, unknown>));
    if (body.statuses !== undefined) {
      const raw = requireArray<string>(body.statuses, "statuses", { min: 1, max: ALLOWED_STATUSES.length });
      for (const s of raw) {
        if (!ALLOWED_STATUSES.includes(s)) throw new Error(`invalid status "${s}"`);
      }
      statuses = raw;
    }
  } catch (e) {
    return validationErrorResponse(e, corsHeaders);
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userJwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!userJwt) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Staff-only, mirroring staff-analytics: verify the caller's own JWT,
    // then check their role through that same RLS-scoped client before ever
    // touching the service-role client below.
    const authClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${userJwt}` } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: roles } = await authClient.from("user_roles").select("role").eq("user_id", user.id);
    const allowed = (roles || []).some((r: any) => r.role === "admin" || r.role === "support");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: ticketRows, error: ticketsErr } = await admin
      .from("support_tickets")
      .select("id, user_id, category, subject, body, status, created_at")
      .in("status", statuses)
      .order("created_at", { ascending: false })
      .limit(MAX_TICKETS + 1);
    if (ticketsErr) throw new Error(`Loading tickets: ${ticketsErr.message}`);

    const truncated = (ticketRows || []).length > MAX_TICKETS;
    const tickets = (ticketRows || []).slice(0, MAX_TICKETS);

    if (tickets.length === 0) {
      return new Response(JSON.stringify({ results: [], analyzedCount: 0, ticketsTotal: 0, truncated: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = [...new Set(tickets.map((t) => t.user_id))];
    const { data: profiles } = await admin.from("profiles").select("id, full_name, user_type").in("id", userIds);
    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    const ticketPayload = tickets.map((t) => {
      const p = profileMap.get(t.user_id);
      return {
        ticket_id: t.id,
        reporter_name: p?.full_name || "Unknown",
        reporter_type: p?.user_type || "unknown",
        self_reported_category: t.category,
        status: t.status,
        created_at: t.created_at,
        subject: t.subject,
        body: String(t.body || "").slice(0, 2000),
      };
    });

    const systemPrompt = `You are triaging support tickets for Trimbly, a home & vehicle maintenance app currently in public beta. Staff are being flooded with tickets and need them sorted, prioritized, and de-duplicated so they can hand a clean report to an engineer.

For EVERY ticket in the input, return one result with:
- area: the feature area it's actually about (best guess from: ${AREA_ENUM.join(", ")}).
- issue_type: "bug" (something is broken), "question" (how do I / why doesn't), "feature_request", "complaint" (works as built but user is unhappy), or "other".
- urgency:
  - "critical": data loss, security issue, broken payments/billing, or a core flow completely unusable.
  - "high": a real bug blocking a meaningful feature or workflow, or affecting what looks like many users.
  - "medium": a real but non-blocking bug, confusing UX, or a bug in a less-critical area.
  - "low": cosmetic issue, a question, a suggestion, or a one-off edge case.
  A provider/mechanic account (reporter_type "provider") losing the ability to earn or get jobs should generally be weighted more urgently than the same issue for a homeowner account, all else equal.
- summary: ONE plain-English sentence describing the actual underlying problem, stripped of pleasantries — written so someone who never read the raw ticket understands exactly what's wrong.
- group_key: a short kebab-case slug identifying the underlying issue (e.g. "vehicle-insurance-pdf-upload-fails"). Give tickets describing the SAME root problem the EXACT SAME group_key, even if worded very differently — this is how duplicates get merged. Give each genuinely distinct issue its own unique group_key.
- group_label: a short human-readable name for that issue group (e.g. "Vehicle insurance PDF upload fails to save"), shared by every ticket in that group.

Call the triage_tickets function with a "results" array containing exactly one entry per input ticket, in any order, each with the input ticket's ticket_id.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(ticketPayload) },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "triage_tickets",
              description: "Return triage results for a batch of support tickets",
              parameters: {
                type: "object",
                properties: {
                  results: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        ticket_id: { type: "string" },
                        area: { type: "string", enum: AREA_ENUM },
                        issue_type: { type: "string", enum: ["bug", "question", "feature_request", "complaint", "other"] },
                        urgency: { type: "string", enum: ["low", "medium", "high", "critical"] },
                        summary: { type: "string" },
                        group_key: { type: "string" },
                        group_label: { type: "string" },
                      },
                      required: ["ticket_id", "area", "issue_type", "urgency", "summary", "group_key", "group_label"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["results"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "triage_tickets" } },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call:", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "AI couldn't triage these tickets." }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const results: any[] = Array.isArray(parsed?.results) ? parsed.results : [];
    const validTicketIds = new Set(tickets.map((t) => t.id));
    const now = new Date().toISOString();

    const updates = results.filter((r) => validTicketIds.has(r.ticket_id));
    await Promise.all(updates.map((r) =>
      admin.from("support_tickets").update({
        ai_area: r.area,
        ai_issue_type: r.issue_type,
        ai_urgency: r.urgency,
        ai_summary: r.summary,
        ai_group_key: r.group_key,
        ai_group_label: r.group_label,
        ai_analyzed_at: now,
      }).eq("id", r.ticket_id)
    ));

    return new Response(JSON.stringify({
      results: updates,
      analyzedCount: updates.length,
      ticketsTotal: tickets.length,
      truncated,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("triage-support-tickets error:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
