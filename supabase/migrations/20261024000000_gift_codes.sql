-- ============================================================================
-- Gift purchases: anyone can buy a year of Home Hero as a one-time code.
--
-- Flow: /gift -> create-gift-checkout (Stripe, one-time payment, no account)
-- -> stripe-webhook (kind = gift_purchase) calls create_gift_order() with
-- freshly generated random codes and emails them -> the recipient signs in and
-- calls redeem_gift_code(), which grants Home Hero until profiles.tier_expires_at.
--
-- discount_codes is NOT reused: those grant a tier permanently, can't be
-- bought, and are created by staff. Gift codes are single-use, expire the
-- tier they grant, and are written only by the webhook.
-- ============================================================================

-- When a gifted tier ends. NULL = the tier doesn't expire (every tier granted
-- before this migration). Anon can't read it: profiles has column-level grants
-- for anon (20261023010000), and a new column is private until listed there.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tier_expires_at timestamptz;

-- Same body as 20260810022321 plus tier_expires_at, so a client .update() can't
-- extend its own gift.
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
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_profile_privileged_columns() FROM PUBLIC, anon;

CREATE TABLE IF NOT EXISTS public.gift_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- UNIQUE is what makes the webhook idempotent: Stripe retries deliveries.
  stripe_checkout_session_id text NOT NULL UNIQUE,
  stripe_payment_intent_id text,
  buyer_email text NOT NULL,
  buyer_name text,
  recipient_email text,
  recipient_name text,
  note text,
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 25),
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  -- Set once the emails went out; the webhook retries the send while NULL.
  emailed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gift_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.gift_orders(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  tier text NOT NULL DEFAULT 'homeowner_pro' CHECK (tier = 'homeowner_pro'),
  months integer NOT NULL DEFAULT 12 CHECK (months BETWEEN 1 AND 36),
  -- Last day an unredeemed code still works.
  redeem_by timestamptz NOT NULL DEFAULT (now() + interval '24 months'),
  redeemed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at timestamptz,
  -- Set by staff for refunds or abuse; a voided code can't be redeemed.
  voided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Lets people type the code without dashes.
CREATE UNIQUE INDEX IF NOT EXISTS gift_codes_normalized_idx
  ON public.gift_codes (replace(code, '-', ''));
CREATE INDEX IF NOT EXISTS gift_codes_order_idx ON public.gift_codes (order_id);

-- RLS on with NO policies, and grants removed from every client role:
-- Supabase's default privileges give anon/authenticated full DML on new public
-- tables, so RLS alone would be the only barrier. Only the service role (the
-- webhook) and the SECURITY DEFINER functions below touch these tables.
ALTER TABLE public.gift_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gift_orders FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.gift_codes FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Webhook-only: records a paid order and its codes in one transaction.
-- Returns the new order id, or NULL when this Stripe session was already
-- recorded (a retried delivery).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_gift_order(
  p_session_id text,
  p_payment_intent text,
  p_buyer_email text,
  p_buyer_name text,
  p_recipient_email text,
  p_recipient_name text,
  p_note text,
  p_amount_cents integer,
  p_codes text[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order uuid;
BEGIN
  IF p_codes IS NULL OR coalesce(array_length(p_codes, 1), 0) = 0 THEN
    RAISE EXCEPTION 'at least one code is required';
  END IF;

  INSERT INTO public.gift_orders (
    stripe_checkout_session_id, stripe_payment_intent_id, buyer_email, buyer_name,
    recipient_email, recipient_name, note, quantity, amount_cents
  ) VALUES (
    p_session_id, p_payment_intent, p_buyer_email, p_buyer_name,
    p_recipient_email, p_recipient_name, p_note, array_length(p_codes, 1), p_amount_cents
  )
  ON CONFLICT (stripe_checkout_session_id) DO NOTHING
  RETURNING id INTO v_order;

  IF v_order IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.gift_codes (order_id, code)
  SELECT v_order, c FROM unnest(p_codes) AS c;

  RETURN v_order;
END;
$$;
REVOKE ALL ON FUNCTION public.create_gift_order(text, text, text, text, text, text, text, integer, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_gift_order(text, text, text, text, text, text, text, integer, text[]) TO service_role;

-- ---------------------------------------------------------------------------
-- Redeem a gift code for the signed-in user. Returns jsonb like
-- redeem_discount_code so the UI can show the right message. Problems that
-- aren't the code's fault (the account already has Home Hero) return an error
-- WITHOUT consuming the code, so it can still be given to someone else.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_gift_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_norm text;
  v_gift public.gift_codes%ROWTYPE;
  v_tier text;
  v_current_expiry timestamptz;
  v_type text;
  v_base timestamptz;
  v_expiry timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sign in to redeem your gift');
  END IF;

  v_norm := regexp_replace(upper(coalesce(p_code, '')), '[^A-Z0-9]', '', 'g');
  IF v_norm = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Enter your gift code');
  END IF;

  SELECT * INTO v_gift FROM public.gift_codes
  WHERE replace(code, '-', '') = v_norm
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'That gift code isn''t valid');
  END IF;
  IF v_gift.voided_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'This gift code is no longer active');
  END IF;
  IF v_gift.redeemed_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error',
      CASE WHEN v_gift.redeemed_by = v_uid THEN 'You''ve already redeemed this gift'
           ELSE 'This gift code has already been used' END);
  END IF;
  IF v_gift.redeem_by < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'This gift code has expired');
  END IF;

  SELECT subscription_tier, tier_expires_at, user_type
    INTO v_tier, v_current_expiry, v_type
  FROM public.profiles WHERE id = v_uid FOR UPDATE;

  IF NOT FOUND OR v_type = 'provider' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift codes work on homeowner accounts');
  END IF;
  IF v_tier = 'multi_pro' THEN
    RETURN jsonb_build_object('success', false, 'error',
      'Your plan already includes everything in Home Hero. Your code is still unused, so you can pass it to someone else.');
  END IF;
  IF v_tier = 'homeowner_pro' AND v_current_expiry IS NULL THEN
    -- Redeeming would turn a plan that doesn't end into one that does.
    RETURN jsonb_build_object('success', false, 'error',
      'Your account already has Home Hero with no end date. Your code is still unused, so you can pass it to someone else.');
  END IF;

  -- Stack on top of a gift that is still running, so two gifts add up.
  v_base := now();
  IF v_tier = 'homeowner_pro' AND v_current_expiry > v_base THEN
    v_base := v_current_expiry;
  END IF;
  v_expiry := v_base + make_interval(months => v_gift.months);

  PERFORM set_config('app.trusted_profile_sync', 'on', true);
  UPDATE public.profiles
  SET subscription_tier = v_gift.tier, tier_expires_at = v_expiry
  WHERE id = v_uid;
  PERFORM set_config('app.trusted_profile_sync', 'off', true);

  UPDATE public.gift_codes
  SET redeemed_by = v_uid, redeemed_at = now()
  WHERE id = v_gift.id;

  RETURN jsonb_build_object('success', true, 'tier', v_gift.tier, 'expires_at', v_expiry);
