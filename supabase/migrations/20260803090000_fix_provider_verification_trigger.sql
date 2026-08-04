-- New Pro/Mechanic registration was completely broken: create_provider_verification_row()
-- runs as an AFTER INSERT trigger on public.providers, but it was never marked
-- SECURITY DEFINER, so its own INSERT into public.provider_verifications executed
-- with the registering user's privileges. That table has RLS enabled with only
-- SELECT/UPDATE policies for authenticated users (no INSERT policy or grant), so the
-- trigger's insert failed with "new row violates row-level security policy for table
-- provider_verifications" — which rolled back the entire providers row, so nobody
-- could actually finish becoming a Pro or Mechanic. Confirmed by attempting a real
-- registration end-to-end.
--
-- Fix: make the trigger function SECURITY DEFINER (it only does one hardcoded,
-- narrow insert keyed off NEW.id — no user-controlled dynamic SQL — so this is safe,
-- matching the same pattern already used for the other bookkeeping trigger functions
-- in this schema) and lock down its EXECUTE grant so it can't be called directly.
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

-- Backfill: create the missing verification row for any provider whose registration
-- got rolled back partway in a prior attempt is impossible to detect (the whole insert
-- rolled back), but also backfill any providers that exist without one for other reasons.
INSERT INTO public.provider_verifications (provider_id)
SELECT id FROM public.providers
ON CONFLICT (provider_id) DO NOTHING;
