-- Lock vehicle_jobs.service_type to the two values the UI has ever offered
-- (GarageJobs.tsx only ever inserts 'auto' or 'motorcycle'). Using NOT VALID
-- + VALIDATE CONSTRAINT so any unexpected legacy row fails this migration
-- loudly instead of silently corrupting data or blocking unrelated writes.
ALTER TABLE public.vehicle_jobs
  ADD CONSTRAINT vehicle_jobs_service_type_check
  CHECK (service_type IN ('auto', 'motorcycle')) NOT VALID;

ALTER TABLE public.vehicle_jobs
  VALIDATE CONSTRAINT vehicle_jobs_service_type_check;
