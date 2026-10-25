import { z } from "zod";

// Display copy for the gift page. The price that is actually charged is
// GIFT_PRICE_CENTS in supabase/functions/_shared/gift.ts; keep the two in step.
export const GIFT_PRICE_USD = 49;
export const GIFT_LIST_PRICE_USD = 60; // Home Hero is $5/mo
export const GIFT_MAX_QUANTITY = 10;
export const GIFT_NOTE_MAX = 300;

/** What a year of Home Hero gets a new homeowner. Shown on the gift page and on the printable gift card. */
export const GIFT_HIGHLIGHTS = [
  "Digital Home Binder for receipts, manuals and warranties",
  "Maintenance Autopilot: reminders before things break",
  "AI Symptom Triage: what's wrong and what to do",
  "AI Job Estimator: repair-cost ranges before you call",
  "Coverage Advisor for warranty and insurance questions",
  "Local pros, bids and messaging in one place",
];

/** Path of the printable card for a code (the code is the key; it is never guessable). */
export function giftCardPath(code: string): string {
  return `/gift-card?code=${encodeURIComponent(code)}`;
}

/** One gift in an order: who it's for (all optional) and, if different from the order-wide note, its own note. */
export const giftItemSchema = z.object({
  recipientName: z.string().trim().max(80),
  recipientEmail: z.union([z.literal(""), z.string().trim().email("That email doesn't look right").max(254)]),
  note: z.string().max(GIFT_NOTE_MAX),
});

export const giftOrderSchema = z
  .object({
    buyerName: z.string().trim().max(80),
    buyerEmail: z.string().trim().email("Enter a valid email so we can send the code").max(254),
    quantity: z.number().int().min(1).max(GIFT_MAX_QUANTITY),
    /** Used by every gift that doesn't have its own note. */
    note: z.string().max(GIFT_NOTE_MAX),
    gifts: z.array(giftItemSchema).max(GIFT_MAX_QUANTITY),
  })
  .refine((v) => v.gifts.length === v.quantity, {
    message: "Each gift needs its own line",
    path: ["gifts"],
  });

export type GiftOrder = z.infer<typeof giftOrderSchema>;
export type GiftItem = z.infer<typeof giftItemSchema>;

export const emptyGift = (): GiftItem => ({ recipientName: "", recipientEmail: "", note: "" });

/** The gift list resized to `quantity`, keeping what was already typed. */
export function resizeGifts(gifts: GiftItem[], quantity: number): GiftItem[] {
  return Array.from({ length: quantity }, (_, i) => gifts[i] ?? emptyGift());
}

/** A readable message for the first problem zod found, naming the gift when it's a per-gift problem. */
export function describeGiftError(issue: { path: (string | number)[]; message: string }): string {
  if (issue.path[0] === "gifts" && typeof issue.path[1] === "number") {
    return `Gift ${issue.path[1] + 1}: ${issue.message}`;
  }
  return issue.message;
}

/** Normalizes what a person typed or pasted into the GIFT-XXXX-XXXX-XXXX form (leaves it alone if it can't). */
export function formatGiftCode(raw: string): string {
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = s.startsWith("GIFT") ? s.slice(4) : s;
  if (body.length !== 12) return raw.trim().toUpperCase();
  return `GIFT-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}`;
}

export function isGiftCode(raw: string): boolean {
  return /^GIFT[-\s]?[A-Z0-9]{4}[-\s]?[A-Z0-9]{4}[-\s]?[A-Z0-9]{4}$/i.test(raw.trim());
}
