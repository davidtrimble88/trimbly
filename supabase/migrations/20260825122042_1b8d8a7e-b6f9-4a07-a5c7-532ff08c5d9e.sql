CREATE OR REPLACE FUNCTION public.validate_discount_code(p_code text)
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

  RETURN jsonb_build_object(
    'success', true,
    'discount_type', v_code.discount_type,
    'discount_value', v_code.discount_value,
    'grants_tier', v_code.grants_tier,
    'grants_provider_tier', v_code.grants_provider_tier,
    'grants_garage', v_code.grants_garage,
    'is_testing_code', v_code.is_testing_code,
    'description', v_code.description
  );
END;
$$;

REVOKE ALL ON FUNCTION public.validate_discount_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_discount_code(text) TO authenticated;

DROP FUNCTION IF EXISTS public.redeem_discount_code(text);

CREATE OR REPLACE FUNCTION public.redeem_discount_code(p_code text, p_target_tier text DEFAULT NULL, p_target_provider_tier text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code public.discount_codes%ROWTYPE;
  v_uid uuid := auth.uid();
  v_effective_tier text;
  v_effective_provider_tier text;
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

  v_effective_tier := COALESCE(v_code.grants_tier, p_target_tier);
  IF v_effective_tier IS NOT NULL AND v_effective_tier NOT IN ('free', 'homeowner_pro', 'multi_pro') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid tier');
  END IF;

  v_effective_provider_tier := COALESCE(v_code.grants_provider_tier, p_target_provider_tier);
  IF v_effective_provider_tier IS NOT NULL AND v_effective_provider_tier NOT IN ('free', 'pro', 'elite') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid tier');
  END IF;

  INSERT INTO public.discount_code_redemptions (code_id, user_id) VALUES (v_code.id, v_uid);
  UPDATE public.discount_codes SET redemption_count = redemption_count + 1 WHERE id = v_code.id;

  IF v_effective_tier IS NOT NULL OR v_code.is_testing_code THEN
    PERFORM set_config('app.trusted_profile_sync', 'on', true);
    UPDATE public.profiles
    SET subscription_tier = COALESCE(v_effective_tier, subscription_tier),
        is_testing_account = is_testing_account OR v_code.is_testing_code
    WHERE id = v_uid;
    PERFORM set_config('app.trusted_profile_sync', 'off', true);
  END IF;

  IF v_effective_provider_tier IS NOT NULL THEN
    PERFORM set_config('app.trusted_verification_sync', 'on', true);
    UPDATE public.providers
    SET subscription_tier = v_effective_provider_tier
    WHERE user_id = v_uid;
    PERFORM set_config('app.trusted_verification_sync', 'off', true);
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
    'grants_tier', v_effective_tier,
    'grants_provider_tier', v_effective_provider_tier,
    'grants_garage', v_code.grants_garage,
    'is_testing_code', v_code.is_testing_code,
    'description', v_code.description
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_discount_code(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_discount_code(text, text, text) TO authenticated;

UPDATE public.discount_codes
SET grants_tier = NULL, grants_provider_tier = NULL
WHERE code = 'TRIMBLYBETA';