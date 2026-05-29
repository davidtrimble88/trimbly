ALTER TABLE public.equipment_rentals
ADD COLUMN IF NOT EXISTS rentable_to text NOT NULL DEFAULT 'pros_only';

ALTER TABLE public.equipment_rentals
DROP CONSTRAINT IF EXISTS equipment_rentals_rentable_to_check;

ALTER TABLE public.equipment_rentals
ADD CONSTRAINT equipment_rentals_rentable_to_check
CHECK (rentable_to IN ('pros_only', 'homeowners_and_pros'));