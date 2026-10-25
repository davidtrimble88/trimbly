-- ============================================================================
-- Printable gift card: /gift-card?code=GIFT-XXXX-XXXX-XXXX
--
-- The buyer (or the person they forward it to) opens a page with the note, the
-- names and the code, and prints it or saves it as a PDF. The page has no
-- login, so it reads through this one function. The code is the key: it is
-- ~59 random bits and is never listed anywhere, and the function returns only
-- what the card shows (no email addresses, no order or payment details).
--
-- Requires 20261024000000_gift_codes.sql.
-- ============================================================================

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
         o.buyer_name, o.recipient_name, o.note
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
