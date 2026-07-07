-- ============================================================================
-- 1. Vehicle job video (parity with photo_urls, using the same job-photos bucket)
-- ============================================================================
ALTER TABLE public.vehicle_jobs ADD COLUMN video_url TEXT;

-- ============================================================================
-- 2. Mileage history (vehicles.current_mileage was a single overwritable value
--    with no trend). Distinct from the pro-side `mileage_logs` table, which
--    tracks a provider's own driving for tax purposes.
-- ============================================================================
CREATE TABLE public.vehicle_mileage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL,
  mileage INTEGER NOT NULL,
  logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL DEFAULT 'manual', -- manual | service_record | fuel_log
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_vehicle_mileage_logs_vehicle ON public.vehicle_mileage_logs(vehicle_id, logged_at DESC);
ALTER TABLE public.vehicle_mileage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can view own mileage logs" ON public.vehicle_mileage_logs FOR SELECT TO authenticated USING (auth.uid() = owner_user_id);
CREATE POLICY "Owners can insert own mileage logs" ON public.vehicle_mileage_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "Owners can delete own mileage logs" ON public.vehicle_mileage_logs FOR DELETE TO authenticated USING (auth.uid() = owner_user_id);

-- ============================================================================
-- 3. Fuel log: MPG + cost-per-mile tracking
-- ============================================================================
CREATE TABLE public.vehicle_fuel_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL,
  logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
  mileage INTEGER NOT NULL,
  volume NUMERIC NOT NULL, -- gallons or liters, per vehicle.mileage_unit convention (mi->gal, km->L)
  cost NUMERIC,
  full_tank BOOLEAN NOT NULL DEFAULT true,
  station TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_vehicle_fuel_logs_vehicle ON public.vehicle_fuel_logs(vehicle_id, logged_at DESC);
ALTER TABLE public.vehicle_fuel_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can view own fuel logs" ON public.vehicle_fuel_logs FOR SELECT TO authenticated USING (auth.uid() = owner_user_id);
CREATE POLICY "Owners can insert own fuel logs" ON public.vehicle_fuel_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "Owners can update own fuel logs" ON public.vehicle_fuel_logs FOR UPDATE TO authenticated USING (auth.uid() = owner_user_id);
CREATE POLICY "Owners can delete own fuel logs" ON public.vehicle_fuel_logs FOR DELETE TO authenticated USING (auth.uid() = owner_user_id);
CREATE TRIGGER trg_vehicle_fuel_logs_updated BEFORE UPDATE ON public.vehicle_fuel_logs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================================
-- 4. Digital inspection reports mechanics can send to vehicle owners
-- ============================================================================
CREATE TABLE public.vehicle_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  vehicle_job_id UUID REFERENCES public.vehicle_jobs(id) ON DELETE SET NULL,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Vehicle Inspection',
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | sent
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_vehicle_inspections_vehicle ON public.vehicle_inspections(vehicle_id, created_at DESC);
CREATE INDEX idx_vehicle_inspections_provider ON public.vehicle_inspections(provider_id, created_at DESC);
ALTER TABLE public.vehicle_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers manage own inspections"
  ON public.vehicle_inspections FOR ALL TO authenticated
  USING (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()))
  WITH CHECK (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()));

CREATE POLICY "Owners can view sent inspections for their vehicles"
  ON public.vehicle_inspections FOR SELECT TO authenticated
  USING (auth.uid() = owner_user_id AND status = 'sent');

CREATE TRIGGER trg_vehicle_inspections_updated BEFORE UPDATE ON public.vehicle_inspections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.vehicle_inspection_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id UUID NOT NULL REFERENCES public.vehicle_inspections(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'general',
  item_name TEXT NOT NULL,
  condition TEXT NOT NULL DEFAULT 'ok', -- ok | watch | needs_attention
  notes TEXT,
  photo_url TEXT,
  cost_estimate NUMERIC,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_vehicle_inspection_items_inspection ON public.vehicle_inspection_items(inspection_id, sort_order);
ALTER TABLE public.vehicle_inspection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers manage own inspection items"
  ON public.vehicle_inspection_items FOR ALL TO authenticated
  USING (inspection_id IN (SELECT id FROM public.vehicle_inspections WHERE provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid())))
  WITH CHECK (inspection_id IN (SELECT id FROM public.vehicle_inspections WHERE provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid())));

