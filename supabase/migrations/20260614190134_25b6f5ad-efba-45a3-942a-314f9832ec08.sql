
-- VEHICLES
CREATE TABLE public.vehicles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname text NOT NULL DEFAULT '',
  vehicle_type text NOT NULL DEFAULT 'car' CHECK (vehicle_type IN ('car','motorcycle','truck','suv','other')),
  year int,
  make text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  trim text,
  color text,
  vin text,
  license_plate text,
  current_mileage int NOT NULL DEFAULT 0,
  mileage_unit text NOT NULL DEFAULT 'mi' CHECK (mileage_unit IN ('mi','km')),
  fuel_type text DEFAULT 'gasoline',
  purchase_date date,
  photo_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage own vehicles" ON public.vehicles FOR ALL TO authenticated
  USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "Admins view all vehicles" ON public.vehicles FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- VEHICLE SERVICE RECORDS
CREATE TABLE public.vehicle_service_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_date date NOT NULL DEFAULT CURRENT_DATE,
  mileage int,
  service_type text NOT NULL DEFAULT 'maintenance',
  description text NOT NULL DEFAULT '',
  cost numeric(10,2),
  currency text NOT NULL DEFAULT 'USD',
  shop_name text,
  provider_id uuid,
  receipt_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_service_records TO authenticated;
GRANT ALL ON public.vehicle_service_records TO service_role;
ALTER TABLE public.vehicle_service_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage own service records" ON public.vehicle_service_records FOR ALL TO authenticated
  USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "Admins view all service records" ON public.vehicle_service_records FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- VEHICLE MAINTENANCE TASKS
CREATE TABLE public.vehicle_maintenance_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_name text NOT NULL,
  category text DEFAULT 'general',
  interval_miles int,
  interval_months int,
  last_done_date date,
  last_done_mileage int,
  next_due_date date,
  next_due_mileage int,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','due','overdue','done','snoozed')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_maintenance_tasks TO authenticated;
GRANT ALL ON public.vehicle_maintenance_tasks TO service_role;
ALTER TABLE public.vehicle_maintenance_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage own vehicle tasks" ON public.vehicle_maintenance_tasks FOR ALL TO authenticated
  USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "Admins view all vehicle tasks" ON public.vehicle_maintenance_tasks FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- VEHICLE DOCUMENTS
CREATE TABLE public.vehicle_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type text NOT NULL DEFAULT 'other' CHECK (doc_type IN ('registration','insurance','title','warranty','manual','inspection','other')),
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size int,
  expires_on date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_documents TO authenticated;
GRANT ALL ON public.vehicle_documents TO service_role;
ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage own vehicle documents" ON public.vehicle_documents FOR ALL TO authenticated
  USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "Admins view all vehicle documents" ON public.vehicle_documents FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- GARAGE SUBSCRIPTIONS (single source of truth for has_garage_addon)
CREATE TABLE public.garage_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('trial','active','canceled','past_due')),
  plan_interval text NOT NULL DEFAULT 'monthly' CHECK (plan_interval IN ('monthly','yearly')),
  started_at timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.garage_subscriptions TO authenticated;
GRANT ALL ON public.garage_subscriptions TO service_role;
ALTER TABLE public.garage_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own garage sub" ON public.garage_subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage garage subs" ON public.garage_subscriptions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Helper for gating
CREATE OR REPLACE FUNCTION public.has_garage_addon(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.garage_subscriptions
    WHERE user_id = _user_id
      AND status IN ('active','trial')
      AND (current_period_end IS NULL OR current_period_end > now())
  );
$$;
REVOKE EXECUTE ON FUNCTION public.has_garage_addon(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_garage_addon(uuid) TO authenticated, service_role;

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_vehicles_updated BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_vehicle_service_updated BEFORE UPDATE ON public.vehicle_service_records
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_vehicle_tasks_updated BEFORE UPDATE ON public.vehicle_maintenance_tasks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_vehicle_docs_updated BEFORE UPDATE ON public.vehicle_documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_garage_subs_updated BEFORE UPDATE ON public.garage_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_vehicles_owner ON public.vehicles(owner_user_id);
CREATE INDEX idx_vsr_vehicle ON public.vehicle_service_records(vehicle_id);
CREATE INDEX idx_vmt_vehicle ON public.vehicle_maintenance_tasks(vehicle_id);
CREATE INDEX idx_vdoc_vehicle ON public.vehicle_documents(vehicle_id);
