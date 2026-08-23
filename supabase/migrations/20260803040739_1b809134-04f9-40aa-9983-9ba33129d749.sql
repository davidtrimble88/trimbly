INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = lower('davidharrisontrimble@icloud.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- These two policies were already created by
-- 20260729093000_admin_manage_pending_messages.sql; guarded with DROP
-- POLICY IF EXISTS so replaying migrations from scratch doesn't fail with
-- "policy already exists" (Postgres has no CREATE POLICY IF NOT EXISTS).
DROP POLICY IF EXISTS "Admins can update any pending message" ON public.pending_messages;
CREATE POLICY "Admins can update any pending message" ON public.pending_messages
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete any pending message" ON public.pending_messages;
CREATE POLICY "Admins can delete any pending message" ON public.pending_messages
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.find_user_by_email(_email text)
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, coalesce(p.full_name, '')
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE public.has_role(auth.uid(), 'admin')
    AND lower(u.email) = lower(_email)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.find_user_by_email(text) TO authenticated;