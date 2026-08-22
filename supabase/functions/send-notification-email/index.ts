// Extends the email pipeline beyond maintenance-reminders to the other
// events useRealtimeNotifications.ts already surfaces as a toast + a
// persistent notification-center row: new message, new bid received, and
// bid accepted. Called by the client right alongside those, scoped to the
// CALLER'S OWN email only (never an arbitrary recipient) — the client
// already knows it's notifying itself, since it's reacting to a realtime
// event it just received.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { rateLimit, rateLimitResponse, getClientKey } from "../_shared/rateLimit.ts";
import { sendEmail } from "../_shared/sendEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type NotifyType = "message" | "bid_received" | "bid_accepted";

// Which notification_prefs column (if any) gates this type — bid_received
// has no dedicated column (push_new_job is "new job leads for pros", a
// different thing from "you got a bid on your posted job"), so it isn't
// gated and always sends.
const PREF_COLUMN: Partial<Record<NotifyType, "push_new_message" | "push_bid_accepted">> = {
  message: "push_new_message",
  bid_accepted: "push_bid_accepted",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function siteUrl() {
  return Deno.env.get("SITE_URL") || "https://trimbly.lovable.app";
}

function renderEmail(title: string, body: string, link?: string) {
  const url = link ? `${siteUrl()}${link}` : siteUrl();
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0; padding:0; background:#f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 480px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="background: #14532d; padding: 20px 24px;">
        <h1 style="color: #ffffff; margin: 0; font-size: 18px;">Trimbly</h1>
      </div>
      <div style="padding: 24px;">
        <p style="color: #111827; font-size: 16px; font-weight: 600; margin: 0 0 8px;">${title}</p>
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 20px; white-space: pre-wrap;">${body}</p>
        <a href="${url}" style="display: inline-block; padding: 10px 24px; background: #14532d; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
          Open Trimbly
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rl = rateLimit(`send-notification-email:${getClientKey(req)}`, { limit: 20, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl, corsHeaders);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userJwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!userJwt) return json({ error: "Unauthorized" }, 401);

    const authClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${userJwt}` } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user?.email) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const type = String(body.type || "") as NotifyType;
    const title = String(body.title || "").slice(0, 200);
    const notifyBody = String(body.body || "").slice(0, 500);
    const link = typeof body.link === "string" ? body.link.slice(0, 200) : undefined;

    if (!["message", "bid_received", "bid_accepted"].includes(type) || !title) {
      return json({ error: "Invalid request" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const prefColumn = PREF_COLUMN[type];
    if (prefColumn) {
      const { data: prefs } = await admin.from("notification_prefs").select(prefColumn).eq("user_id", user.id).maybeSingle();
      // No row yet = defaults (all on), matching the client's own default state.
      if (prefs && (prefs as Record<string, boolean>)[prefColumn] === false) {
        return json({ success: true, skipped: "opted_out" }, 200);
      }
    }

    const result = await sendEmail({
      to: user.email,
      subject: title,
      html: renderEmail(title, notifyBody, link),
    });

    return json({ success: result.ok, error: result.error }, 200);
  } catch (error) {
    console.error("send-notification-email error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
