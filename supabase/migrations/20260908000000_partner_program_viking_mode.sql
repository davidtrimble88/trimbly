-- ============================================================================
-- Creator/partner program: a discount code can now also (a) carry a revenue
-- share percent for a named partner and (b) unlock "Viking Mode" — a third
-- theme, exclusive to whoever redeems a code with unlocks_viking_mode = true.
--
-- Reuses the existing discount_codes / redeem_discount_code() infrastructure
-- rather than building a parallel referral system: a partner code is just a
-- discount_codes row with partner_name + commission_percent set, redeemed
-- through the same "Have a discount code?" box already on HomeownerUpsell /
-- ProPricing / MechanicPricing.
--
-- Commission is NOT auto-paid — Trimbly has no Stripe Connect payout wiring
-- for third parties. This just gives staff a live "who's still subscribed,
-- what's owed" view (see staff/Partners.tsx) so David can pay partners
-- manually until real payout automation exists.
-- ============================================================================

ALTER TABLE public.discount_codes ADD COLUMN IF NOT EXISTS partner_name text;
ALTER TABLE public.discount_codes ADD COLUMN IF NOT EXISTS commission_percent numeric CHECK (commission_percent IS NULL OR (commission_percent >= 0 AND commission_percent <= 100));
ALTER TABLE public.discount_codes ADD COLUMN IF NOT EXISTS unlocks_viking_mode boolean NOT NULL DEFAULT false;

-- Permanent, cosmetic — once unlocked it stays unlocked even if the person's
-- subscription later lapses. It's a fun badge for using a partner's code,
-- not a paid feature, so there's nothing to revoke.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS viking_mode_unlocked boolean NOT NULL DEFAULT false;
-- First-touch attribution: which partner code (if any) brought this user in.
-- Only ever set once, by redeem_discount_code() below, and only for codes
-- that actually carry a commission — a plain testing/promo code should never
-- show up as "referred by" in the partner report.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by_code text;

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
    'unlocks_viking_mode', v_code.unlocks_viking_mode,
    'partner_name', v_code.partner_name,
    'description', v_code.description
  );
END;
$$;

DROP FUNCTION IF EXISTS public.redeem_discount_code(text, text, text);

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

  IF v_effective_tier IS NOT NULL OR v_code.is_testing_code OR v_code.unlocks_viking_mode OR v_code.commission_percent IS NOT NULL THEN
    PERFORM set_config('app.trusted_profile_sync', 'on', true);
    UPDATE public.profiles
    SET subscription_tier = COALESCE(v_effective_tier, subscription_tier),
        is_testing_account = is_testing_account OR v_code.is_testing_code,
        viking_mode_unlocked = viking_mode_unlocked OR v_code.unlocks_viking_mode,
        referred_by_code = CASE
          WHEN v_code.commission_percent IS NOT NULL THEN COALESCE(referred_by_code, v_code.code)
          ELSE referred_by_code
        END
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
    'unlocks_viking_mode', v_code.unlocks_viking_mode,
    'partner_name', v_code.partner_name,
    'description', v_code.description
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_discount_code(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_discount_code(text, text, text) TO authenticated;

-- Staff-only report: for every partner code, who redeemed it and whether
-- they're still on a paid tier — the live basis for "what's owed this
-- cycle." A view (not a stored ledger) since there's no real recurring
-- billing to reconcile against yet outside Pro/Mechanic Stripe subscriptions;
-- see staff/Partners.tsx for how this gets turned into a dollar figure.
CREATE OR REPLACE VIEW public.partner_redemptions AS
SELECT
  dc.id AS code_id,
  dc.code,
  dc.partner_name,
  dc.commission_percent,
  r.user_id,
  r.redeemed_at,
  p.full_name,
  p.user_type,
  p.subscription_tier AS homeowner_tier,
  pr.subscription_tier AS provider_tier,
  pr.provider_type
FROM public.discount_codes dc
JOIN public.discount_code_redemptions r ON r.code_id = dc.id
JOIN public.profiles p ON p.id = r.user_id
LEFT JOIN public.providers pr ON pr.user_id = r.user_id
WHERE dc.commission_percent IS NOT NULL;

-- security_invoker so the view runs with the querying staff member's own
-- RLS, not the view owner's — it has no data of its own to protect beyond
-- what the underlying tables' policies already allow (admins can read
-- profiles/providers broadly; regular users can't, so this view exposes
-- nothing a direct query couldn't already).
ALTER VIEW public.partner_redemptions SET (security_invoker = on);

-- Seed the Hexwood Creations partnership. Deliberately grants NO tier and
-- is not a testing code — this code must NOT bypass real billing, since the
-- whole point is Hexwood earning a cut of what the referred person actually
-- pays. discount_type 'percent' / value 0 here is just an honest label
-- ("not a price discount to the buyer"); the real effect is the partner
-- attribution + Viking Mode unlock below.
INSERT INTO public.discount_codes (code, description, discount_type, discount_value, partner_name, commission_percent, unlocks_viking_mode, active)
VALUES ('HEXWOOD', 'Hexwood Creations partnership — 20% recurring commission on subscriptions, unlocks Viking Mode. Grants no free tier; the referred person still pays normally.', 'percent', 0, 'Hexwood Creations', 20, true, true)
ON CONFLICT (code) DO NOTHING;
