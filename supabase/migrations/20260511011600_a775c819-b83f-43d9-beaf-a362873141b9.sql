ALTER TABLE public.home_binder_items
  ADD COLUMN IF NOT EXISTS manual_url text,
  ADD COLUMN IF NOT EXISTS manual_title text;