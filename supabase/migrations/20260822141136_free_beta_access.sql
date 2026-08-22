-- Free beta: homeowners already have a no-payment tier-selection path
-- (set_own_subscription_tier, from 20260809100000 — "no real Stripe
-- checkout yet"). Providers never got the equivalent — the only way to
-- reach providers.subscription_tier = 'pro' is real Stripe Checkout via
-- create-provider-subscription-checkout. For a free beta, that's the one
-- place a new user could actually hit a payment form. This migration:
--   1. Lets discount codes also grant a provider tier (previously
--      homeowner-only), reusing providers' existing trusted-sync escape
--      hatch (app.trusted_verification_sync, from 20260803040944) the same
--      way redeem_discount_code already uses profiles' app.trusted_profile_sync.
--   2. Adds set_own_provider_tier(), the provider-side mirror of
--      set_own_subscription_tier(), so the beta upgrade flow never has to
--      go through Stripe at all.
--   3. Seeds one real, unlimited-use beta code so it also works as an
--      out-of-band invite ("use code TRIMBLYBETA") — not just an in-app
--      button.

ALTER TABLE public.discount_codes
  ADD COLUMN IF NOT EXISTS grants_provider_tier text
  CHECK (grants_provider_tier IS NULL OR grants_provider_tier IN ('free', 'pro', 'elite'));

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

  IF v_code.grants_provider_tier IS NOT NULL THEN
    PERFORM set_config('app.trusted_verification_sync', 'on', true);
    UPDATE public.providers
    SET subscription_tier = v_code.grants_provider_tier
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
    'grants_tier', v_code.grants_tier,
    'grants_provider_tier', v_code.grants_provider_tier,
    'grants_garage', v_code.grants_garage,
    'is_testing_code', v_code.is_testing_code,
    'description', v_code.description
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_discount_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_discount_code(text) TO authenticated;

-- Provider-side mirror of set_own_subscription_tier(): scoped to the
-- caller's own provider row, fixed allow-list of tiers, so it can't be used
-- to touch anyone else's account or any other privileged column.
CREATE OR REPLACE FUNCTION public.set_own_provider_tier(p_tier text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_tier NOT IN ('free', 'pro', 'elite') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid tier');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_uid) THEN
    RETURN jsonb_build_object('success', false, 'error', 'No provider profile found');
  END IF;

  PERFORM set_config('app.trusted_verification_sync', 'on', true);
  UPDATE public.providers SET subscription_tier = p_tier WHERE user_id = v_uid;
  PERFORM set_config('app.trusted_verification_sync', 'off', true);

  RETURN jsonb_build_object('success', true, 'tier', p_tier);
END;
$$;

REVOKE ALL ON FUNCTION public.set_own_provider_tier(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_own_provider_tier(text) TO authenticated;

-- Real, standing beta code — unlimited redemptions, no expiry (staff can
-- flip `active` off from the existing Discounts admin page once beta ends).
INSERT INTO public.discount_codes (code, description, discount_type, grants_tier, grants_provider_tier, grants_garage, is_testing_code, max_redemptions, expires_at, active)
VALUES ('TRIMBLYBETA', 'Free full access during the Trimbly beta', 'free', 'multi_pro', 'pro', true, false, NULL, NULL, true)
ON CONFLICT (code) DO NOTHING;
