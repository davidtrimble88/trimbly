import { describe, it, expect } from "vitest";
import { getClientKey, rateLimit } from "../../supabase/functions/_shared/rateLimit";

function reqWith(headers: Record<string, string>): Request {
  return new Request("https://example.com", { headers });
}

describe("getClientKey", () => {
  it("prefers cf-connecting-ip when present, since it can't be client-spoofed", () => {
    const req = reqWith({ "cf-connecting-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9" });
    expect(getClientKey(req)).toBe("1.2.3.4");
  });

  it("uses the LAST entry of x-forwarded-for, not the first (regression: XFF spoofing bypass)", () => {
    // A caller can prepend any fake IP it wants to x-forwarded-for, but a
    // well-behaved proxy appends the real client IP as the last hop. Taking
    // the first entry let a caller spoof a fresh value on every request and
    // reset their own rate-limit bucket at will — this is the actual bug.
    const req = reqWith({ "x-forwarded-for": "9.9.9.9, 8.8.8.8, 5.6.7.8" });
    expect(getClientKey(req)).toBe("5.6.7.8");
  });

  it("falls back to 'unknown' with no identifying headers at all", () => {
    expect(getClientKey(reqWith({}))).toBe("unknown");
  });
});

describe("rateLimit", () => {
  it("allows requests up to the limit, then blocks", () => {
    const key = `test-key-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, { limit: 3, windowMs: 60_000 }).ok).toBe(true);
    }
    expect(rateLimit(key, { limit: 3, windowMs: 60_000 }).ok).toBe(false);
  });

  it("tracks separate buckets per key", () => {
    const a = `test-a-${Math.random()}`;
    const b = `test-b-${Math.random()}`;
    expect(rateLimit(a, { limit: 1 }).ok).toBe(true);
    expect(rateLimit(a, { limit: 1 }).ok).toBe(false);
    expect(rateLimit(b, { limit: 1 }).ok).toBe(true);
  });
});
