
CREATE TABLE public.equipment_rentals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID NOT NULL,
  owner_provider_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  condition TEXT NOT NULL DEFAULT 'good',
  price_hour NUMERIC,
  price_day NUMERIC,
  price_week NUMERIC,
  deposit_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  postal_code TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT 'US',
  pickup_notes TEXT NOT NULL DEFAULT '',
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  available BOOLEAN NOT NULL DEFAULT true,
  min_rental_hours INTEGER NOT NULL DEFAULT 1,
  max_rental_days INTEGER NOT NULL DEFAULT 30,
  insurance_required BOOLEAN NOT NULL DEFAULT false,
  terms TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_rentals TO authenticated;
GRANT ALL ON public.equipment_rentals TO service_role;

ALTER TABLE public.equipment_rentals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Available rentals viewable by authenticated"
  ON public.equipment_rentals FOR SELECT TO authenticated
  USING (available = true OR auth.uid() = owner_user_id);

CREATE POLICY "Owners insert own rentals"
  ON public.equipment_rentals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Owners update own rentals"
  ON public.equipment_rentals FOR UPDATE TO authenticated
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Owners delete own rentals"
  ON public.equipment_rentals FOR DELETE TO authenticated
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Admins manage rentals"
  ON public.equipment_rentals FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_equipment_rentals_available ON public.equipment_rentals(available);
CREATE INDEX idx_equipment_rentals_location ON public.equipment_rentals(city, state);
CREATE INDEX idx_equipment_rentals_owner ON public.equipment_rentals(owner_user_id);

CREATE TRIGGER trg_equipment_rentals_updated
BEFORE UPDATE ON public.equipment_rentals
FOR EACH ROW EXECUTE FUNCTION public.update_contact_messages_updated_at();


CREATE TABLE public.rental_agreements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rental_id UUID NOT NULL,
  owner_user_id UUID NOT NULL,
  renter_user_id UUID NOT NULL,
  owner_provider_id UUID,
  renter_provider_id UUID,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rate_basis TEXT NOT NULL DEFAULT 'day',
  rate_amount NUMERIC NOT NULL DEFAULT 0,
  quantity NUMERIC NOT NULL DEFAULT 1,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  deposit NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  terms_snapshot TEXT NOT NULL DEFAULT '',
  insurance_acknowledged BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'sent',
  owner_signature TEXT,
  renter_signature TEXT,
  owner_signed_at TIMESTAMPTZ,
  renter_signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rental_agreements TO authenticated;
GRANT ALL ON public.rental_agreements TO service_role;

ALTER TABLE public.rental_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties view own agreements"
  ON public.rental_agreements FOR SELECT TO authenticated
  USING (auth.uid() = owner_user_id OR auth.uid() = renter_user_id);

CREATE POLICY "Renters create agreements"
  ON public.rental_agreements FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = renter_user_id);

CREATE POLICY "Parties update own agreements"
  ON public.rental_agreements FOR UPDATE TO authenticated
  USING (auth.uid() = owner_user_id OR auth.uid() = renter_user_id);

CREATE POLICY "Parties delete own agreements"
  ON public.rental_agreements FOR DELETE TO authenticated
  USING (auth.uid() = owner_user_id OR auth.uid() = renter_user_id);

CREATE INDEX idx_rental_agreements_rental ON public.rental_agreements(rental_id);
CREATE INDEX idx_rental_agreements_parties ON public.rental_agreements(owner_user_id, renter_user_id);

CREATE TRIGGER trg_rental_agreements_updated
BEFORE UPDATE ON public.rental_agreements
FOR EACH ROW EXECUTE FUNCTION public.update_contact_messages_updated_at();

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS rental_id UUID;
