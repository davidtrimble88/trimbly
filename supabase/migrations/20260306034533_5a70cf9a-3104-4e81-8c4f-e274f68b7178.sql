
-- Add insured field and subscription tier to providers
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS insured BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'elite'));
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS insurance_details TEXT DEFAULT '';
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS license_number TEXT DEFAULT '';

-- Update the provider_stats view to include tier for sorting
DROP VIEW IF EXISTS public.provider_stats;
CREATE OR REPLACE VIEW public.provider_stats WITH (security_invoker = true) AS
SELECT
  p.id AS provider_id,
  p.subscription_tier,
  COALESCE(AVG(r.rating), 0)::NUMERIC(3,2) AS avg_rating,
  COUNT(r.id)::INTEGER AS review_count
FROM public.providers p
LEFT JOIN public.reviews r ON r.provider_id = p.id
GROUP BY p.id, p.subscription_tier;

-- Make providers table publicly readable (even for anonymous) so anyone can find pros
DROP POLICY IF EXISTS "Anyone can view providers" ON public.providers;
CREATE POLICY "Anyone can view providers" ON public.providers FOR SELECT USING (true);
