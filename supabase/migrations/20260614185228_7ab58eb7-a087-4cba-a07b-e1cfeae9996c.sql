
-- 1. PROVIDERS: hide sensitive columns from anon via column-level grants
REVOKE SELECT ON public.providers FROM anon;
GRANT SELECT (
  id, user_id, business_name, category, description, bio,
  hourly_rate_min, hourly_rate_max, currency, licensed, insured,
  available, city, state, country, postal_code, website, years_experience,
  subscription_tier, slug, created_at, updated_at,
  gallery_urls, service_radius_miles, business_hours,
  emergency_available, emergency_end_time, emergency_rate_multiplier,
  emergency_start_time, emergency_weekends, featured, hidden, verified
) ON public.providers TO anon;
-- Excluded from anon: license_number, license_expiry, insurance_details, insurance_expiry, phone

-- 2. REVIEWS
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
CREATE POLICY "Public can view visible reviews"
ON public.reviews FOR SELECT TO public
USING (hidden = false);
CREATE POLICY "Authors can view own reviews"
ON public.reviews FOR SELECT TO authenticated
USING (auth.uid() = reviewer_id);

-- 3. PROFILES
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated can view own or public profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() = id
  OR (is_public = true AND suspended = false)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 4. ERROR_LOGS
DROP POLICY IF EXISTS "Anyone can report an error" ON public.error_logs;
CREATE POLICY "Users or anon can report own errors"
ON public.error_logs FOR INSERT TO public
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 5. REFERRALS: clear referee_email when referee signs up
CREATE OR REPLACE FUNCTION public.clear_referee_email_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.referee_user_id IS NOT NULL AND NEW.referee_email IS NOT NULL THEN
    NEW.referee_email := NULL;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_clear_referee_email ON public.referrals;
CREATE TRIGGER trg_clear_referee_email
BEFORE INSERT OR UPDATE ON public.referrals
FOR EACH ROW EXECUTE FUNCTION public.clear_referee_email_on_signup();
UPDATE public.referrals SET referee_email = NULL
WHERE referee_user_id IS NOT NULL AND referee_email IS NOT NULL;

-- 6. STORAGE: public read for job-photos
DROP POLICY IF EXISTS "job-photos: public read" ON storage.objects;
CREATE POLICY "job-photos: public read"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'job-photos');

-- 7. Lock down internal helper
REVOKE EXECUTE ON FUNCTION public.pro_active_bids_this_month(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pro_active_bids_this_month(uuid) TO service_role;
