-- Tighten equipment_rentals INSERT: owner_provider_id (if set) must belong to caller
DROP POLICY IF EXISTS "Owners insert own rentals" ON public.equipment_rentals;
CREATE POLICY "Owners insert own rentals"
  ON public.equipment_rentals FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = owner_user_id
    AND (
      owner_provider_id IS NULL
      OR owner_provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid())
    )
  );

-- Also tighten UPDATE to prevent switching owner_provider_id to a provider not owned by the caller
DROP POLICY IF EXISTS "Owners update own rentals" ON public.equipment_rentals;
CREATE POLICY "Owners update own rentals"
  ON public.equipment_rentals FOR UPDATE TO authenticated
  USING (auth.uid() = owner_user_id)
  WITH CHECK (
    auth.uid() = owner_user_id
    AND (
      owner_provider_id IS NULL
      OR owner_provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid())
    )
  );

-- Tighten rental_agreements INSERT: owner/provider fields must match the referenced rental,
-- and renter_provider_id (if set) must belong to the caller.
DROP POLICY IF EXISTS "Renters create agreements" ON public.rental_agreements;
CREATE POLICY "Renters create agreements"
  ON public.rental_agreements FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = renter_user_id
    AND EXISTS (
      SELECT 1 FROM public.equipment_rentals r
      WHERE r.id = rental_agreements.rental_id
        AND r.owner_user_id = rental_agreements.owner_user_id
        AND r.owner_provider_id IS NOT DISTINCT FROM rental_agreements.owner_provider_id
    )
    AND (
      renter_provider_id IS NULL
      OR renter_provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid())
    )
  );
