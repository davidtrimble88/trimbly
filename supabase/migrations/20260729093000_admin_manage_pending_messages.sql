-- Staff already have a SELECT policy on pending_messages ("Admins can view all
-- pending messages") but no way to update or clear them, leaving the Outreach
-- staff page permanently read-only. Add matching admin UPDATE/DELETE policies
-- so staff can mark an item contacted or dismiss it once handled.
CREATE POLICY "Admins can update any pending message" ON public.pending_messages
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any pending message" ON public.pending_messages
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
