ALTER TABLE public.vehicle_jobs
  ADD CONSTRAINT vehicle_jobs_service_type_check
  CHECK (service_type IN ('auto', 'motorcycle')) NOT VALID;

ALTER TABLE public.vehicle_jobs
  VALIDATE CONSTRAINT vehicle_jobs_service_type_check;