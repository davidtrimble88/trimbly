-- Service radius
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS service_radius_miles integer NOT NULL DEFAULT 25;

-- Quotes / Invoices
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  homeowner_id uuid NOT NULL,
  job_id uuid,
  title text NOT NULL,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  notes text DEFAULT '',
  sent_at timestamp with time zone,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotes_provider ON public.quotes(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_homeowner ON public.quotes(homeowner_id, created_at DESC);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Providers: full CRUD on their own quotes
CREATE POLICY "Providers can insert own quotes"
  ON public.quotes FOR INSERT
  TO authenticated
  WITH CHECK (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()));

CREATE POLICY "Providers can view own quotes"
  ON public.quotes FOR SELECT
  TO authenticated
  USING (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()));

CREATE POLICY "Providers can update own quotes"
  ON public.quotes FOR UPDATE
  TO authenticated
  USING (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()));

CREATE POLICY "Providers can delete own quotes"
  ON public.quotes FOR DELETE
  TO authenticated
  USING (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()));

-- Homeowners: view + update status on quotes sent to them
CREATE POLICY "Homeowners can view quotes sent to them"
  ON public.quotes FOR SELECT
  TO authenticated
  USING (auth.uid() = homeowner_id);

CREATE POLICY "Homeowners can update status on quotes sent to them"
  ON public.quotes FOR UPDATE
  TO authenticated
  USING (auth.uid() = homeowner_id);

-- Admins
CREATE POLICY "Admins can view all quotes"
  ON public.quotes FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_contact_messages_updated_at();