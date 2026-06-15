CREATE OR REPLACE FUNCTION public.mechanic_bids_this_month(_provider_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.vehicle_job_bids
  WHERE provider_id = _provider_id
    AND status IN ('pending', 'accepted')
    AND created_at >= date_trunc('month', now());
$$;

REVOKE EXECUTE ON FUNCTION public.mechanic_bids_this_month(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mechanic_bids_this_month(UUID) TO authenticated;

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