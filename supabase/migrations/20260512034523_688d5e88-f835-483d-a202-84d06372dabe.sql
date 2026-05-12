
CREATE TABLE public.error_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  message text NOT NULL DEFAULT '',
  stack text,
  source text NOT NULL DEFAULT 'window',
  severity text NOT NULL DEFAULT 'error',
  url text,
  route text,
  component text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'new',
  ai_suggestion text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can report an error"
  ON public.error_logs FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins can view all errors"
  ON public.error_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update errors"
  ON public.error_logs FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete errors"
  ON public.error_logs FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_error_logs_created_at ON public.error_logs (created_at DESC);
CREATE INDEX idx_error_logs_status ON public.error_logs (status);
CREATE INDEX idx_error_logs_source ON public.error_logs (source);
