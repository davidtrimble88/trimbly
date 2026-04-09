
-- Create coverage_documents table
CREATE TABLE public.coverage_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  home_id UUID REFERENCES public.homes(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL DEFAULT 'warranty',
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.coverage_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coverage documents"
  ON public.coverage_documents FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own coverage documents"
  ON public.coverage_documents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own coverage documents"
  ON public.coverage_documents FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own coverage documents"
  ON public.coverage_documents FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('coverage-docs', 'coverage-docs', false);

CREATE POLICY "Users can upload coverage docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'coverage-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own coverage docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'coverage-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own coverage docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'coverage-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
