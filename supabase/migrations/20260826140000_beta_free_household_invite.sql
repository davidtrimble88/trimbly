-- Free beta: anyone can invite one household member ("hero_member") regardless
-- of tier. Paid multi-home invite types keep their tier gate.
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

  -- hero_member: free for everyone during the beta (no tier check)

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
