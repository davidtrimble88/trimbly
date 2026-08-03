-- Team.tsx currently forces admins to manually copy a user's raw UUID from
-- the Users tab to grant staff access. auth.users isn't reachable from the
-- client, so this SECURITY DEFINER function resolves an email to a user_id
-- (plus display name) for the Team page's "Add staff member" form. Callable
-- by any authenticated user, but only returns a result to admins — everyone
-- else gets an empty set, matching the existing has_role-gated pattern used
-- elsewhere (e.g. the admin RLS policies on pending_messages).
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
