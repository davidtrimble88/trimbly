
CREATE TABLE public.vehicle_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  service_type TEXT NOT NULL DEFAULT 'auto',
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',
  mobile_service BOOLEAN NOT NULL DEFAULT false,
  photo_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  budget_min NUMERIC,
  budget_max NUMERIC,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_jobs TO authenticated;
GRANT ALL ON public.vehicle_jobs TO service_role;
ALTER TABLE public.vehicle_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own vehicle jobs" ON public.vehicle_jobs
  FOR SELECT TO authenticated USING (auth.uid() = owner_user_id);
CREATE POLICY "Owner can insert vehicle jobs with addon" ON public.vehicle_jobs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_user_id AND public.has_garage_addon(auth.uid()));
CREATE POLICY "Owner can update own vehicle jobs" ON public.vehicle_jobs
  FOR UPDATE TO authenticated USING (auth.uid() = owner_user_id);
CREATE POLICY "Owner can delete own vehicle jobs" ON public.vehicle_jobs
  FOR DELETE TO authenticated USING (auth.uid() = owner_user_id);
CREATE POLICY "Providers can view open vehicle jobs" ON public.vehicle_jobs
  FOR SELECT TO authenticated
  USING (status = 'open' AND EXISTS (SELECT 1 FROM public.providers p WHERE p.user_id = auth.uid()));
CREATE POLICY "Admins can view all vehicle jobs" ON public.vehicle_jobs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX vehicle_jobs_owner_idx ON public.vehicle_jobs(owner_user_id);
CREATE INDEX vehicle_jobs_status_idx ON public.vehicle_jobs(status);

CREATE TRIGGER vehicle_jobs_updated_at BEFORE UPDATE ON public.vehicle_jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.vehicle_job_bids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_job_id UUID NOT NULL REFERENCES public.vehicle_jobs(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  bid_amount NUMERIC,
  estimated_hours NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  call_approved BOOLEAN NOT NULL DEFAULT false,
  phone_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vehicle_job_id, provider_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_job_bids TO authenticated;
GRANT ALL ON public.vehicle_job_bids TO service_role;
ALTER TABLE public.vehicle_job_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Provider can place vehicle bid" ON public.vehicle_job_bids
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_id AND p.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.vehicle_jobs j WHERE j.id = vehicle_job_id AND j.status = 'open')
  );
CREATE POLICY "Provider can view own vehicle bids" ON public.vehicle_job_bids
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_id AND p.user_id = auth.uid()));
CREATE POLICY "Provider can update own vehicle bids" ON public.vehicle_job_bids
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_id AND p.user_id = auth.uid()));
CREATE POLICY "Owner can view bids on own vehicle jobs" ON public.vehicle_job_bids
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vehicle_jobs j WHERE j.id = vehicle_job_id AND j.owner_user_id = auth.uid()));
CREATE POLICY "Owner can update bids on own vehicle jobs" ON public.vehicle_job_bids
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vehicle_jobs j WHERE j.id = vehicle_job_id AND j.owner_user_id = auth.uid()));
CREATE POLICY "Admins can view all vehicle bids" ON public.vehicle_job_bids
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX vehicle_job_bids_job_idx ON public.vehicle_job_bids(vehicle_job_id);
CREATE INDEX vehicle_job_bids_provider_idx ON public.vehicle_job_bids(provider_id);

CREATE TRIGGER vehicle_job_bids_updated_at BEFORE UPDATE ON public.vehicle_job_bids
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
