import { z } from "zod";

// Display copy for the gift page. The price that is actually charged is
// GIFT_PRICE_CENTS in supabase/functions/_shared/gift.ts; keep the two in step.
export const GIFT_PRICE_USD = 49;
export const GIFT_LIST_PRICE_USD = 60; // Home Hero is $5/mo
export const GIFT_MAX_QUANTITY = 10;
export const GIFT_NOTE_MAX = 300;

export const giftOrderSchema = z
  .object({
    buyerName: z.string().trim().max(80),
    buyerEmail: z.string().trim().email("Enter a valid email so we can send the code").max(254),
    quantity: z.number().int().min(1).max(GIFT_MAX_QUANTITY),
    recipientName: z.string().trim().max(80),
    recipientEmail: z.union([z.literal(""), z.string().trim().email("That recipient email doesn't look right").max(254)]),
    note: z.string().max(GIFT_NOTE_MAX),
  })
  .refine((v) => v.quantity === 1 || v.recipientEmail === "", {
    message: "Recipient email is only for a single gift",
    path: ["recipientEmail"],
  });

export type GiftOrder = z.infer<typeof giftOrderSchema>;

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
