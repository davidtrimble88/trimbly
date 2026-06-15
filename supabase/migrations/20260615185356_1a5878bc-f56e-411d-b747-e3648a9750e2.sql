
-- 1. Providers: restrict sensitive columns from anon role
REVOKE SELECT ON public.providers FROM anon;
GRANT SELECT (
  id, user_id, business_name, category, description,
  hourly_rate_min, hourly_rate_max, currency,
  licensed, available, city, state, country, website,
  years_experience, created_at, updated_at, insured,
  subscription_tier, verified, featured, hidden, postal_code,
  bio, gallery_urls, emergency_available, emergency_rate_multiplier,
  service_radius_miles, business_hours,
  emergency_start_time, emergency_end_time, emergency_weekends,
  slug, provider_type
) ON public.providers TO anon;

-- 2. Reviews: admin can view all reviews including hidden ones
DROP POLICY IF EXISTS "Admins can view all reviews" ON public.reviews;
CREATE POLICY "Admins can view all reviews"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Bids: phone number cannot be stored unless call has been approved
-- First, clear any existing phone numbers on rows where call_approved is false
UPDATE public.job_bids SET phone_number = NULL WHERE call_approved = false AND phone_number IS NOT NULL;
UPDATE public.vehicle_job_bids SET phone_number = NULL WHERE call_approved = false AND phone_number IS NOT NULL;

ALTER TABLE public.job_bids DROP CONSTRAINT IF EXISTS job_bids_phone_requires_approval;
ALTER TABLE public.job_bids ADD CONSTRAINT job_bids_phone_requires_approval
  CHECK (phone_number IS NULL OR call_approved = true);

ALTER TABLE public.vehicle_job_bids DROP CONSTRAINT IF EXISTS vehicle_job_bids_phone_requires_approval;
ALTER TABLE public.vehicle_job_bids ADD CONSTRAINT vehicle_job_bids_phone_requires_approval
  CHECK (phone_number IS NULL OR call_approved = true);
