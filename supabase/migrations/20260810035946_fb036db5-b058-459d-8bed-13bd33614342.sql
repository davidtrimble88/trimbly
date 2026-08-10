CREATE TABLE public.archived_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text NOT NULL DEFAULT '',
  user_type text NOT NULL DEFAULT '',
  subscription_tier text NOT NULL DEFAULT '',
  email text,
  joined_at timestamptz,
  deleted_by uuid NOT NULL,
  reason text NOT NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.archived_users TO authenticated;
GRANT ALL ON public.archived_users TO service_role;

ALTER TABLE public.archived_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view archived users"
ON public.archived_users FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can archive users"
ON public.archived_users FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND deleted_by = auth.uid() AND length(btrim(reason)) >= 10);

CREATE INDEX idx_archived_users_created_at ON public.archived_users (created_at DESC);