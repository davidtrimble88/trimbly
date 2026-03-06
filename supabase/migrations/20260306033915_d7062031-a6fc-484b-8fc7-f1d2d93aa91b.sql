
-- Fix security definer view by making it use invoker security
DROP VIEW IF EXISTS public.provider_stats;
CREATE OR REPLACE VIEW public.provider_stats WITH (security_invoker = true) AS
SELECT
  p.id AS provider_id,
  COALESCE(AVG(r.rating), 0)::NUMERIC(3,2) AS avg_rating,
  COUNT(r.id)::INTEGER AS review_count
FROM public.providers p
LEFT JOIN public.reviews r ON r.provider_id = p.id
GROUP BY p.id;
