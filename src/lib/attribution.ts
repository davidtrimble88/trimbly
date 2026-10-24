// First-touch signup attribution.
//
// On the first visit we remember where the visitor came from (UTM tags, an ad
// click id, the referring site and the landing page) and send it along when
// they create an account, so staff analytics can show signups by source.
//
// Privacy: first-party localStorage only, no third-party scripts, and we keep
// the referrer's hostname and the landing *path* (never the full URL or the
// query string). Nothing is stored if the visitor rejected cookies.

const STORAGE_KEY = "trimbly_attribution_v1";
const CONSENT_KEY = "hh_cookie_consent_v1"; // written by CookieConsent.tsx
const MAX_LEN = 100;

export type Attribution = {
  source: string;
  medium: string;
  campaign?: string;
  content?: string;
  term?: string;
  click_id?: string;
  landing_path?: string;
  referrer?: string;
};

// Ad networks use different names for the click id they append to the link.
const CLICK_ID_PARAMS = ["click_id", "clickid", "fbclid", "gclid", "ttclid", "msclkid"];

const clean = (v: string | null | undefined): string | undefined => {
  const t = (v ?? "").trim().slice(0, MAX_LEN);
  return t ? t : undefined;
};

function hasRejectedCookies(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === "reject";
  } catch {
    return false;
  }
}

function readStored(): Attribution | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}

/** Call once on app start. Only the first visit is recorded (first touch). */
export function captureAttribution(): void {
  if (typeof window === "undefined" || hasRejectedCookies()) return;
  try {
    if (readStored()) return;

    const params = new URLSearchParams(window.location.search);
    let referrer: string | undefined;
    try {
      const host = document.referrer ? new URL(document.referrer).hostname : "";
      if (host && host !== window.location.hostname) referrer = clean(host);
    } catch {
      // malformed referrer: ignore
    }

    const utmSource = clean(params.get("utm_source"));
    const clickId = CLICK_ID_PARAMS.map((k) => clean(params.get(k))).find(Boolean);

    const record: Attribution = {
      source: utmSource ?? referrer ?? "direct",
      medium: clean(params.get("utm_medium")) ?? (utmSource ? "unspecified" : referrer ? "referral" : "none"),
      campaign: clean(params.get("utm_campaign")),
      content: clean(params.get("utm_content")),
      term: clean(params.get("utm_term")),
      click_id: clickId,
      landing_path: clean(window.location.pathname),
      referrer,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // storage blocked (private mode etc.): attribution is best-effort
  }
}

/** Flat string map to merge into the sign-up metadata (prefixed with `attr_`). */
export function getAttributionForSignup(): Record<string, string> {
  if (hasRejectedCookies()) return {};
  const a = readStored();
  if (!a) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(a)) {
    if (typeof v === "string" && v) out[`attr_${k}`] = v;
  }
  return out;
}
