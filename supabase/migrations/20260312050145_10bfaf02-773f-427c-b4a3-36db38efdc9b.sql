
CREATE TABLE public.blocked_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider_name text,
  provider_user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider_name),
  UNIQUE (user_id, provider_user_id)
);

ALTER TABLE public.blocked_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own blocks"
  ON public.blocked_providers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own blocks"
  ON public.blocked_providers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own blocks"
  ON public.blocked_providers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
