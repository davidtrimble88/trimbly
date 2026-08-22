// Simple in-memory IP-based rate limiter for Edge Functions.
// Per-instance only — fine as a first line of defense against scraping/abuse.
// For stricter limits, replace with a Redis/Upstash-backed implementation.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  /** Max requests per window per key. Default 20. */
  limit?: number;
  /** Window in milliseconds. Default 60_000 (1 minute). */
  windowMs?: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function getClientKey(req: Request): string {
  // cf-connecting-ip is set directly by Cloudflare from the TCP connection and
  // can't be spoofed by the client, so it's the most trustworthy signal when
  // present. x-forwarded-for is client-appendable — a caller can prepend any
  // fake IP it wants — but well-behaved proxies APPEND the real client IP as
  // the last hop, so the last entry (not the first) is the one our own edge
  // actually saw. Taking the first entry let a caller spoof a fresh value on
  // every request and reset their own rate-limit bucket at will.
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const fwd = req.headers.get("x-forwarded-for") || "";
  const parts = fwd.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : "unknown";
}

export function rateLimit(key: string, opts: RateLimitOptions = {}): RateLimitResult {
  const limit = opts.limit ?? 20;
  const windowMs = opts.windowMs ?? 60_000;
  const now = Date.now();

  // Periodic cleanup to avoid unbounded growth
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAt < now) {
    const fresh = { count: 1, resetAt: now + windowMs };
    buckets.set(key, fresh);
    return { ok: true, remaining: limit - 1, resetAt: fresh.resetAt };
  }

  existing.count++;
  if (existing.count > limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }
  return { ok: true, remaining: Math.max(0, limit - existing.count), resetAt: existing.resetAt };
}

export function rateLimitResponse(result: RateLimitResult, corsHeaders: Record<string, string>): Response {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return new Response(
    JSON.stringify({ error: "Too many requests. Please slow down and try again shortly." }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}
