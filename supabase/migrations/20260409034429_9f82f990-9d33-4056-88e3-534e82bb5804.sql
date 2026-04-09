
-- Create job_bids table
CREATE TABLE public.job_bids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  bid_amount NUMERIC,
  estimated_hours NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  call_approved BOOLEAN NOT NULL DEFAULT false,
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(job_id, provider_id)
);

ALTER TABLE public.job_bids ENABLE ROW LEVEL SECURITY;

-- Pros can view their own bids
CREATE POLICY "Providers can view own bids"
  ON public.job_bids FOR SELECT TO authenticated
  USING (
    provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid())
  );

-- Homeowners can view bids on their jobs
CREATE POLICY "Homeowners can view bids on own jobs"
  ON public.job_bids FOR SELECT TO authenticated
  USING (
    job_id IN (SELECT id FROM public.jobs WHERE homeowner_id = auth.uid())
  );

-- Pros can insert bids (must own the provider profile)
CREATE POLICY "Providers can insert bids"
  ON public.job_bids FOR INSERT TO authenticated
  WITH CHECK (
    provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid())
  );

-- Pros can update their own bids (message, amount)
CREATE POLICY "Providers can update own bids"
  ON public.job_bids FOR UPDATE TO authenticated
  USING (
    provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid())
  );

-- Homeowners can update bids on their jobs (accept/reject, approve calls)
CREATE POLICY "Homeowners can update bids on own jobs"
  ON public.job_bids FOR UPDATE TO authenticated
  USING (
    job_id IN (SELECT id FROM public.jobs WHERE homeowner_id = auth.uid())
  );

-- Pros can delete their own bids
CREATE POLICY "Providers can delete own bids"
  ON public.job_bids FOR DELETE TO authenticated
  USING (
    provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid())
  );

-- Allow all authenticated users to view open jobs (for job board)
CREATE POLICY "Authenticated users can view open jobs"
  ON public.jobs FOR SELECT TO authenticated
  USING (true);

-- Enable realtime for job_bids
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_bids;
