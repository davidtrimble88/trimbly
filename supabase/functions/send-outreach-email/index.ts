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
    const providerNameHtml = escapeHtml(msg.provider_name);
    const preheader = `A Trimbly homeowner wants to hire ${providerNameHtml} — free to join during our beta, no card required.`;

    // Real feature copy pulled from src/lib/pricingTiers.ts's providerTiers —
    // keep these two lists in sync so the email never promises something the
    // product doesn't do. Every item here is normally Free or Pro ($29/mo),
    // both unlocked at no cost while BETA_FREE_ACCESS is true.
    const features = [
      ["Unlimited bids", "no 5-per-month cap while you're on the free plan"],
      ["Priority search placement", "normally a $29/mo Pro feature — free now"],
      ["AI Message Copilot &amp; follow-ups", "normally a $29/mo Pro feature — free now"],
      ["Business profile + local SEO microsite", "so nearby homeowners can find you"],
      ["In-app messaging, reviews &amp; ratings", "no phone tag, everything in one place"],
      ["Verified Pro &amp; response-time badges", "stand out once you're verified"],
    ];
    const featureRows = features.map(([title, detail]) => `
                <tr>
                  <td width="26" valign="top" style="padding:0 8px 16px 0;">
                    <span style="display:inline-block;width:18px;height:18px;background-color:#114F39;border-radius:50%;text-align:center;line-height:18px;color:#ffffff;font-size:11px;font-family:Arial,Helvetica,sans-serif;">&#10003;</span>
                  </td>
                  <td valign="top" style="padding:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#16241D;">
                    <strong>${title}</strong> — ${detail}
                  </td>
                </tr>`).join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${providerNameHtml}, a homeowner wants to hire you on Trimbly</title>
</head>
<body style="margin:0;padding:0;background-color:#FAF8F5;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#FAF8F5;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF8F5;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background-color:#114F39;padding:28px 40px;">
              <table role="presentation" width="100%"><tr>
                <td style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Trimbly</td>
                <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#bfe0cf;">Home &amp; Vehicle Care, Simplified</td>
              </tr></table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#F0780F;padding:10px 40px;text-align:center;">
              <span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#ffffff;letter-spacing:0.5px;text-transform:uppercase;">Now in Public Beta &mdash; Every Feature Free</span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;font-family:Arial,Helvetica,sans-serif;color:#16241D;">
              <p style="margin:0 0 20px;font-size:16px;line-height:1.6;">Hi ${providerNameHtml},</p>
              <table role="presentation" width="100%" style="background-color:#EEF4F0;border-left:4px solid #114F39;border-radius:8px;margin:0 0 28px;">
                <tr>
                  <td style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#16241D;">
                    ${bodyHtml}
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%"><tr>
                <td align="center" style="padding:0 0 12px;">
                  <a href="https://trimblyhome.com/pro-register" style="background-color:#F0780F;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;display:inline-block;">Claim Your Free Pro Profile &rarr;</a>
                </td>
              </tr></table>
              <p style="text-align:center;font-size:12px;color:#6b7d73;margin:0 0 32px;">No credit card. No contracts. Free for the entire beta.</p>
              <hr style="border:none;border-top:1px solid #eee5d8;margin:0 0 28px;">
              <h2 style="font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#114F39;margin:0 0 16px;">What you get, free during beta:</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${featureRows}
              </table>
              <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#4a5a50;">Trimbly connects homeowners directly with vetted local pros &mdash; like the one who's already looking for you above. Setup takes about 5 minutes.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#F4F1EA;padding:28px 40px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:#8a9990;text-align:center;">
              You're receiving this because a Trimbly homeowner tried to reach ${providerNameHtml} through Trimbly.<br>
              ${escapeHtml(mailingAddress)}<br>
              <a href="${unsubscribeUrl}" style="color:#8a9990;">Unsubscribe from Trimbly outreach email</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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
