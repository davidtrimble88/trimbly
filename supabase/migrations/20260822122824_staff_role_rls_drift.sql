-- Reconciles staff RLS policies with the role model already shipped in
-- src/pages/staff/roles.ts's NAV_PERMISSIONS. The app_role enum gained
-- 'support' and 'analyst' values (20260519043142) and the nav layer was
-- updated to grant 'support'/'moderator' UI access to contacts, broadcasts,
-- and user notes — but the underlying policies on contact_messages,
-- broadcasts, and staff_notes were never updated to match, so those roles
-- see the nav link and then get silently RLS-denied underneath it. Purely
-- additive (nothing previously-granted access is revoked).

-- contact_messages: nav grants ["admin", "support"]
DROP POLICY IF EXISTS "Admins can view all contact messages" ON public.contact_messages;
CREATE POLICY "Admins can view all contact messages"
ON public.contact_messages FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

DROP POLICY IF EXISTS "Admins can update contact messages" ON public.contact_messages;
CREATE POLICY "Admins can update contact messages"
ON public.contact_messages FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

-- broadcasts: nav grants ["admin", "moderator", "support"]
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

-- staff_notes: used from both the Users page (nav: ["admin", "support"])
-- and the Providers page (nav: ["admin", "moderator"])
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

-- admin_list_user_emails(): nav grants the Users page to ["admin", "support"];
-- the function already allowed 'moderator' too (kept, since revoking existing
-- access is a behavior change of its own, not a drift fix) — just adding 'support'.
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
