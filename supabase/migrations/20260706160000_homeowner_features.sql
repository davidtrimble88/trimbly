-- ============================================================================
-- 1. Weather-triggered maintenance alerts
-- ============================================================================
ALTER TABLE public.homes ADD COLUMN latitude NUMERIC;
ALTER TABLE public.homes ADD COLUMN longitude NUMERIC;

CREATE TABLE public.home_weather_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  home_id UUID NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- freeze | heavy_rain | high_wind | extreme_heat
  message TEXT NOT NULL,
  valid_date DATE NOT NULL,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (home_id, alert_type, valid_date)
);
CREATE INDEX idx_home_weather_alerts_home ON public.home_weather_alerts(home_id, valid_date DESC);
ALTER TABLE public.home_weather_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own home weather alerts"
  ON public.home_weather_alerts FOR SELECT TO authenticated
  USING (home_id IN (SELECT id FROM public.homes WHERE user_id = auth.uid()));

CREATE POLICY "Owners can dismiss own home weather alerts"
  ON public.home_weather_alerts FOR UPDATE TO authenticated
  USING (home_id IN (SELECT id FROM public.homes WHERE user_id = auth.uid()));

-- Writes (insert) happen only via the scheduled/edge-function service role,
-- which bypasses RLS — no INSERT policy needed for authenticated users.

-- ============================================================================
-- 2. Home resale/history report + multi-property: tie jobs to a specific
--    property so multi-home owners get an accurate per-property record.
-- ============================================================================
ALTER TABLE public.jobs ADD COLUMN home_id UUID REFERENCES public.homes(id) ON DELETE SET NULL;
CREATE INDEX idx_jobs_home_id ON public.jobs(home_id);

-- ============================================================================
-- 3. Pricing transparency: no new tables needed. Aggregation happens in the
--    pricing-insights edge function (service role), which reads job_bids and
--    quotes directly and returns only aggregate numbers — never raw bids —
--    so no RLS change is needed on those tables.
-- ============================================================================

-- ============================================================================
-- 4. Escrow / milestone payments (Stripe Connect Express)
-- ============================================================================
ALTER TABLE public.providers
  ADD COLUMN stripe_connect_account_id TEXT,
  ADD COLUMN stripe_connect_charges_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN stripe_connect_payouts_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE public.job_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  homeowner_id UUID NOT NULL,
  title TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  status TEXT NOT NULL DEFAULT 'pending', -- pending | funded | released | refunded
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  transfer_group TEXT,
  funded_at TIMESTAMP WITH TIME ZONE,
  released_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_job_milestones_provider ON public.job_milestones(provider_id, created_at DESC);
CREATE INDEX idx_job_milestones_homeowner ON public.job_milestones(homeowner_id, created_at DESC);
ALTER TABLE public.job_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can create milestones on their own quotes"
  ON public.job_milestones FOR INSERT TO authenticated
  WITH CHECK (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()));

CREATE POLICY "Providers can view own milestones"
  ON public.job_milestones FOR SELECT TO authenticated
  USING (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()));

CREATE POLICY "Homeowners can view own milestones"
  ON public.job_milestones FOR SELECT TO authenticated
  USING (auth.uid() = homeowner_id);

CREATE POLICY "Providers can delete their own unpaid milestones"
  ON public.job_milestones FOR DELETE TO authenticated
  USING (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()) AND status = 'pending');

-- Status transitions (funded/released/refunded) only ever happen via edge
-- functions using the service role — no UPDATE policy for authenticated
-- users, so a homeowner or provider can never mark their own milestone paid.

CREATE TRIGGER trg_job_milestones_updated BEFORE UPDATE ON public.job_milestones
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
