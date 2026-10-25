// Shared by create-gift-checkout (validates the order, prices it) and
// stripe-webhook (generates the codes, sends the emails). The price lives here
// on the server; src/lib/gift.ts only displays it.

export const GIFT_PRICE_CENTS = 4900; // one year of Home Hero ($5/mo list = $60/yr)
export const GIFT_MAX_QUANTITY = 10;
export const GIFT_NOTE_MAX = 300; // Stripe metadata values cap at 500 characters

// No 0/O, 1/I/L: codes get read off a card or an email and typed in by hand.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** GIFT-XXXX-XXXX-XXXX, 12 random characters (~59 bits) from crypto.getRandomValues. */
export function generateGiftCode(): string {
  const limit = 256 - (256 % CODE_ALPHABET.length); // rejection sampling keeps every character equally likely
  const chars: string[] = [];
  while (chars.length < 12) {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    for (const b of bytes) {
      if (b < limit && chars.length < 12) chars.push(CODE_ALPHABET[b % CODE_ALPHABET.length]);
    }
  }
  const s = chars.join("");
  return `GIFT-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Single-line text with control characters removed, for names that end up in a subject line. */
export function cleanLine(s: string | null | undefined, max: number): string {
  // eslint-disable-next-line no-control-regex
  return (s ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, max);
}

export function isEmail(s: string): boolean {
  return s.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s);
}

function shell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0; padding:0; background:#f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 520px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="background: #0c4a76; padding: 20px 24px;">
        <h1 style="color: #ffffff; margin: 0; font-size: 18px;">Trimbly</h1>
      </div>
      <div style="padding: 24px;">
        <p style="color: #111827; font-size: 18px; font-weight: 600; margin: 0 0 12px;">${title}</p>
        ${bodyHtml}
      </div>
    </div>
    <p style="color:#6b7280; font-size:12px; text-align:center; margin:16px 0 0;">Questions? Reply to this email or write office@trimblyhome.com.</p>
  </div>
</body>
</html>`;
}

function codeBlock(code: string, siteUrl: string): string {
  const link = `${siteUrl}/redeem-gift?code=${encodeURIComponent(code)}`;
  const card = `${siteUrl}/gift-card?code=${encodeURIComponent(code)}`;
  return `<div style="margin:12px 0; padding:14px 16px; background:#eef6fc; border-radius:8px;">
    <div style="font-family: 'SFMono-Regular', Consolas, monospace; font-size:20px; letter-spacing:1px; color:#0c4a76; font-weight:700;">${escapeHtml(code)}</div>
    <a href="${escapeHtml(link)}" style="display:inline-block; margin-top:8px; font-size:14px; color:#1476c4;">Redeem this code</a>
    <span style="color:#9ca3af;"> &nbsp;|&nbsp; </span>
    <a href="${escapeHtml(card)}" style="display:inline-block; margin-top:8px; font-size:14px; color:#1476c4;">Print or share the gift card</a>
  </div>`;
}

export function renderBuyerEmail(opts: {
  codes: string[];
  recipientEmail: string | null;
  recipientName: string | null;
  siteUrl: string;
}): { subject: string; html: string } {
  const { codes, recipientEmail, recipientName, siteUrl } = opts;
  const plural = codes.length > 1;
  const sent = recipientEmail
    ? `We also emailed ${escapeHtml(recipientName || recipientEmail)} their gift. `
    : "";
  const body = `
    <p style="color:#374151; font-size:15px; line-height:1.6; margin:0 0 8px;">Thank you for your gift. ${sent}Here ${plural ? "are your codes" : "is your code"}. Each one gives one homeowner a full year of Trimbly Home Hero, starting the day they redeem it.</p>
    ${codes.map((c) => codeBlock(c, siteUrl)).join("")}
    <p style="color:#374151; font-size:15px; line-height:1.6; margin:16px 0 0;">To give ${plural ? "one" : "it"} in person, open "Print or share the gift card" above: it is a one-page card with your note, what Trimbly does for a homeowner, and the code, ready to print, save as a PDF, or forward. The recipient creates a free Trimbly account (or signs in), enters the code, and Home Hero turns on. Each code works once and is good for redemption for two years.</p>
  `;
  return {
    subject: plural ? `Your ${codes.length} Trimbly gift codes` : "Your Trimbly gift code",
    html: shell(plural ? "Your gift codes are ready" : "Your gift code is ready", body),
  };
}

export function renderRecipientEmail(opts: {
  code: string;
  buyerName: string | null;
  note: string | null;
  siteUrl: string;
}): { subject: string; html: string } {
  const { code, buyerName, note, siteUrl } = opts;
  const from = buyerName ? escapeHtml(buyerName) : "Someone";
  const noteHtml = note
    ? `<blockquote style="margin:12px 0; padding:12px 16px; border-left:4px solid #4cb85a; background:#f3faf4; color:#1f2937; font-size:15px; line-height:1.6; white-space:pre-wrap;">${escapeHtml(note)}</blockquote>`
    : "";
  const body = `
    <p style="color:#374151; font-size:15px; line-height:1.6; margin:0 0 8px;">${from} gave you a year of Trimbly Home Hero, the app that keeps track of everything your home needs: maintenance reminders, repair-cost estimates, a digital home binder, and local pros.</p>
    ${noteHtml}
    ${codeBlock(code, siteUrl)}
    <p style="color:#374151; font-size:15px; line-height:1.6; margin:16px 0 0;">Create a free account (or sign in), enter the code, and Home Hero turns on for 12 months. Nothing to buy and no card needed.</p>
  `;
  return {
    subject: `${cleanLine(buyerName, 60) || "Someone"} gave you a year of Trimbly Home Hero`,
    html: shell("You have a gift", body),
  };
}
