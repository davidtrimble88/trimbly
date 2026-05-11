ALTER TABLE public.providers
ADD COLUMN IF NOT EXISTS business_hours jsonb NOT NULL DEFAULT '{
  "mon": {"open": "08:00", "close": "17:00", "closed": false},
  "tue": {"open": "08:00", "close": "17:00", "closed": false},
  "wed": {"open": "08:00", "close": "17:00", "closed": false},
  "thu": {"open": "08:00", "close": "17:00", "closed": false},
  "fri": {"open": "08:00", "close": "17:00", "closed": false},
  "sat": {"open": "09:00", "close": "14:00", "closed": true},
  "sun": {"open": "09:00", "close": "14:00", "closed": true}
}'::jsonb;