-- Reconciles staff RLS policies with the role model already shipped in
-- src/pages/staff/roles.ts's NAV_PERMISSIONS.

DROP POLICY IF EXISTS "Admins can view all contact messages" ON public.contact_messages;
CREATE POLICY "Admins can view all contact messages"
ON public.contact_messages FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

DROP POLICY IF EXISTS "Admins can update contact messages" ON public.contact_messages;
CREATE POLICY "Admins can update contact messages"
ON public.contact_messages FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

DROP POLICY IF EXISTS "Admins manage broadcasts" ON public.broadcasts;
CREATE POLICY "Admins manage broadcasts"
ON public.broadcasts FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
  OR public.has_role(auth.uid(), 'support')
)
WITH CHECK (
  (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
    OR public.has_role(auth.uid(), 'support')
  )
  AND auth.uid() = author_id
);

DROP POLICY IF EXISTS "Admins manage staff notes" ON public.staff_notes;
CREATE POLICY "Admins manage staff notes"
ON public.staff_notes FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
  OR public.has_role(auth.uid(), 'support')
)
WITH CHECK (
  (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
    OR public.has_role(auth.uid(), 'support')
  )
  AND auth.uid() = author_id
);

CREATE OR REPLACE FUNCTION public.admin_list_user_emails()
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.email::text
  FROM auth.users u
  WHERE public.has_role(auth.uid(), 'admin')
     OR public.has_role(auth.uid(), 'moderator')
     OR public.has_role(auth.uid(), 'support');
$$;