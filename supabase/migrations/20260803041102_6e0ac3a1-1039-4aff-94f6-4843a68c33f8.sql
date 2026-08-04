DROP POLICY "Pros create own referrals" ON public.referrals;

CREATE POLICY "Pros create own referrals" ON public.referrals
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = referrer_user_id
  AND EXISTS (
    SELECT 1 FROM public.providers p
    WHERE p.id = referrals.referrer_provider_id
      AND p.user_id = auth.uid()
  )
);