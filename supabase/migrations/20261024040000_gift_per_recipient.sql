-- ============================================================================
-- One order, many personalized gifts.
--
-- A buyer can now give each gift in an order its own recipient name, recipient
-- email and note. Stripe's session metadata can't hold that (500 characters per
-- value), so create-gift-checkout saves the order as a draft first and the
-- session carries only the draft id; the webhook reads it back after payment.
--
-- Requires 20261024000000_gift_codes.sql and 20261024030000_gift_card.sql.
-- ============================================================================

ALTER TABLE public.gift_codes
  ADD COLUMN IF NOT EXISTS recipient_name text,
  ADD COLUMN IF NOT EXISTS recipient_email text,
  ADD COLUMN IF NOT EXISTS note text,
  -- 1-based place of this gift in the order, so "Gift 1, Gift 2..." stay in the order the buyer typed them.
  ADD COLUMN IF NOT EXISTS position integer,
  -- Set once this gift's own email went out, so a retried webhook never
  -- emails the same person twice.
  ADD COLUMN IF NOT EXISTS recipient_emailed_at timestamptz;

CREATE TABLE IF NOT EXISTS public.gift_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_email text NOT NULL,
  buyer_name text,
  -- [{ "recipient_name": "...", "recipient_email": "...", "note": "..." }, ...]
  items jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gift_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gift_drafts FROM PUBLIC, anon, authenticated;

-- Webhook-only. Like create_gift_order, but every code carries its own
-- recipient details. p_items = [{ code, recipient_name, recipient_email, note }].
-- Returns the new order id, or NULL when the session was already recorded.
CREATE OR REPLACE FUNCTION public.create_gift_order_items(
  p_session_id text,
  p_payment_intent text,
  p_buyer_email text,
  p_buyer_name text,
  p_amount_cents integer,
  p_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order uuid;
  v_n integer := coalesce(jsonb_array_length(p_items), 0);
BEGIN
  IF v_n < 1 OR v_n > 25 THEN
    RAISE EXCEPTION 'between 1 and 25 gifts are required';
  END IF;

  INSERT INTO public.gift_orders (
    stripe_checkout_session_id, stripe_payment_intent_id, buyer_email, buyer_name,
    quantity, amount_cents
  ) VALUES (
    p_session_id, p_payment_intent, p_buyer_email, p_buyer_name, v_n, p_amount_cents
  )
  ON CONFLICT (stripe_checkout_session_id) DO NOTHING
  RETURNING id INTO v_order;

  IF v_order IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.gift_codes (order_id, code, recipient_name, recipient_email, note, position)
  SELECT v_order,
         t.e ->> 'code',
         nullif(t.e ->> 'recipient_name', ''),
         nullif(t.e ->> 'recipient_email', ''),
         nullif(t.e ->> 'note', ''),
         t.n::integer
  FROM jsonb_array_elements(p_items) WITH ORDINALITY AS t(e, n);

  RETURN v_order;
END;
$$;
REVOKE ALL ON FUNCTION public.create_gift_order_items(text, text, text, text, integer, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_gift_order_items(text, text, text, text, integer, jsonb) TO service_role;

-- The card page now prefers the gift's own name and note over the order's.
CREATE OR REPLACE FUNCTION public.get_gift_card(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm text := regexp_replace(upper(coalesce(p_code, '')), '[^A-Z0-9]', '', 'g');
  v_row record;
BEGIN
  IF length(v_norm) < 12 THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT gc.code, gc.months, gc.redeemed_at, gc.voided_at, gc.redeem_by,
         o.buyer_name,
         coalesce(gc.recipient_name, o.recipient_name) AS recipient_name,
         coalesce(gc.note, o.note) AS note
    INTO v_row
  FROM public.gift_codes gc
  JOIN public.gift_orders o ON o.id = gc.order_id
  WHERE replace(gc.code, '-', '') = v_norm;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'code', v_row.code,
    'months', v_row.months,
    'from_name', v_row.buyer_name,
    'to_name', v_row.recipient_name,
    'note', v_row.note,
    'redeemed', v_row.redeemed_at IS NOT NULL,
    'void', v_row.voided_at IS NOT NULL,
    'expired', v_row.redeem_by < now()
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_gift_card(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_gift_card(text) TO anon, authenticated;
