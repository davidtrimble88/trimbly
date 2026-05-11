-- Phase 1: Pro features schema additions

-- 1. Emergency availability + rate multiplier
ALTER TABLE public.providers 
  ADD COLUMN IF NOT EXISTS emergency_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS emergency_rate_multiplier numeric NOT NULL DEFAULT 1.5;

-- 2. License & insurance expiry tracking
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS license_expiry date,
  ADD COLUMN IF NOT EXISTS insurance_expiry date;

-- 3. Profile views tracking for lead analytics
CREATE TABLE IF NOT EXISTS public.profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  viewer_id uuid,
  viewed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_views_provider ON public.profile_views(provider_id, viewed_at DESC);

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- Anyone (even anon) can insert a view event
CREATE POLICY "Anyone can record a profile view"
  ON public.profile_views FOR INSERT
  TO public
  WITH CHECK (true);

-- Provider can view their own analytics
CREATE POLICY "Providers can view own profile views"
  ON public.profile_views FOR SELECT
  TO authenticated
  USING (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()));

-- Admins can view all
CREATE POLICY "Admins can view all profile views"
  ON public.profile_views FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Review requests tracking (so we don't spam)
CREATE TABLE IF NOT EXISTS public.review_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  homeowner_id uuid NOT NULL,
  job_id uuid,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(provider_id, homeowner_id, job_id)
);

ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can insert review requests"
  ON public.review_requests FOR INSERT
  TO authenticated
  WITH CHECK (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()));

CREATE POLICY "Providers can view own review requests"
  ON public.review_requests FOR SELECT
  TO authenticated
  USING (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()));

CREATE POLICY "Homeowners can view review requests sent to them"
  ON public.review_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = homeowner_id);