
DROP POLICY IF EXISTS "Anyone can record a search" ON public.search_logs;
CREATE POLICY "Record search (own or anon)"
ON public.search_logs FOR INSERT TO public
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can record a profile view" ON public.profile_views;
CREATE POLICY "Record profile view (own or anon)"
ON public.profile_views FOR INSERT TO public
WITH CHECK (viewer_id IS NULL OR viewer_id = auth.uid());

-- Remove broad public list policy on job-photos; files remain accessible via public CDN URLs
DROP POLICY IF EXISTS "job-photos: public read" ON storage.objects;
