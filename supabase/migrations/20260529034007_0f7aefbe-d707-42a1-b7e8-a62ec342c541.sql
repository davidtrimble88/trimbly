ALTER TABLE public.rental_agreements DISABLE TRIGGER trg_lock_signed_agreement;

UPDATE public.rental_agreements
SET terms_snapshot = E'TRIMBLY PLATFORM DISCLAIMER\n\nTrimbly is a venue only and is NOT a party to this rental agreement. The Owner and Renter are solely responsible for the equipment, its condition, insurance, payment, damages, returns, and compliance with all applicable laws. Both parties agree to indemnify and hold harmless Trimbly, its affiliates, and its staff from any claims, damages, injuries, or losses arising from this rental. Payment and any security deposit are handled directly between the parties off-platform.\n\n----------------------------------------\n\n' || terms_snapshot
WHERE terms_snapshot IS NOT NULL
  AND terms_snapshot NOT ILIKE '%TRIMBLY PLATFORM DISCLAIMER%';

ALTER TABLE public.rental_agreements ENABLE TRIGGER trg_lock_signed_agreement;