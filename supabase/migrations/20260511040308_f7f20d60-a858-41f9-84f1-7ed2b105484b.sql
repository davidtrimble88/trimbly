
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS slug TEXT;

UPDATE public.providers
SET slug = trim(both '-' from regexp_replace(lower(coalesce(business_name,'') || '-' || coalesce(city,'') || '-' || substr(id::text, 1, 6)), '[^a-z0-9]+', '-', 'g'))
WHERE slug IS NULL OR slug = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_providers_slug ON public.providers(slug);

CREATE OR REPLACE FUNCTION public.providers_set_slug()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := trim(both '-' from regexp_replace(lower(coalesce(NEW.business_name,'') || '-' || coalesce(NEW.city,'') || '-' || substr(NEW.id::text, 1, 6)), '[^a-z0-9]+', '-', 'g'));
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.providers_set_slug() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_providers_set_slug ON public.providers;
CREATE TRIGGER trg_providers_set_slug
BEFORE INSERT OR UPDATE OF business_name, city ON public.providers
FOR EACH ROW EXECUTE FUNCTION public.providers_set_slug();

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_provider_id UUID NOT NULL,
  referrer_user_id UUID NOT NULL,
  code TEXT NOT NULL UNIQUE,
  referee_email TEXT,
  referee_user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  credit_months NUMERIC NOT NULL DEFAULT 0,
  signed_up_at TIMESTAMPTZ,
  credited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pros view own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Pros create own referrals" ON public.referrals;
CREATE POLICY "Pros view own referrals" ON public.referrals
  FOR SELECT TO authenticated USING (auth.uid() = referrer_user_id);
CREATE POLICY "Pros create own referrals" ON public.referrals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = referrer_user_id);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(code);

ALTER TABLE public.review_requests
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'in_app',
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.pro_active_bids_this_month(_provider_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.job_bids
  WHERE provider_id = _provider_id
    AND status IN ('pending', 'accepted')
    AND created_at >= date_trunc('month', now());
$$;

REVOKE EXECUTE ON FUNCTION public.pro_active_bids_this_month(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pro_active_bids_this_month(UUID) TO authenticated;

CREATE OR REPLACE VIEW public.provider_response_times
WITH (security_invoker = true)
AS
WITH inbound AS (
  SELECT m.id, m.recipient_id AS provider_user_id, m.sender_id AS homeowner_id, m.created_at AS inbound_at
  FROM public.messages m
  WHERE m.created_at >= now() - interval '90 days'
), replies AS (
  SELECT i.provider_user_id, i.inbound_at,
    (SELECT MIN(o.created_at) FROM public.messages o
     WHERE o.sender_id = i.provider_user_id
       AND o.recipient_id = i.homeowner_id
       AND o.created_at > i.inbound_at
       AND o.created_at < i.inbound_at + interval '7 days') AS reply_at
  FROM inbound i
)
SELECT p.id AS provider_id,
  ROUND(AVG(EXTRACT(EPOCH FROM (r.reply_at - r.inbound_at)) / 60.0)::numeric, 1) AS avg_reply_minutes,
  COUNT(r.reply_at)::int AS sample_size
FROM public.providers p
JOIN replies r ON r.provider_user_id = p.user_id
WHERE r.reply_at IS NOT NULL
GROUP BY p.id;