END;
$$;
REVOKE ALL ON FUNCTION public.redeem_gift_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_gift_code(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Ending a gift. Two entry points because the project has no pg_cron:
--   expire_my_gift_tier()  the signed-in user's own row, called when the app
--                          loads their profile, so an expired gift never
--                          outlives the next visit.
--   expire_gift_tiers()    every row; maintenance-reminders (already on a
--                          schedule) calls it with the service role.
-- Both only downgrade homeowner_pro; any other tier just loses the stale date.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expire_my_gift_tier()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rows integer;
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;
  PERFORM set_config('app.trusted_profile_sync', 'on', true);
  UPDATE public.profiles
  SET subscription_tier = CASE WHEN subscription_tier = 'homeowner_pro' THEN 'free' ELSE subscription_tier END,
      tier_expires_at = NULL
  WHERE id = v_uid AND tier_expires_at IS NOT NULL AND tier_expires_at < now();
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  PERFORM set_config('app.trusted_profile_sync', 'off', true);
  RETURN v_rows > 0;
END;
$$;
REVOKE ALL ON FUNCTION public.expire_my_gift_tier() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expire_my_gift_tier() TO authenticated;

CREATE OR REPLACE FUNCTION public.expire_gift_tiers()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows integer;
BEGIN
  PERFORM set_config('app.trusted_profile_sync', 'on', true);
  UPDATE public.profiles
  SET subscription_tier = CASE WHEN subscription_tier = 'homeowner_pro' THEN 'free' ELSE subscription_tier END,
      tier_expires_at = NULL
  WHERE tier_expires_at IS NOT NULL AND tier_expires_at < now();
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  PERFORM set_config('app.trusted_profile_sync', 'off', true);
  RETURN v_rows;
END;
$$;
REVOKE ALL ON FUNCTION public.expire_gift_tiers() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_gift_tiers() TO service_role;
