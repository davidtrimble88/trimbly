CREATE TABLE public.vehicle_coverage_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('insurance','warranty','extended_warranty','service_contract')),
  provider_name TEXT,
  policy_number TEXT,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_coverage_documents TO authenticated;
GRANT ALL ON public.vehicle_coverage_documents TO service_role;

ALTER TABLE public.vehicle_coverage_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their vehicle coverage docs"
  ON public.vehicle_coverage_documents FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND public.has_garage_addon(auth.uid()));

CREATE INDEX idx_vehicle_coverage_documents_user ON public.vehicle_coverage_documents(user_id);
CREATE INDEX idx_vehicle_coverage_documents_vehicle ON public.vehicle_coverage_documents(vehicle_id);

CREATE TRIGGER vehicle_coverage_documents_touch
  BEFORE UPDATE ON public.vehicle_coverage_documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();