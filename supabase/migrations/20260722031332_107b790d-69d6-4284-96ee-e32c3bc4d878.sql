-- Purely informational "how to pay me" info a pro can list on their profile —
-- Trimbly never processes, touches, or records whether payment actually
-- happened. This is a business-card-style listing, not a payment integration.
ALTER TABLE public.providers
  ADD COLUMN payment_methods TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN payment_handles JSONB NOT NULL DEFAULT '{}'::jsonb;

-- The providers table restricts anon (logged-out) access to an explicit
-- column allow-list (see the "restrict sensitive columns from anon role"
-- migration) — any new column is invisible to anon until granted here.
-- Unlike phone, this is meant to be fully public (shown to anyone scanning a
-- yard-sign QR code, no login required), so grant it explicitly.
GRANT SELECT (payment_methods, payment_handles) ON public.providers TO anon;