ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS emergency_start_time text NOT NULL DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS emergency_end_time text NOT NULL DEFAULT '07:00',
  ADD COLUMN IF NOT EXISTS emergency_weekends boolean NOT NULL DEFAULT true;