CREATE POLICY "Owners can view items on sent inspections"
  ON public.vehicle_inspection_items FOR SELECT TO authenticated
  USING (inspection_id IN (SELECT id FROM public.vehicle_inspections WHERE owner_user_id = auth.uid() AND status = 'sent'));

-- Storage for inspection photos: reuse the existing public job-photos bucket
-- (already public + owner-scoped-by-folder) since these photos are meant to
-- be shareable with the vehicle owner, same trust level as job photos.

-- ============================================================================
-- 5. Real subscription billing (Stripe) — replaces free self-service tier
--    grants on `providers` (home pros + mechanics share this table) and
--    `garage_subscriptions` (My Garage add-on).
-- ============================================================================
ALTER TABLE public.providers
  ADD COLUMN stripe_customer_id TEXT,
  ADD COLUMN stripe_subscription_id TEXT,
  ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'none', -- none | active | past_due | canceled
  ADD COLUMN subscription_current_period_end TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.garage_subscriptions
  ADD COLUMN stripe_customer_id TEXT,
  ADD COLUMN stripe_subscription_id TEXT;

-- Extend the existing client-tamper guard (added for `verified`) to also
-- cover `subscription_tier` and `subscription_status` — a provider must not
-- be able to grant themselves a paid tier via a direct client update, same
-- as they can't set `verified` directly. Trusted writes (webhook via service
-- role, or our own sync functions) pass through the same session flag.
CREATE OR REPLACE FUNCTION public.protect_provider_verified_column()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('app.trusted_verification_sync', true) IS DISTINCT FROM 'on'
     AND NOT has_role(auth.uid(), 'admin'::app_role)
     AND NOT has_role(auth.uid(), 'moderator'::app_role)
  THEN
    IF NEW.verified IS DISTINCT FROM OLD.verified THEN
      NEW.verified := OLD.verified;
    END IF;
    IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier THEN
      NEW.subscription_tier := OLD.subscription_tier;
    END IF;
    IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status THEN
      NEW.subscription_status := OLD.subscription_status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Service-role edge functions (checkout + webhook) bypass RLS/triggers guard
-- via the trusted session flag, set explicitly before writing. Since each
-- PostgREST call is its own transaction, `set_config(..., is_local=true)`
-- can't be set in one REST call and read in a later one — so the actual
-- trusted write happens atomically inside this single SECURITY DEFINER
-- function, callable only by the service role (never by a provider directly).
CREATE OR REPLACE FUNCTION public.update_provider_trusted(
  p_provider_id UUID,
  p_stripe_customer_id TEXT DEFAULT NULL,
  p_stripe_subscription_id TEXT DEFAULT NULL,
  p_subscription_tier TEXT DEFAULT NULL,
  p_subscription_status TEXT DEFAULT NULL,
  p_subscription_current_period_end TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('app.trusted_verification_sync', 'on', true);
  UPDATE public.providers SET
    stripe_customer_id = COALESCE(p_stripe_customer_id, stripe_customer_id),
    stripe_subscription_id = COALESCE(p_stripe_subscription_id, stripe_subscription_id),
    subscription_tier = COALESCE(p_subscription_tier, subscription_tier),
    subscription_status = COALESCE(p_subscription_status, subscription_status),
    subscription_current_period_end = COALESCE(p_subscription_current_period_end, subscription_current_period_end)
  WHERE id = p_provider_id;
  PERFORM set_config('app.trusted_verification_sync', 'off', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.update_provider_trusted(UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_provider_trusted(UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE) TO service_role;
