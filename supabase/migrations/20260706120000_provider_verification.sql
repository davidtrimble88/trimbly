-- ============================================================================
-- Provider verification: background checks + license/insurance document review
-- ============================================================================

-- One row per provider tracking the state of each verification component.
CREATE TABLE public.provider_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL UNIQUE REFERENCES public.providers(id) ON DELETE CASCADE,

  -- Background check (Checkr)
  background_check_status TEXT NOT NULL DEFAULT 'not_started',
    -- not_started | pending | clear | consider | failed | expired
  checkr_candidate_id TEXT,
  checkr_invitation_id TEXT,
  checkr_report_id TEXT,
  background_check_requested_at TIMESTAMP WITH TIME ZONE,
  background_check_completed_at TIMESTAMP WITH TIME ZONE,
  background_check_expires_at TIMESTAMP WITH TIME ZONE,

  -- License review (manual staff review, backed by provider_documents)
  license_verification_status TEXT NOT NULL DEFAULT 'unverified',
    -- unverified | pending | verified | rejected
  license_verified_at TIMESTAMP WITH TIME ZONE,
  license_verified_by UUID,
  license_rejection_reason TEXT,

  -- Insurance review
  insurance_verification_status TEXT NOT NULL DEFAULT 'unverified',
    -- unverified | pending | verified | rejected
  insurance_verified_at TIMESTAMP WITH TIME ZONE,
  insurance_verified_by UUID,
  insurance_rejection_reason TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_provider_verifications_provider ON public.provider_verifications(provider_id);
CREATE INDEX idx_provider_verifications_bg_status ON public.provider_verifications(background_check_status);

ALTER TABLE public.provider_verifications ENABLE ROW LEVEL SECURITY;

-- Providers can see their own verification state (read-only from the client;
-- all writes happen via edge functions using the service role, or by staff below).
CREATE POLICY "Providers can view own verification"
  ON public.provider_verifications FOR SELECT TO authenticated
  USING (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()));

CREATE POLICY "Admins and moderators can view all verifications"
  ON public.provider_verifications FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Admins and moderators can update verifications"
  ON public.provider_verifications FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE TRIGGER trg_provider_verifications_updated
  BEFORE UPDATE ON public.provider_verifications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- Uploaded license / insurance / ID documents supporting the review above.
-- ----------------------------------------------------------------------------
CREATE TABLE public.provider_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- license | insurance | id
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL, -- storage object path within provider-verification-docs
  file_size INTEGER,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_provider_documents_provider ON public.provider_documents(provider_id, document_type);

ALTER TABLE public.provider_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can view own documents"
  ON public.provider_documents FOR SELECT TO authenticated
  USING (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()));

CREATE POLICY "Providers can upload own documents"
  ON public.provider_documents FOR INSERT TO authenticated
  WITH CHECK (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()));

CREATE POLICY "Providers can delete own pending documents"
  ON public.provider_documents FOR DELETE TO authenticated
  USING (
    provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid())
    AND status = 'pending'
  );

CREATE POLICY "Admins and moderators can view all documents"
  ON public.provider_documents FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Admins and moderators can review documents"
  ON public.provider_documents FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE TRIGGER trg_provider_documents_updated
  BEFORE UPDATE ON public.provider_documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- Storage bucket: private, folder-scoped by provider_id so a provider can
-- only reach their own files. Staff read via signed URLs fetched through the
-- staff review UI (service-role edge call), so no broad storage policy for
-- staff is required here.
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('provider-verification-docs', 'provider-verification-docs', false);

CREATE POLICY "Providers can upload own verification docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'provider-verification-docs'
    AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.providers WHERE user_id = auth.uid())
  );

CREATE POLICY "Providers can view own verification docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'provider-verification-docs'
    AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.providers WHERE user_id = auth.uid())
  );

CREATE POLICY "Providers can delete own verification docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'provider-verification-docs'
    AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.providers WHERE user_id = auth.uid())
  );

-- Staff (admin/moderator) can read any file in the bucket to review submissions.
CREATE POLICY "Staff can view all verification docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'provider-verification-docs'
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  );

-- ----------------------------------------------------------------------------
-- Convenience: auto-create a provider_verifications row whenever a new
-- provider profile is created, so the dashboard/staff panel never has to
-- special-case a missing row.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_provider_verification_row()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  INSERT INTO public.provider_verifications (provider_id) VALUES (NEW.id)
  ON CONFLICT (provider_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_providers_create_verification
  AFTER INSERT ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.create_provider_verification_row();

-- Backfill for any providers that already exist.
INSERT INTO public.provider_verifications (provider_id)
SELECT id FROM public.providers
ON CONFLICT (provider_id) DO NOTHING;
