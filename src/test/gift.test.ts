import { describe, it, expect } from "vitest";
import {
  describeGiftError,
  emptyGift,
  formatGiftCode,
  giftOrderSchema,
  isGiftCode,
  resizeGifts,
} from "@/lib/gift";

const order = (quantity: number, overrides: Record<string, unknown> = {}) => ({
  buyerName: "Dana Keller",
  buyerEmail: "dana@example.com",
  quantity,
  note: "",
  gifts: Array.from({ length: quantity }, () => emptyGift()),
  ...overrides,
});

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
    const gifts = [{ recipientName: "Sam", recipientEmail: "new@home.com", note: "" }];
    expect(giftOrderSchema.safeParse(order(1, { gifts })).success).toBe(true);
  });

  it("accepts ten gifts, each with its own name, email and note", () => {
    const gifts = Array.from({ length: 10 }, (_, i) => ({
      recipientName: `Client ${i + 1}`,
      recipientEmail: `client${i + 1}@example.com`,
      note: `Note for client ${i + 1}`,
    }));
    expect(giftOrderSchema.safeParse(order(10, { gifts })).success).toBe(true);
  });

  it("accepts a mix of gifts with and without an email", () => {
    const gifts = [
      { recipientName: "Sam", recipientEmail: "sam@example.com", note: "" },
      { recipientName: "", recipientEmail: "", note: "" },
    ];
    expect(giftOrderSchema.safeParse(order(2, { gifts })).success).toBe(true);
  });

  it("rejects a bad buyer email", () => {
    expect(giftOrderSchema.safeParse(order(1, { buyerEmail: "nope" })).success).toBe(false);
  });

  it("rejects a bad recipient email and names the gift", () => {
    const gifts = [emptyGift(), { recipientName: "Pat", recipientEmail: "pat@", note: "" }];
    const result = giftOrderSchema.safeParse(order(2, { gifts }));
    expect(result.success).toBe(false);
    if (!result.success) expect(describeGiftError(result.error.issues[0])).toMatch(/^Gift 2:/);
  });

  it("needs exactly one line per gift", () => {
    expect(giftOrderSchema.safeParse(order(3, { gifts: [emptyGift()] })).success).toBe(false);
  });

  it("caps the quantity and every note", () => {
    expect(giftOrderSchema.safeParse(order(11)).success).toBe(false);
    expect(giftOrderSchema.safeParse(order(1, { note: "x".repeat(301) })).success).toBe(false);
    const gifts = [{ recipientName: "", recipientEmail: "", note: "x".repeat(301) }];
    expect(giftOrderSchema.safeParse(order(1, { gifts })).success).toBe(false);
  });
});

describe("resizeGifts", () => {
  it("keeps what was typed when the quantity grows or shrinks", () => {
    const start = [{ recipientName: "Sam", recipientEmail: "", note: "" }, { recipientName: "Alex", recipientEmail: "", note: "" }];
    const grown = resizeGifts(start, 4);
    expect(grown).toHaveLength(4);
    expect(grown[0].recipientName).toBe("Sam");
    expect(grown[3]).toEqual(emptyGift());
    expect(resizeGifts(grown, 1).map((g) => g.recipientName)).toEqual(["Sam"]);
  });
});
