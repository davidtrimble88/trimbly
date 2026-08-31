// Sends the actual email for one Pro Outreach draft (pending_messages row).
// The staff Outreach page could only generate/queue drafts and let staff
// mark them "contacted" by hand — this is the missing send step, wired to
// the same Resend account and unsubscribe mechanism already used elsewhere,
// so a recipient who opts out here is honored across all Trimbly email.
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/sendEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Must match unsubscribe/index.ts's token scheme exactly — it's the same
// link being generated here and verified there.
async function unsubscribeToken(email: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(email));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/[+/=]/g, "").substring(0, 32);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userJwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!userJwt) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${userJwt}` } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Must match roles.ts's outreach: ["admin", "support"] — the page itself
    // is visible to support staff, not analysts, so the function's gate has
    // to allow the same roles or support staff hit a 403 on Send.
    const { data: roles } = await authClient.from("user_roles").select("role").eq("user_id", user.id);
    const allowed = (roles || []).some((r: any) => r.role === "admin" || r.role === "support");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { pendingMessageId } = await req.json();
    if (!pendingMessageId) {
      return new Response(JSON.stringify({ error: "pendingMessageId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: msg, error: fetchError } = await admin
      .from("pending_messages")
      .select("*")
      .eq("id", pendingMessageId)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!msg) {
      return new Response(JSON.stringify({ error: "Outreach draft not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const email = (msg.email || "").trim().toLowerCase();
    if (!email) {
      return new Response(JSON.stringify({ error: "This draft has no recipient email set yet" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: optedOut } = await admin
      .from("email_optouts")
      .select("email")
      .eq("email", email)
      .maybeSingle();
    if (optedOut) {
      return new Response(JSON.stringify({ error: `${email} has opted out of Trimbly outreach email — not sending` }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const secret = Deno.env.get("UNSUBSCRIBE_HMAC_SECRET") || SERVICE_KEY;
    const token = await unsubscribeToken(email, secret);
    const unsubscribeUrl = `${SUPABASE_URL}/functions/v1/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;

    // CAN-SPAM requires a valid physical postal address on every commercial
    // email — BUSINESS_MAILING_ADDRESS must be set as a Supabase secret
    // before this function is used for real sends. Refusing to send without
    // it is safer than silently omitting a legally required line.
    const mailingAddress = Deno.env.get("BUSINESS_MAILING_ADDRESS");
    if (!mailingAddress) {
      return new Response(JSON.stringify({ error: "BUSINESS_MAILING_ADDRESS secret is not set — required by CAN-SPAM on every commercial email, refusing to send until it's configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bodyHtml = escapeHtml(msg.body).replace(/\n/g, "<br>");
    const html = `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p>${bodyHtml}</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 16px;">
  <p style="font-size: 12px; color: #9ca3af; line-height: 1.6;">
    You're receiving this because a Trimbly homeowner tried to reach ${escapeHtml(msg.provider_name)} through Trimbly.<br>
    ${escapeHtml(mailingAddress)}<br>
    <a href="${unsubscribeUrl}" style="color: #9ca3af;">Unsubscribe from Trimbly outreach email</a>
  </p>
</body>
</html>`;

    const result = await sendEmail({ to: email, subject: msg.subject || `A Trimbly homeowner wants to hire ${msg.provider_name}`, html });
    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error || "Send failed" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("pending_messages").update({ status: "contacted" }).eq("id", pendingMessageId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-outreach-email error:", err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
