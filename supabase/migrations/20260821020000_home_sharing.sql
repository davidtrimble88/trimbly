-- Multi-account home sharing: Home Hero / Home Super Hero subscribers can
-- invite other people to view their home(s) via a shareable link, at
-- tiered per-seat pricing. Pricing here is TRACKED/DISPLAYED only — no
-- homeowner tier has real Stripe billing yet (set_own_subscription_tier is
-- a free flag-flip), so this is priced correctly and ready to wire to real
-- billing the day the base tiers get it, but doesn't charge anyone today.
--
-- Pricing:
--   hero_member  ($5 Home Hero owner)       $2/mo per person, uncapped
--   multi_full   ($20 Home Super Hero owner) $0 for first 2 accepted, $10/mo after
--   multi_single ($20 Home Super Hero owner) $5/mo flat, owner picks one home
--
-- Two tables: home_invites (pending, token-addressable, no member identity
-- yet) and home_shares (accepted grants, what RLS/pricing actually reads) —
-- different lifecycles and RLS shapes, matching the discount_codes /
-- discount_code_redemptions split already established in this schema.

CREATE TABLE public.home_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grant_type text NOT NULL CHECK (grant_type IN ('hero_member', 'multi_full', 'multi_single')),
  -- Required for multi_single (which one home); NULL for hero_member
  -- (implicitly the owner's one home) and multi_full (all of the owner's
  -- homes, present and future).
  home_id uuid REFERENCES public.homes(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  invitee_email text, -- optional, cosmetic only — this is a link-based invite, not email delivery
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_by uuid REFERENCES auth.users(id),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.home_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own invites" ON public.home_invites
FOR ALL TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());
-- No SELECT-by-token policy: an invite landing page looks up a token via
-- get_invite_preview() (SECURITY DEFINER) only — same reasoning as
-- discount_codes having no direct SELECT policy for regular users.

CREATE INDEX idx_home_invites_owner ON public.home_invites(owner_user_id, created_at DESC);
CREATE INDEX idx_home_invites_token ON public.home_invites(token);

CREATE TABLE public.home_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid REFERENCES public.home_invites(id) ON DELETE SET NULL,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grant_type text NOT NULL CHECK (grant_type IN ('hero_member', 'multi_full', 'multi_single')),
  home_id uuid REFERENCES public.homes(id) ON DELETE CASCADE, -- required for multi_single, NULL otherwise
  -- Price locked in at acceptance time — never retroactively reflows when
  -- other shares are revoked, so a member's bill doesn't silently change
  -- because someone unrelated left.
  monthly_addon_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE (owner_user_id, member_user_id, grant_type, home_id)
);

ALTER TABLE public.home_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own shares" ON public.home_shares
FOR ALL TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Members view own grants" ON public.home_shares
FOR SELECT TO authenticated
USING (member_user_id = auth.uid());
-- No INSERT/UPDATE policy for members: rows are only ever written by
-- accept_home_invite()/revoke_home_share() (SECURITY DEFINER) below, same
-- pattern as discount_code_redemptions having no direct client INSERT policy.

CREATE INDEX idx_home_shares_owner ON public.home_shares(owner_user_id) WHERE status = 'active';
CREATE INDEX idx_home_shares_member ON public.home_shares(member_user_id) WHERE status = 'active';
CREATE INDEX idx_home_shares_home ON public.home_shares(home_id) WHERE status = 'active';

-- ============================================================================
-- The single choke point every shared-read RLS policy calls through. Mirrors
-- has_role()/has_garage_addon() exactly. Re-checks the OWNER'S CURRENT
-- subscription_tier (not just that the home_shares row exists) — this is
-- what makes a downgrade suspend access live rather than needing a cleanup
-- job: the row stays, but stops granting access until the owner re-upgrades
-- or the share is explicitly revoked.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.user_has_home_access(_home_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.home_shares hs
    JOIN public.profiles p ON p.id = hs.owner_user_id
    WHERE hs.member_user_id = auth.uid()
      AND hs.status = 'active'
      AND (
        hs.home_id = _home_id
        OR (hs.grant_type = 'multi_full' AND hs.owner_user_id = (SELECT h.user_id FROM public.homes h WHERE h.id = _home_id))
      )
      AND (
        (hs.grant_type = 'hero_member' AND p.subscription_tier IN ('homeowner_pro', 'multi_pro'))
        OR (hs.grant_type IN ('multi_full', 'multi_single') AND p.subscription_tier = 'multi_pro')
      )
  );
