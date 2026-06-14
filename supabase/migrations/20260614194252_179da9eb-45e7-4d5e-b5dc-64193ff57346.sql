ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS provider_type TEXT NOT NULL DEFAULT 'home';

CREATE INDEX IF NOT EXISTS providers_provider_type_idx ON public.providers (provider_type);

-- Mark existing rows with mechanic-ish categories as mechanics
UPDATE public.providers
SET provider_type = 'mechanic'
WHERE provider_type = 'home'
  AND (
    category ILIKE '%mechanic%'
    OR category ILIKE '%auto repair%'
    OR category ILIKE '%motorcycle repair%'
    OR category ILIKE '%auto body%'
    OR category ILIKE '%tire shop%'
  );