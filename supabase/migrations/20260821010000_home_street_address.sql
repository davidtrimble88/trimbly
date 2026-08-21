-- Street address + duplicate-claim prevention. homes previously had no
-- street-level address at all (only city/state), so there was nothing
-- precise enough to key a "one account per physical property" rule on.
ALTER TABLE public.homes
  ADD COLUMN IF NOT EXISTS street_address text;

-- Normalized, generated column the uniqueness index keys on: lowercase,
-- strip everything but letters/digits, concatenate street|city|state so
-- "123 Main St, Austin, TX" and "123 main st austin tx" collide but a
-- different city/state with the same street line does not. Left NULL
-- (via NULLIF) whenever street_address is blank so existing rows and any
-- entry point that hasn't collected a street address yet never collide.
ALTER TABLE public.homes
  ADD COLUMN IF NOT EXISTS street_address_normalized text
  GENERATED ALWAYS AS (
    NULLIF(
      regexp_replace(lower(coalesce(street_address, '') || '|' || coalesce(city, '') || '|' || coalesce(state, '')), '[^a-z0-9|]', '', 'g'),
      '||'
    )
  ) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS idx_homes_street_address_unique
  ON public.homes (street_address_normalized)
  WHERE street_address_normalized IS NOT NULL;
