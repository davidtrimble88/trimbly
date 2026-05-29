
-- =========================================================================
-- 1. PROVIDERS: hide sensitive columns from anonymous visitors
-- =========================================================================
-- Column-level privilege: anon can no longer SELECT these columns at all.
-- Authenticated users continue to see them (existing policy still applies).
REVOKE SELECT (phone, license_number, insurance_details, license_expiry, insurance_expiry)
  ON public.providers FROM anon;

-- =========================================================================
-- 2. PROFILES: anonymous visitors only see profiles flagged is_public
-- =========================================================================
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

CREATE POLICY "Public can view public profiles"
ON public.profiles
FOR SELECT
TO anon
USING (is_public = true AND suspended = false);

CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Hide moderation-only fields from anon entirely (defense in depth)
REVOKE SELECT (suspended_reason, subscription_tier) ON public.profiles FROM anon;

-- =========================================================================
-- 3. JOBS: stop letting every authenticated user read every job
-- =========================================================================
DROP POLICY IF EXISTS "Authenticated users can view open jobs" ON public.jobs;
DROP POLICY IF EXISTS "Homeowners can view own jobs" ON public.jobs;

-- Owners, assigned providers, admins
CREATE POLICY "Job participants and admins can view jobs"
ON public.jobs
FOR SELECT
TO authenticated
USING (
  auth.uid() = homeowner_id
  OR auth.uid() = (SELECT providers.user_id FROM providers WHERE providers.id = jobs.provider_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Service providers may view OPEN jobs (so they can bid). Other statuses are private.
CREATE POLICY "Providers can view open jobs to bid on"
ON public.jobs
FOR SELECT
TO authenticated
USING (
  status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.providers p WHERE p.user_id = auth.uid()
  )
);

-- =========================================================================
-- 4. EMAIL_OPTOUTS: had RLS enabled but zero policies — lock to admins
-- =========================================================================
CREATE POLICY "Admins can view email optouts"
ON public.email_optouts
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage email optouts"
ON public.email_optouts
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Edge functions use service_role which bypasses RLS, so unsubscribe flow keeps working.

-- =========================================================================
-- 5. STORAGE: stop anonymous enumeration of profile-images & job-photos
-- =========================================================================
-- Drop any broad SELECT policies for these buckets, then re-add scoped ones.
-- Public buckets still serve files via direct URLs; only LIST is restricted.

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (
        policyname ILIKE '%profile-images%'
        OR policyname ILIKE '%profile_images%'
        OR policyname ILIKE '%job-photos%'
        OR policyname ILIKE '%job_photos%'
        OR policyname ILIKE '%avatars%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- profile-images: owner can list/manage their own folder
CREATE POLICY "profile-images: owner reads own folder"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "profile-images: owner uploads own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "profile-images: owner updates own folder"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "profile-images: owner deletes own folder"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- job-photos: owner can list/manage their own folder
CREATE POLICY "job-photos: owner reads own folder"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'job-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "job-photos: owner uploads own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'job-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "job-photos: owner updates own folder"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'job-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "job-photos: owner deletes own folder"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'job-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =========================================================================
-- 6. SECURITY DEFINER functions: revoke public EXECUTE on internal helpers
-- =========================================================================
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_review_request_on_complete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lock_signed_agreement_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.providers_set_slug() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_contact_messages_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pro_active_bids_this_month(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pro_active_bids_this_month(uuid) TO authenticated;
-- has_role must remain callable by authenticated users (RLS policies use it)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
