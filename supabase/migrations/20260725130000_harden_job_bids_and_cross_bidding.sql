-- Harden job_bids the same way vehicle_job_bids already is:
--  1. Re-grant EXECUTE on pro_active_bids_this_month so it can run inside an
--     RLS policy evaluated as `authenticated` (it exists, was defensively
--     locked to service_role-only before ever being wired into a policy).
--  2. Replace the job_bids INSERT policy (today: ownership-only) with one
--     that also requires provider_type = 'home' (blocks mechanics from ever
--     bidding on general home-service jobs), the target job still open for
--     bidding, and a free-tier quota of 5 active bids/month.
--  3. Close the matching gap on vehicle_job_bids: its INSERT policy never
--     actually required provider_type = 'mechanic', so a home-service pro's
--     provider row could bid on vehicle jobs today. Add that check.

GRANT EXECUTE ON FUNCTION public.pro_active_bids_this_month(uuid) TO authenticated;

DROP POLICY IF EXISTS "Providers can insert bids" ON public.job_bids;

CREATE POLICY "Providers can insert bids"
ON public.job_bids
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.providers p
    WHERE p.id = job_bids.provider_id
      AND p.user_id = auth.uid()
      AND p.provider_type = 'home'
  )
  AND EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_bids.job_id
      AND j.status IN ('pending', 'open')
  )
  AND (
    NOT EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = job_bids.provider_id
        AND p.subscription_tier = 'free'
    )
    OR public.pro_active_bids_this_month(job_bids.provider_id) < 5
  )
);

DROP POLICY IF EXISTS "Provider can place vehicle bid" ON public.vehicle_job_bids;

CREATE POLICY "Provider can place vehicle bid"
ON public.vehicle_job_bids
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.providers p
    WHERE p.id = vehicle_job_bids.provider_id
      AND p.user_id = auth.uid()
      AND p.provider_type = 'mechanic'
  )
  AND EXISTS (
    SELECT 1 FROM public.vehicle_jobs j
    WHERE j.id = vehicle_job_bids.vehicle_job_id
      AND j.status = 'open'
  )
  AND (
    NOT EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = vehicle_job_bids.provider_id
        AND p.provider_type = 'mechanic'
        AND p.subscription_tier = 'free'
    )
    OR public.mechanic_bids_this_month(vehicle_job_bids.provider_id) < 3
  )
);
