CREATE TABLE public.search_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  search_type TEXT NOT NULL DEFAULT 'provider',
  query TEXT NOT NULL DEFAULT '',
  category TEXT,
  location TEXT,
  results_count INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a search"
  ON public.search_logs
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins can view all search logs"
  ON public.search_logs
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own search logs"
  ON public.search_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_search_logs_created_at ON public.search_logs (created_at DESC);
CREATE INDEX idx_search_logs_type ON public.search_logs (search_type);
CREATE INDEX idx_search_logs_user ON public.search_logs (user_id);
CREATE INDEX idx_search_logs_query_trgm ON public.search_logs (lower(query));