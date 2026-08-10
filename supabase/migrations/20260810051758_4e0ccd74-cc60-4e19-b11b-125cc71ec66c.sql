-- Lets a discount code also grant "My Garage" add-on access (e.g. the
-- testing code should unlock everything, not just the home subscription
-- tier). garage_subscriptions has no protect-column trigger and no
-- INSERT/UPDATE policy for regular users at all (see 20260614190134), so a
-- SECURITY DEFINER function can write to it directly with no escape-hatch
-- dance needed — unlike profiles/providers, which do have such triggers.

ALTER TABLE public.discount_codes ADD COLUMN IF NOT EXISTS grants_garage boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.redeem_discount_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code public.discount_codes%ROWTYPE;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_code IS NULL OR trim(p_code) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Enter a code');
  END IF;

  SELECT * INTO v_code FROM public.discount_codes
  WHERE upper(code) = upper(trim(p_code));

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'That code isn''t valid');
  END IF;
  IF NOT v_code.active THEN
    RETURN jsonb_build_object('success', false, 'error', 'This code is no longer active');
  END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'This code has expired');
  END IF;
  IF v_code.max_redemptions IS NOT NULL AND v_code.redemption_count >= v_code.max_redemptions THEN
    RETURN jsonb_build_object('success', false, 'error', 'This code has reached its redemption limit');
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.discount_code_redemptions
    WHERE code_id = v_code.id AND user_id = v_uid
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You''ve already redeemed this code');
  END IF;

  INSERT INTO public.discount_code_redemptions (code_id, user_id) VALUES (v_code.id, v_uid);
  UPDATE public.discount_codes SET redemption_count = redemption_count + 1 WHERE id = v_code.id;

  IF v_code.grants_tier IS NOT NULL OR v_code.is_testing_code THEN
    PERFORM set_config('app.trusted_profile_sync', 'on', true);
    UPDATE public.profiles
    SET subscription_tier = COALESCE(v_code.grants_tier, subscription_tier),
        is_testing_account = is_testing_account OR v_code.is_testing_code
    WHERE id = v_uid;
    PERFORM set_config('app.trusted_profile_sync', 'off', true);
  END IF;

  IF v_code.grants_garage THEN
    INSERT INTO public.garage_subscriptions (user_id, status, current_period_end)
    VALUES (v_uid, 'active', NULL)
    ON CONFLICT (user_id) DO UPDATE
    SET status = 'active', current_period_end = NULL, canceled_at = NULL;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'discount_type', v_code.discount_type,
    'discount_value', v_code.discount_value,
    'grants_tier', v_code.grants_tier,
    'grants_garage', v_code.grants_garage,
    'is_testing_code', v_code.is_testing_code,
    'description', v_code.description
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_discount_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_discount_code(text) TO authenticated;