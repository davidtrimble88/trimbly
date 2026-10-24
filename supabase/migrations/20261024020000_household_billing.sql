-- ============================================================================
-- Household invites are billed.
--
-- home_shares.monthly_addon_cents already records the price locked in when an
-- invite is accepted ($2 Home Hero member, $5 single home, $10 extra Super
-- Hero member after the first two free). Until now nothing charged it. The
-- sync-household-billing function now adds those amounts to the owner's Stripe
-- subscription, so two things change here:
--
--   1. Only an owner who can actually be billed may create or accept an invite:
--      an active Stripe subscription (card on file), or a test/staff account.
--      That ends the free-for-everyone invite the beta allowed.
--   2. Owners could write home_shares directly (policy FOR ALL), which would
--      let them insert a seat with monthly_addon_cents = 0 or zero out an
--      existing one. Owners now get read-only access; every change goes
--      through the SECURITY DEFINER functions.
--
-- Requires 20261024010000_end_beta.sql (profiles.subscription_status).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.household_owner_can_be_billed(p_owner uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_owner
      AND (
        (p.subscription_status = 'active' AND p.stripe_subscription_id IS NOT NULL)
        OR p.is_testing_account
      )
  )
  OR has_role(p_owner, 'admin'::app_role)
  OR has_role(p_owner, 'moderator'::app_role);
$$;
REVOKE ALL ON FUNCTION public.household_owner_can_be_billed(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.household_owner_can_be_billed(uuid) TO service_role;

-- Same as the beta version, minus "hero_member is free for everyone".
CREATE OR REPLACE FUNCTION public.create_home_invite(p_grant_type text, p_home_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tier text;
  v_token text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_grant_type NOT IN ('hero_member', 'multi_full', 'multi_single') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid grant type');
  END IF;

  SELECT subscription_tier INTO v_tier FROM public.profiles WHERE id = v_uid;

  IF p_grant_type = 'hero_member' AND v_tier NOT IN ('homeowner_pro', 'multi_pro') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Home Hero is required to invite a household member');
  END IF;
  IF p_grant_type IN ('multi_full', 'multi_single') AND v_tier <> 'multi_pro' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Home Super Hero is required for this kind of invite');
  END IF;
  IF NOT public.household_owner_can_be_billed(v_uid) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Add a card (start your free trial) to invite household members. They are billed on your subscription.');
  END IF;

  IF p_grant_type = 'multi_single' THEN
    IF p_home_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Pick a home for this invite');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.homes WHERE id = p_home_id AND user_id = v_uid) THEN
      RETURN jsonb_build_object('success', false, 'error', 'That home is not yours');
    END IF;
  END IF;

  INSERT INTO public.home_invites (owner_user_id, grant_type, home_id)
  VALUES (v_uid, p_grant_type, CASE WHEN p_grant_type = 'multi_single' THEN p_home_id ELSE NULL END)
  RETURNING token INTO v_token;

  RETURN jsonb_build_object('success', true, 'token', v_token);
END;
$$;
REVOKE ALL ON FUNCTION public.create_home_invite(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_home_invite(text, uuid) TO authenticated;

-- Same as 20260821010514 plus the "owner can be billed" check, so an invite
-- link made earlier (or inserted directly) can't seat someone for free.
CREATE OR REPLACE FUNCTION public.accept_home_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_invite public.home_invites%ROWTYPE;
  v_owner_tier text;
  v_existing_full integer;
  v_price_cents integer;
  v_share_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_invite FROM public.home_invites WHERE token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invite link is invalid or has expired');
  END IF;
  IF v_invite.owner_user_id = v_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'You can''t accept your own invite');
  END IF;
  IF v_invite.status = 'accepted' AND v_invite.accepted_by = v_uid THEN
    RETURN jsonb_build_object('success', true, 'already_accepted', true);
  END IF;
  IF v_invite.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invite has already been used or was revoked');
  END IF;
  IF v_invite.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invite link has expired');
  END IF;

  SELECT subscription_tier INTO v_owner_tier FROM public.profiles WHERE id = v_invite.owner_user_id;
  IF v_invite.grant_type = 'hero_member' AND v_owner_tier NOT IN ('homeowner_pro', 'multi_pro') THEN
    RETURN jsonb_build_object('success', false, 'error', 'The plan needed for this invite is no longer active');
  END IF;
  IF v_invite.grant_type IN ('multi_full', 'multi_single') AND v_owner_tier <> 'multi_pro' THEN
    RETURN jsonb_build_object('success', false, 'error', 'The plan needed for this invite is no longer active');
  END IF;
  IF NOT public.household_owner_can_be_billed(v_invite.owner_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'The plan needed for this invite is no longer active');
  END IF;

  IF v_invite.grant_type = 'hero_member' THEN
    v_price_cents := 200;
  ELSIF v_invite.grant_type = 'multi_full' THEN
    SELECT count(*) INTO v_existing_full
    FROM public.home_shares
    WHERE owner_user_id = v_invite.owner_user_id AND grant_type = 'multi_full' AND status = 'active';
    v_price_cents := CASE WHEN v_existing_full < 2 THEN 0 ELSE 1000 END;
  ELSE
    v_price_cents := 500;
  END IF;

  INSERT INTO public.home_shares (invite_id, owner_user_id, member_user_id, grant_type, home_id, monthly_addon_cents)
  VALUES (v_invite.id, v_invite.owner_user_id, v_uid, v_invite.grant_type, v_invite.home_id, v_price_cents)
  ON CONFLICT (owner_user_id, member_user_id, grant_type, home_id) DO UPDATE
    SET status = 'active', revoked_at = NULL
  RETURNING id INTO v_share_id;

  UPDATE public.home_invites SET status = 'accepted', accepted_by = v_uid, accepted_at = now() WHERE id = v_invite.id;

  RETURN jsonb_build_object('success', true, 'share_id', v_share_id, 'monthly_addon_cents', v_price_cents);
END;
$$;
REVOKE ALL ON FUNCTION public.accept_home_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_home_invite(text) TO authenticated;

-- Owners keep reading their shares; they no longer write them directly.
DROP POLICY IF EXISTS "Owners manage own shares" ON public.home_shares;
CREATE POLICY "Owners view own shares" ON public.home_shares
FOR SELECT TO authenticated
USING (owner_user_id = auth.uid());
REVOKE INSERT, UPDATE, DELETE ON public.home_shares FROM authenticated, anon;
