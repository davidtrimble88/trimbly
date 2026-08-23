-- ============================================================================
-- Testing-readiness, part 1: discount codes + a trusted-sync escape hatch.
--
-- protect_profile_privileged_columns() (added 2026-08-03) silently reverts
-- subscription_tier/user_type/suspended/suspended_reason back to OLD.* for
-- any non-admin/moderator caller. That's correct for a direct client update,
-- but it also silently breaks two things:
--   1. HomeownerUpsell.tsx's tier-selection buttons, which update
--      subscription_tier straight from the client (their toast "activated!"
--      fires regardless — a false positive; the tier never actually changes).
--   2. The new redeem_discount_code() RPC below, which legitimately needs to
--      grant a tier on behalf of the calling user.
-- Fix: add the same app.trusted_*_sync escape hatch already used for
-- providers.verified (see 20260707031742), scoped as app.trusted_profile_sync.
-- Trusted server-side code sets it for the duration of one transaction; a
-- direct client .update() call never sets it, so it stays fully blocked.
-- ============================================================================

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
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_profile_privileged_columns() FROM PUBLIC, anon;

-- Flags an account as part of the free testing program, for persistent UI
-- treatment (banner) independent of which tier it currently has.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_testing_account boolean NOT NULL DEFAULT false;

-- ============================================================================
-- Discount codes
--
-- The table/policy/trigger block below was already created by
-- 20260809100000_discount_codes.sql; duplicated here verbatim with no
-- guard, which breaks replaying migrations from scratch ("relation
-- already exists"). Guarded with IF NOT EXISTS / DROP ... IF EXISTS so
-- it's a no-op on the current database (which already has this table)
-- and only matters for a fresh environment. The RPCs and column below
-- this block are NOT duplicates — they're unique to this file.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  -- 'free' = skips payment entirely (what testing codes use); 'percent' and
  -- 'fixed' are recorded for reporting but aren't wired to a real Stripe
  -- checkout yet, since HomeownerUpsell.tsx has no live payment flow to
  -- discount against — see note in redeem_discount_code().
  discount_type text NOT NULL DEFAULT 'free' CHECK (discount_type IN ('free', 'percent', 'fixed')),
  discount_value numeric,
  -- Tier granted on redemption (e.g. 'multi_pro' for a code that comps Home
  -- Super Hero). NULL means "no tier change, just record the redemption."
  grants_tier text CHECK (grants_tier IS NULL OR grants_tier IN ('free', 'homeowner_pro', 'multi_pro')),
  -- Marks this as a testing-program code: redemption also sets
  -- profiles.is_testing_account and triggers the welcome/disclaimer modal.
  is_testing_code boolean NOT NULL DEFAULT false,
  max_redemptions integer,
  redemption_count integer NOT NULL DEFAULT 0,
  -- NULL = never expires (what "works until testing is over, undefined
  -- amount of time" needs).
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.discount_codes TO authenticated;
GRANT ALL ON public.discount_codes TO service_role;

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage discount codes" ON public.discount_codes;
CREATE POLICY "Admins manage discount codes" ON public.discount_codes
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_discount_codes_updated ON public.discount_codes;
CREATE TRIGGER trg_discount_codes_updated
  BEFORE UPDATE ON public.discount_codes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- No SELECT policy for plain authenticated users at all: codes are validated
-- and redeemed only through redeem_discount_code() below, so a regular user
-- can never browse/enumerate active codes or see redemption counts.

CREATE TABLE IF NOT EXISTS public.discount_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code_id, user_id)
);

GRANT SELECT ON public.discount_code_redemptions TO authenticated;
GRANT ALL ON public.discount_code_redemptions TO service_role;

ALTER TABLE public.discount_code_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own redemptions" ON public.discount_code_redemptions;
CREATE POLICY "Users can view own redemptions" ON public.discount_code_redemptions
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all redemptions" ON public.discount_code_redemptions;
CREATE POLICY "Admins view all redemptions" ON public.discount_code_redemptions
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
-- No INSERT policy for authenticated: rows are only ever written by
-- redeem_discount_code() (SECURITY DEFINER), never directly by a client.

-- Validates and redeems a code for the calling user in one atomic step.
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

  RETURN jsonb_build_object(
    'success', true,
    'discount_type', v_code.discount_type,
    'discount_value', v_code.discount_value,
    'grants_tier', v_code.grants_tier,
    'is_testing_code', v_code.is_testing_code,
    'description', v_code.description
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_discount_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_discount_code(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_own_subscription_tier(p_tier text)
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
  IF p_tier NOT IN ('free', 'homeowner_pro', 'multi_pro') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid tier');
  END IF;

  PERFORM set_config('app.trusted_profile_sync', 'on', true);
  UPDATE public.profiles SET subscription_tier = p_tier WHERE id = v_uid;
  PERFORM set_config('app.trusted_profile_sync', 'off', true);

  RETURN jsonb_build_object('success', true, 'tier', p_tier);
END;
$$;

REVOKE ALL ON FUNCTION public.set_own_subscription_tier(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_own_subscription_tier(text) TO authenticated;