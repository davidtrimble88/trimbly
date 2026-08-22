// Proxies a remote PDF (or document) through our domain so it can be
// viewed/downloaded in-app without linking the user to a 3rd-party site.
// Deliberately open to arbitrary internet URLs (manuals come from all
// over the web via find-manual search results, not a fixed set of
// domains) — so it's rate-limited and blocks requests aimed at
// internal/private network addresses instead of an allowlist.
import { rateLimit, rateLimitResponse, getClientKey } from "../_shared/rateLimit.ts";

const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "application/octet-stream",
  "application/x-pdf",
];

// Blocks the obvious SSRF targets: loopback, link-local (incl. cloud
// metadata endpoints like 169.254.169.254), and RFC1918 private ranges.
function isPrivateHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h === "0.0.0.0") return true;
  if (h === "::1") return true;
  // IPv4 literal checks
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 127) return true; // loopback
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
  }
  return false;
}

async function isPrivateTarget(hostname: string): Promise<boolean> {
  if (isPrivateHostname(hostname)) return true;
  try {
    const records = await Deno.resolveDns(hostname, "A");
    return records.some(isPrivateHostname);
  } catch {
    // If it doesn't resolve as A, let the fetch below fail naturally rather
    // than blocking (e.g. AAAA-only hosts) — this is a best-effort guard,
    // not a substitute for network-level egress controls.
    return false;
  }
}

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rl = rateLimit(`manual-proxy:${getClientKey(req)}`, { limit: 30, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl, corsHeaders);

  try {
    const url = new URL(req.url);
    const target = url.searchParams.get("url");
    const mode = url.searchParams.get("mode") || "inline"; // "inline" or "download"
    const filename = url.searchParams.get("filename") || "user-manual.pdf";

    if (!target) {
      return new Response(JSON.stringify({ error: "Missing 'url' parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: URL;
    try {
      parsed = new URL(target);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return new Response(JSON.stringify({ error: "Only http(s) URLs allowed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Re-check on every hop, manually — fetch's own redirect:"follow" would
    // happily follow a redirect from an allowed URL straight to an internal
    // address, bypassing the check above entirely.
    let current = parsed;
    let upstream: Response | null = null;
    for (let hop = 0; hop < 5; hop++) {
      if (await isPrivateTarget(current.hostname)) {
        return new Response(JSON.stringify({ error: "This URL can't be proxied" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      upstream = await fetch(current.toString(), {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; Trimbly/1.0; +https://trimbly.app)",
          Accept: "application/pdf,*/*;q=0.8",
        },
        redirect: "manual",
      });
      if (upstream.status >= 300 && upstream.status < 400) {
        const location = upstream.headers.get("location");
        if (!location) break;
        try {
          current = new URL(location, current);
        } catch {
          break;
        }
        if (current.protocol !== "http:" && current.protocol !== "https:") break;
        continue;
      }
      break;
    }

    if (!upstream || !upstream.ok || !upstream.body) {
      return new Response(
        JSON.stringify({ error: upstream ? `Upstream returned ${upstream.status}` : "Could not reach that URL" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contentType = upstream.headers.get("content-type") || "application/pdf";
    const isPdfLike =
      ALLOWED_CONTENT_TYPES.some((t) => contentType.toLowerCase().includes(t)) ||
      /\.pdf(\?|$)/i.test(current.pathname);

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
    const finalName = safeName.toLowerCase().endsWith(".pdf") ? safeName : `${safeName}.pdf`;

    const headers = new Headers({
      ...corsHeaders,
      "Content-Type": isPdfLike ? "application/pdf" : contentType,
      "Content-Disposition": `${mode === "download" ? "attachment" : "inline"}; filename="${finalName}"`,
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    });

    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);

    return new Response(upstream.body, { status: 200, headers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("manual-proxy error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
