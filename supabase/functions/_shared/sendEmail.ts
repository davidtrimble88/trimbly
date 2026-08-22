// Thin wrapper around Resend's HTTP API — no SDK dependency, just fetch.
// Used by any edge function that needs to send real transactional email
// (maintenance-reminders was the first; previously it just console.logged
// instead of sending). Requires RESEND_API_KEY to be set as a Supabase
// secret, and RESEND_FROM_EMAIL to be a verified sender/domain in Resend
// (defaults to Resend's shared test address, which only delivers to the
// Resend account's own verified email — fine for smoke-testing, not for
// real users, until a real domain is verified).

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export interface SendEmailResult {
  ok: boolean;
  error?: string;
}

export async function sendEmail({ to, subject, html, replyTo }: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.error("sendEmail: RESEND_API_KEY is not set — skipping send");
    return { ok: false, error: "Email not configured" };
  }
  const from = Deno.env.get("RESEND_FROM_EMAIL") || "Trimbly <onboarding@resend.dev>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`sendEmail: Resend returned ${res.status}: ${body}`);
      return { ok: false, error: `Resend error ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("sendEmail: request failed", err);
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
