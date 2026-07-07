ALTER TABLE public.provider_verifications
  ADD COLUMN verification_fee_status TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN verification_fee_amount_cents INTEGER,
  ADD COLUMN verification_fee_paid_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN stripe_checkout_session_id TEXT,
  ADD COLUMN stripe_payment_intent_id TEXT;

CREATE INDEX idx_provider_verifications_fee_status ON public.provider_verifications(verification_fee_status);

DROP POLICY IF EXISTS "Providers can upload own documents" ON public.provider_documents;
CREATE POLICY "Paid providers can upload documents"
  ON public.provider_documents FOR INSERT TO authenticated
  WITH CHECK (
    provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid())
    AND provider_id IN (SELECT provider_id FROM public.provider_verifications WHERE verification_fee_status = 'paid')
  );

DROP POLICY IF EXISTS "Providers can upload own verification docs" ON storage.objects;
CREATE POLICY "Paid providers can upload verification docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'provider-verification-docs'
    AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.providers WHERE user_id = auth.uid())
    AND (storage.foldername(name))[1] IN (SELECT provider_id::text FROM public.provider_verifications WHERE verification_fee_status = 'paid')
  );

CREATE OR REPLACE FUNCTION public.protect_provider_verified_column()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.verified IS DISTINCT FROM OLD.verified
     AND current_setting('app.trusted_verification_sync', true) IS DISTINCT FROM 'on'
     AND NOT has_role(auth.uid(), 'admin'::app_role)
     AND NOT has_role(auth.uid(), 'moderator'::app_role)
  THEN
    NEW.verified := OLD.verified;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_provider_verified ON public.providers;
CREATE TRIGGER trg_protect_provider_verified
  BEFORE UPDATE ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.protect_provider_verified_column();

CREATE OR REPLACE FUNCTION public.sync_provider_verified_badge()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  prov RECORD;
  should_be_verified BOOLEAN;
BEGIN
  SELECT licensed, insured INTO prov FROM public.providers WHERE id = NEW.provider_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  should_be_verified := (
    NEW.verification_fee_status = 'paid'
    AND NEW.background_check_status = 'clear'
    AND (NOT prov.licensed OR NEW.license_verification_status = 'verified')
    AND (NOT prov.insured OR NEW.insurance_verification_status = 'verified')
  );

  PERFORM set_config('app.trusted_verification_sync', 'on', true);
  UPDATE public.providers SET verified = should_be_verified
    WHERE id = NEW.provider_id AND verified IS DISTINCT FROM should_be_verified;
  PERFORM set_config('app.trusted_verification_sync', 'off', true);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_provider_verified ON public.provider_verifications;
CREATE TRIGGER trg_sync_provider_verified
  AFTER INSERT OR UPDATE ON public.provider_verifications
  FOR EACH ROW EXECUTE FUNCTION public.sync_provider_verified_badge();