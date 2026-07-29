-- Emergency Home Info Card: quick-reference shutoff locations and emergency
-- contacts per home. All nullable/additive — safe for existing rows.
ALTER TABLE public.homes
  ADD COLUMN IF NOT EXISTS water_shutoff_location text,
  ADD COLUMN IF NOT EXISTS gas_shutoff_location text,
  ADD COLUMN IF NOT EXISTS electrical_panel_location text,
  ADD COLUMN IF NOT EXISTS emergency_notes text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text;
