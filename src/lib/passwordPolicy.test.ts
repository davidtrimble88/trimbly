import { describe, it, expect } from "vitest";
import { validatePassword, PASSWORD_MIN } from "./passwordPolicy";

describe("validatePassword", () => {
  it("accepts a reasonable password", () => {
    expect(validatePassword("Xk7mQp2vLr9z")).toBeNull();
  });

  it("rejects passwords shorter than the minimum", () => {
    expect(validatePassword("a1")).toContain(`${PASSWORD_MIN} characters`);
  });

  it("requires at least one letter and one number", () => {
    expect(validatePassword("12345678")).toMatch(/letter/);
    expect(validatePassword("abcdefgh")).toMatch(/number/);
  });

  it("rejects triple-repeated characters", () => {
    expect(validatePassword("aaa12345")).toMatch(/repeating/);
  });

  it("rejects simple sequences", () => {
    expect(validatePassword("abcd1234")).toMatch(/sequence/);
  });

  it("rejects common weak passwords, including leetspeak variants", () => {
    expect(validatePassword("password1")).toMatch(/common/);
    expect(validatePassword("p4ssw0rd1")).toMatch(/common/);
  });
});
