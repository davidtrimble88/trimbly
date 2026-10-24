import { describe, it, expect } from "vitest";
import { formatGiftCode, giftOrderSchema, isGiftCode } from "@/lib/gift";

const valid = {
  buyerName: "Dana Keller",
  buyerEmail: "dana@example.com",
  quantity: 1,
  recipientName: "",
  recipientEmail: "",
  note: "",
};

describe("gift codes", () => {
  it("recognizes a gift code however it was typed", () => {
    expect(isGiftCode("GIFT-ABCD-EFGH-JKMN")).toBe(true);
    expect(isGiftCode("  gift abcd efgh jkmn ")).toBe(true);
    expect(isGiftCode("HEXWOOD")).toBe(false);
  });

  it("reformats a pasted code into the stored shape", () => {
    expect(formatGiftCode("giftabcdefghjkmn")).toBe("GIFT-ABCD-EFGH-JKMN");
    expect(formatGiftCode("abcd efgh jkmn")).toBe("GIFT-ABCD-EFGH-JKMN");
  });

  it("leaves a non-gift code alone apart from case", () => {
    expect(formatGiftCode(" hexwood ")).toBe("HEXWOOD");
  });
});

describe("gift order form", () => {
  it("accepts a single gift with a recipient", () => {
    expect(giftOrderSchema.safeParse({ ...valid, recipientEmail: "new@home.com" }).success).toBe(true);
  });

  it("rejects a bad buyer email", () => {
    expect(giftOrderSchema.safeParse({ ...valid, buyerEmail: "nope" }).success).toBe(false);
  });

  it("only allows a recipient email on a single gift", () => {
    expect(giftOrderSchema.safeParse({ ...valid, quantity: 3, recipientEmail: "new@home.com" }).success).toBe(false);
    expect(giftOrderSchema.safeParse({ ...valid, quantity: 3 }).success).toBe(true);
  });

  it("caps the quantity and the note", () => {
    expect(giftOrderSchema.safeParse({ ...valid, quantity: 11 }).success).toBe(false);
    expect(giftOrderSchema.safeParse({ ...valid, note: "x".repeat(301) }).success).toBe(false);
  });
});