$$;
REVOKE ALL ON FUNCTION public.user_has_home_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_has_home_access(uuid) TO authenticated;

-- Additive SELECT-only policies — owner policies on these tables are
-- untouched, and shared members never get INSERT/UPDATE/DELETE (read-only
-- viewing, per the feature's "view all properties" framing).
CREATE POLICY "Shared members can view shared homes" ON public.homes
FOR SELECT TO authenticated USING (public.user_has_home_access(id));

CREATE POLICY "Shared members can view shared home tasks" ON public.maintenance_tasks
FOR SELECT TO authenticated USING (public.user_has_home_access(home_id));

CREATE POLICY "Shared members can view shared home binder items" ON public.home_binder_items
FOR SELECT TO authenticated USING (public.user_has_home_access(home_id));

CREATE POLICY "Shared members can view shared home weather alerts" ON public.home_weather_alerts
FOR SELECT TO authenticated USING (public.user_has_home_access(home_id));

-- ============================================================================
-- RPCs
-- ============================================================================

-- Creates a pending invite link. Validates the caller's CURRENT tier is
-- eligible for the requested grant type and, for multi_single, that they
-- actually own the home they're scoping the invite to.
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
    RETURN jsonb_build_object('success', false, 'error', 'Home Hero (or higher) is required to invite someone');
  END IF;
  IF p_grant_type IN ('multi_full', 'multi_single') AND v_tier <> 'multi_pro' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Home Super Hero is required for this kind of invite');
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

-- Safe-to-call-unauthenticated preview for an invite landing page. Never
-- returns emails or other PII — just enough to render "X invited you to..."
CREATE OR REPLACE FUNCTION public.get_invite_preview(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.home_invites%ROWTYPE;
  v_owner_name text;
  v_home_name text;
  v_home_city text;
  v_home_state text;
BEGIN
  SELECT * INTO v_invite FROM public.home_invites WHERE token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invite link is invalid or has expired');
  END IF;
  IF v_invite.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invite has already been used or was revoked');
  END IF;
  IF v_invite.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invite link has expired');
  END IF;

  SELECT full_name INTO v_owner_name FROM public.profiles WHERE id = v_invite.owner_user_id;
  IF v_invite.home_id IS NOT NULL THEN
    SELECT name, city, state INTO v_home_name, v_home_city, v_home_state FROM public.homes WHERE id = v_invite.home_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'owner_name', coalesce(v_owner_name, 'A Trimbly homeowner'),
    'grant_type', v_invite.grant_type,
    'home_name', v_home_name,
    'home_city', v_home_city,
    'home_state', v_home_state,
    'expires_at', v_invite.expires_at
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_invite_preview(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite_preview(text) TO anon, authenticated;

-- Accepts a pending invite: re-validates the owner's CURRENT tier still
-- supports the grant type (they may have downgraded since creating the
-- link), computes and locks in monthly_addon_cents, creates the share, and
-- marks the invite accepted. Idempotent on re-accepting an already-active
-- identical grant.
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

-- Owner OR the member themself (self-leave) may revoke.
CREATE OR REPLACE FUNCTION public.revoke_home_share(p_share_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_share public.home_shares%ROWTYPE;
BEGIN
  SELECT * INTO v_share FROM public.home_shares WHERE id = p_share_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Share not found');
  END IF;
  IF v_uid IS NULL OR (v_uid <> v_share.owner_user_id AND v_uid <> v_share.member_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  UPDATE public.home_shares SET status = 'revoked', revoked_at = now() WHERE id = p_share_id;
  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_home_share(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_home_share(uuid) TO authenticated;
