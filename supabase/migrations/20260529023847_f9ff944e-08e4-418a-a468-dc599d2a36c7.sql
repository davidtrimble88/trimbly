
-- 1. ESIGN consent columns on the agreement itself
ALTER TABLE public.rental_agreements
  ADD COLUMN IF NOT EXISTS owner_esign_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS renter_esign_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_hash text;

-- 2. Audit log table — append-only record of every signing event
CREATE TABLE IF NOT EXISTS public.agreement_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('owner','renter')),
  event text NOT NULL CHECK (event IN ('signed','viewed','declined')),
  signature_name text,
  email text,
  ip_address text,
  user_agent text,
  terms_hash text,
  esign_consent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agreement_audit_log_agreement ON public.agreement_audit_log(agreement_id);

GRANT SELECT, INSERT ON public.agreement_audit_log TO authenticated;
GRANT ALL ON public.agreement_audit_log TO service_role;

ALTER TABLE public.agreement_audit_log ENABLE ROW LEVEL SECURITY;

-- Parties to the agreement can view its audit log
CREATE POLICY "Parties view audit log"
ON public.agreement_audit_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rental_agreements a
    WHERE a.id = agreement_audit_log.agreement_id
      AND (auth.uid() = a.owner_user_id OR auth.uid() = a.renter_user_id)
  )
);

-- Users may only insert audit rows about themselves
CREATE POLICY "Users insert own audit rows"
ON public.agreement_audit_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. Immutability trigger — once a signature is set, freeze that side and the locked snapshot
CREATE OR REPLACE FUNCTION public.lock_signed_agreement_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Owner side: once owner_signature is set, it (and signed timestamp + consent) cannot change
  IF OLD.owner_signature IS NOT NULL THEN
    IF NEW.owner_signature IS DISTINCT FROM OLD.owner_signature
       OR NEW.owner_signed_at IS DISTINCT FROM OLD.owner_signed_at
       OR NEW.owner_esign_consent IS DISTINCT FROM OLD.owner_esign_consent THEN
      RAISE EXCEPTION 'Owner signature is locked and cannot be modified';
    END IF;
  END IF;

  -- Renter side: same protection
  IF OLD.renter_signature IS NOT NULL THEN
    IF NEW.renter_signature IS DISTINCT FROM OLD.renter_signature
       OR NEW.renter_signed_at IS DISTINCT FROM OLD.renter_signed_at
       OR NEW.renter_esign_consent IS DISTINCT FROM OLD.renter_esign_consent THEN
      RAISE EXCEPTION 'Renter signature is locked and cannot be modified';
    END IF;
  END IF;

  -- Once either side has signed, lock the contract text, dates, rate, and totals
  IF OLD.owner_signature IS NOT NULL OR OLD.renter_signature IS NOT NULL THEN
    IF NEW.terms_snapshot IS DISTINCT FROM OLD.terms_snapshot
       OR NEW.terms_hash IS DISTINCT FROM OLD.terms_hash
       OR NEW.start_date IS DISTINCT FROM OLD.start_date
       OR NEW.end_date IS DISTINCT FROM OLD.end_date
       OR NEW.rate_basis IS DISTINCT FROM OLD.rate_basis
       OR NEW.rate_amount IS DISTINCT FROM OLD.rate_amount
       OR NEW.quantity IS DISTINCT FROM OLD.quantity
       OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
       OR NEW.deposit IS DISTINCT FROM OLD.deposit
       OR NEW.total IS DISTINCT FROM OLD.total
       OR NEW.currency IS DISTINCT FROM OLD.currency THEN
      RAISE EXCEPTION 'Signed agreement contents are locked and cannot be modified';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_signed_agreement ON public.rental_agreements;
CREATE TRIGGER trg_lock_signed_agreement
BEFORE UPDATE ON public.rental_agreements
FOR EACH ROW
EXECUTE FUNCTION public.lock_signed_agreement_fields();
