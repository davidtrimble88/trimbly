
-- Mileage logs for pros
CREATE TABLE public.mileage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL,
  user_id UUID NOT NULL,
  job_id UUID,
  trip_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_location TEXT NOT NULL DEFAULT '',
  end_location TEXT NOT NULL DEFAULT '',
  miles NUMERIC NOT NULL DEFAULT 0,
  purpose TEXT NOT NULL DEFAULT 'job',
  notes TEXT NOT NULL DEFAULT '',
  rate_per_mile NUMERIC NOT NULL DEFAULT 0.67,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mileage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers view own mileage" ON public.mileage_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Providers insert own mileage" ON public.mileage_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Providers update own mileage" ON public.mileage_logs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Providers delete own mileage" ON public.mileage_logs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER mileage_logs_updated_at BEFORE UPDATE ON public.mileage_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_contact_messages_updated_at();

-- Notification preferences for pros
CREATE TABLE public.notification_prefs (
  user_id UUID PRIMARY KEY,
  push_new_job BOOLEAN NOT NULL DEFAULT true,
  push_new_message BOOLEAN NOT NULL DEFAULT true,
  push_bid_accepted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own prefs" ON public.notification_prefs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users upsert own prefs" ON public.notification_prefs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own prefs" ON public.notification_prefs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
