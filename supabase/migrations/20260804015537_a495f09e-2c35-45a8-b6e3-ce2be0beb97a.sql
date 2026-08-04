CREATE OR REPLACE FUNCTION public.create_provider_verification_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.provider_verifications (provider_id) VALUES (NEW.id)
  ON CONFLICT (provider_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.create_provider_verification_row() FROM PUBLIC, anon, authenticated;

INSERT INTO public.provider_verifications (provider_id)
SELECT id FROM public.providers
ON CONFLICT (provider_id) DO NOTHING;