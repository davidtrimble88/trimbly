-- My Garage was the one paid add-on that never got the free-beta bypass
-- homeowner/provider/mechanic tiers already have (set_own_subscription_tier,
-- set_own_provider_tier) — it always ran a real Stripe checkout, meaning it
-- was the one place a free-beta user could actually be charged a real card.
-- This RPC is the Garage-side mirror of those two: self-scoped, no Stripe.
CREATE OR REPLACE FUNCTION public.set_own_garage_subscription(p_interval text DEFAULT 'monthly')
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
  IF p_interval NOT IN ('monthly', 'yearly') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid interval');
  END IF;

  INSERT INTO public.garage_subscriptions (user_id, status, plan_interval, current_period_end)
  VALUES (v_uid, 'active', p_interval, NULL)
  ON CONFLICT (user_id) DO UPDATE
  SET status = 'active', plan_interval = p_interval, current_period_end = NULL, canceled_at = NULL;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.set_own_garage_subscription(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_own_garage_subscription(text) TO authenticated;
