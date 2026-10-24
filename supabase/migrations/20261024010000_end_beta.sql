-- ============================================================================
-- End of the free beta.
--
-- During the beta three RPCs let a signed-in user set their OWN paid plan with
-- no payment, and a standing TRIMBLYBETA discount code granted every paid plan
-- free. With billing on, all of that has to stop:
--   * set_own_subscription_tier / set_own_provider_tier only allow 'free'
--   * set_own_garage_subscription no longer activates anything
--   * TRIMBLYBETA is switched off
-- Paid plans now come only from a Stripe subscription (webhook), a staff
-- discount code, or a gift code.
--
-- Also: homeowners get the same stripe/status columns providers and garage
-- already have, a gate query (beta_end_status) listing the paid plans an
-- account still holds without a card, and one-click "switch to free".
--
-- Requires 20261024000000_gift_codes.sql (tier_expires_at) to be applied first.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz;

-- A client .update() must not be able to mark itself as paying.
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.trusted_profile_sync', true) IS DISTINCT FROM 'on'
     AND NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  THEN
    NEW.suspended := OLD.suspended;
    NEW.suspended_reason := OLD.suspended_reason;
    NEW.subscription_tier := OLD.subscription_tier;
    NEW.user_type := OLD.user_type;
    NEW.tier_expires_at := OLD.tier_expires_at;
    NEW.stripe_customer_id := OLD.stripe_customer_id;
    NEW.stripe_subscription_id := OLD.stripe_subscription_id;
    NEW.subscription_status := OLD.subscription_status;
    NEW.subscription_current_period_end := OLD.subscription_current_period_end;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_profile_privileged_columns() FROM PUBLIC, anon;

