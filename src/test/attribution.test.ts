import { describe, it, expect, beforeEach } from "vitest";
import { captureAttribution, getAttributionForSignup } from "@/lib/attribution";

function visit(url: string, referrer = "") {
  window.history.pushState({}, "", url);
  Object.defineProperty(document, "referrer", { value: referrer, configurable: true });
  captureAttribution();
}

describe("signup attribution", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, "", "/");
    Object.defineProperty(document, "referrer", { value: "", configurable: true });
  });

  it("records UTM tags and a click id from a tagged link", () => {
    visit("/?utm_source=partnernet&utm_medium=cpa&utm_campaign=fall&click_id=abc123");
    expect(getAttributionForSignup()).toMatchObject({
      attr_source: "partnernet",
      attr_medium: "cpa",
      attr_campaign: "fall",
      attr_click_id: "abc123",
      attr_landing_path: "/",
    });
  });

  it("falls back to the referring site when there are no UTM tags", () => {
    visit("/pricing", "https://www.facebook.com/groups/123");
    expect(getAttributionForSignup()).toMatchObject({
      attr_source: "www.facebook.com",
      attr_medium: "referral",
      attr_landing_path: "/pricing",
    });
  });

  it("labels untagged direct visits as direct", () => {
    visit("/");
    expect(getAttributionForSignup()).toMatchObject({ attr_source: "direct", attr_medium: "none" });
  });

  it("keeps the first touch and ignores later visits", () => {
    visit("/?utm_source=first");
    visit("/?utm_source=second");
    expect(getAttributionForSignup().attr_source).toBe("first");
  });

  it("never stores the query string or caps long values", () => {
    visit(`/path?utm_source=${"x".repeat(300)}&secret=1`);
    const a = getAttributionForSignup();
    expect(a.attr_source.length).toBe(100);
    expect(JSON.stringify(a)).not.toContain("secret");
  });

  it("stores and sends nothing when cookies were rejected", () => {
    localStorage.setItem("hh_cookie_consent_v1", "reject");
    visit("/?utm_source=partnernet");
    expect(getAttributionForSignup()).toEqual({});
  });
});
