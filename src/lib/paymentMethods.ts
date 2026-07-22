export interface PaymentMethodDef {
  key: string;
  label: string;
  /** Whether this method has an optional handle/link field (e.g. a Venmo @handle) */
  hasHandle: boolean;
  handlePlaceholder?: string;
  handleHint?: string;
  /** Builds a clickable URL from the stored handle, if applicable. */
  buildLink?: (handle: string) => string | null;
}

const stripLeading = (s: string, chars: string) => {
  let out = s.trim();
  for (const c of chars) {
    if (out.startsWith(c)) out = out.slice(1);
  }
  return out;
};

export const PAYMENT_METHODS: PaymentMethodDef[] = [
  { key: "cash", label: "Cash", hasHandle: false },
  { key: "check", label: "Check", hasHandle: false },
  { key: "card_reader", label: "Card (in person)", hasHandle: false },
  {
    key: "venmo", label: "Venmo", hasHandle: true,
    handlePlaceholder: "@your-handle", handleHint: "Your Venmo @handle",
    buildLink: (h) => { const u = stripLeading(h, "@"); return u ? `https://venmo.com/u/${encodeURIComponent(u)}` : null; },
  },
  {
    key: "cashapp", label: "Cash App", hasHandle: true,
    handlePlaceholder: "$your-cashtag", handleHint: "Your Cash App $cashtag",
    buildLink: (h) => { const u = stripLeading(h, "$"); return u ? `https://cash.app/$${encodeURIComponent(u)}` : null; },
  },
  {
    key: "paypal", label: "PayPal", hasHandle: true,
    handlePlaceholder: "your-paypal-name", handleHint: "Your PayPal.me username",
    buildLink: (h) => { const u = stripLeading(h, "@"); return u ? `https://paypal.me/${encodeURIComponent(u)}` : null; },
  },
  {
    key: "zelle", label: "Zelle", hasHandle: true,
    handlePlaceholder: "email or phone number", handleHint: "The email or phone your Zelle is registered to",
    buildLink: () => null, // Zelle has no public payment-link page; shown as copyable text instead.
  },
];

export const PAYMENT_METHOD_MAP: Record<string, PaymentMethodDef> = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.key, m])
);
