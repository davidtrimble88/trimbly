
-- Saved providers
CREATE TABLE public.saved_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider_id)
);

ALTER TABLE public.saved_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own saved providers" ON public.saved_providers
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own saved providers" ON public.saved_providers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own saved providers" ON public.saved_providers
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Photos on jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS photo_urls text[] NOT NULL DEFAULT '{}';

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('job-photos','job-photos', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Job photos are publicly viewable" ON storage.objects
  FOR SELECT USING (bucket_id = 'job-photos');
CREATE POLICY "Users upload own job photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'job-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own job photos" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'job-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own job photos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'job-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