-- Webhook-only (service role), the profiles twin of update_provider_trusted.
-- NULL arguments leave the column alone.
CREATE OR REPLACE FUNCTION public.update_profile_subscription_trusted(
  p_user_id uuid,
  p_stripe_customer_id text DEFAULT NULL,
  p_stripe_subscription_id text DEFAULT NULL,
  p_subscription_tier text DEFAULT NULL,
  p_subscription_status text DEFAULT NULL,
  p_subscription_current_period_end timestamptz DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_subscription_tier IS NOT NULL AND p_subscription_tier NOT IN ('free', 'homeowner_pro', 'multi_pro') THEN
    RAISE EXCEPTION 'invalid tier %', p_subscription_tier;
  END IF;
  PERFORM set_config('app.trusted_profile_sync', 'on', true);
  UPDATE public.profiles SET
    stripe_customer_id = COALESCE(p_stripe_customer_id, stripe_customer_id),
    stripe_subscription_id = COALESCE(p_stripe_subscription_id, stripe_subscription_id),
    subscription_tier = COALESCE(p_subscription_tier, subscription_tier),
    subscription_status = COALESCE(p_subscription_status, subscription_status),
    subscription_current_period_end = COALESCE(p_subscription_current_period_end, subscription_current_period_end),
    -- A paid subscription replaces any gift end date.
    tier_expires_at = CASE WHEN p_subscription_status = 'active' THEN NULL ELSE tier_expires_at END
  WHERE id = p_user_id;
  PERFORM set_config('app.trusted_profile_sync', 'off', true);
END;
$$;
REVOKE ALL ON FUNCTION public.update_profile_subscription_trusted(uuid, text, text, text, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_profile_subscription_trusted(uuid, text, text, text, text, timestamptz) TO service_role;

-- ---------------------------------------------------------------------------
-- Close the free-upgrade shortcuts. Downgrading to free is still allowed, but
-- not while a Stripe subscription is live: that one has to be cancelled
-- (cancel-subscription), or the person would keep being billed for nothing.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_own_subscription_tier(p_tier text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_status text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_tier IS DISTINCT FROM 'free' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Start a free trial to upgrade');
  END IF;

  SELECT subscription_status INTO v_status FROM public.profiles WHERE id = v_uid;
  IF v_status IN ('active', 'past_due') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cancel your subscription first, then you can switch to Free');
  END IF;

  PERFORM set_config('app.trusted_profile_sync', 'on', true);
  UPDATE public.profiles SET subscription_tier = 'free', tier_expires_at = NULL WHERE id = v_uid;
  PERFORM set_config('app.trusted_profile_sync', 'off', true);

  RETURN jsonb_build_object('success', true, 'tier', 'free');
END;
$$;
REVOKE ALL ON FUNCTION public.set_own_subscription_tier(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_own_subscription_tier(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_own_provider_tier(p_tier text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_status text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_tier IS DISTINCT FROM 'free' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Start a free trial to upgrade');
  END IF;

  SELECT subscription_status INTO v_status FROM public.providers WHERE user_id = v_uid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No provider profile found');
  END IF;
  IF v_status IN ('active', 'past_due') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cancel your subscription first, then you can switch to Free');
  END IF;

  PERFORM set_config('app.trusted_verification_sync', 'on', true);
  UPDATE public.providers SET subscription_tier = 'free' WHERE user_id = v_uid;
  PERFORM set_config('app.trusted_verification_sync', 'off', true);

  RETURN jsonb_build_object('success', true, 'tier', 'free');
END;
$$;
REVOKE ALL ON FUNCTION public.set_own_provider_tier(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_own_provider_tier(text) TO authenticated;

-- No longer activates anything. Garage now starts only through
-- create-garage-checkout. Kept (not dropped) so a stale browser tab gets a
-- readable error instead of a missing-function one.
CREATE OR REPLACE FUNCTION public.set_own_garage_subscription(p_interval text DEFAULT 'monthly')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object('success', false, 'error', 'Start a free trial to add My Garage');
END;
$$;
REVOKE ALL ON FUNCTION public.set_own_garage_subscription(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_own_garage_subscription(text) TO authenticated;

-- The standing "everything free" code. Staff-made partner codes are untouched.
UPDATE public.discount_codes SET active = false WHERE upper(code) = 'TRIMBLYBETA';

-- ---------------------------------------------------------------------------
-- The gate. Which paid plans does the caller hold without a card on file?
--
-- Not pending (never gated):
--   * staff, and accounts flagged is_testing_account
--   * a gifted plan that hasn't ended (tier_expires_at in the future)
--   * anyone who redeemed a staff discount code that grants a plan (a comp),
--     other than the TRIMBLYBETA beta code
--   * a plan backed by a Stripe subscription (status active / past_due)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.beta_end_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_provider public.providers%ROWTYPE;
  v_garage public.garage_subscriptions%ROWTYPE;
  v_exempt boolean;
  v_pending jsonb := '[]'::jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('pending', v_pending);
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('pending', v_pending);
  END IF;

  v_exempt := v_profile.is_testing_account
    OR has_role(v_uid, 'admin'::app_role)
    OR has_role(v_uid, 'moderator'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.discount_code_redemptions r
      JOIN public.discount_codes c ON c.id = r.code_id
      WHERE r.user_id = v_uid
        AND upper(c.code) <> 'TRIMBLYBETA'
        AND (c.grants_tier IS NOT NULL OR c.grants_provider_tier IS NOT NULL OR c.grants_garage)
    );
  IF v_exempt THEN
    RETURN jsonb_build_object('pending', v_pending);
  END IF;

  -- Homeowner plan
  IF v_profile.subscription_tier IN ('homeowner_pro', 'multi_pro')
     AND v_profile.subscription_status NOT IN ('active', 'past_due')
     AND (v_profile.tier_expires_at IS NULL OR v_profile.tier_expires_at < now())
  THEN
    v_pending := v_pending || jsonb_build_array(
      jsonb_build_object('scope', 'homeowner', 'tier', v_profile.subscription_tier));
  END IF;

  -- Provider / mechanic plan
  SELECT * INTO v_provider FROM public.providers WHERE user_id = v_uid;
  IF FOUND AND v_provider.subscription_tier <> 'free'
     AND v_provider.subscription_status NOT IN ('active', 'past_due')
  THEN
    v_pending := v_pending || jsonb_build_array(
      jsonb_build_object('scope', 'provider', 'tier', v_provider.subscription_tier, 'provider_type', v_provider.provider_type));
  END IF;

  -- My Garage add-on
  SELECT * INTO v_garage FROM public.garage_subscriptions WHERE user_id = v_uid;
  IF FOUND AND v_garage.status IN ('active', 'trial') AND v_garage.stripe_subscription_id IS NULL THEN
    v_pending := v_pending || jsonb_build_array(
      jsonb_build_object('scope', 'garage', 'interval', coalesce(v_garage.plan_interval, 'monthly')));
  END IF;

  RETURN jsonb_build_object('pending', v_pending);
END;
$$;
REVOKE ALL ON FUNCTION public.beta_end_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.beta_end_status() TO authenticated;

-- "Switch to Free" for one pending plan. Only touches a plan that
-- beta_end_status() says is pending, so it can never cancel a paying
-- subscription or a gift.
CREATE OR REPLACE FUNCTION public.end_beta_switch_to_free(p_scope text)
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
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(public.beta_end_status() -> 'pending') e WHERE e ->> 'scope' = p_scope
  ) THEN
    RETURN jsonb_build_object('success', true, 'changed', false);
  END IF;

  IF p_scope = 'homeowner' THEN
    PERFORM set_config('app.trusted_profile_sync', 'on', true);
    UPDATE public.profiles SET subscription_tier = 'free', tier_expires_at = NULL WHERE id = v_uid;
    PERFORM set_config('app.trusted_profile_sync', 'off', true);
  ELSIF p_scope = 'provider' THEN
    PERFORM set_config('app.trusted_verification_sync', 'on', true);
    UPDATE public.providers SET subscription_tier = 'free' WHERE user_id = v_uid;
    PERFORM set_config('app.trusted_verification_sync', 'off', true);
  ELSIF p_scope = 'garage' THEN
    UPDATE public.garage_subscriptions
    SET status = 'canceled', canceled_at = now()
    WHERE user_id = v_uid AND stripe_subscription_id IS NULL;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Unknown plan');
  END IF;

  RETURN jsonb_build_object('success', true, 'changed', true);
END;
$$;
REVOKE ALL ON FUNCTION public.end_beta_switch_to_free(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.end_beta_switch_to_free(text) TO authenticated;
