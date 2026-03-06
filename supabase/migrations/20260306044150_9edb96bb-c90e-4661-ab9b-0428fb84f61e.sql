
-- Homes table to store user home profiles
CREATE TABLE public.homes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'My Home',
  home_type text NOT NULL DEFAULT 'single_family',
  year_built integer,
  square_feet integer,
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT 'US',
  hvac_type text DEFAULT '',
  roof_type text DEFAULT '',
  has_pool boolean NOT NULL DEFAULT false,
  has_septic boolean NOT NULL DEFAULT false,
  has_well_water boolean NOT NULL DEFAULT false,
  notes text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.homes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own homes" ON public.homes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own homes" ON public.homes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own homes" ON public.homes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own homes" ON public.homes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Maintenance tasks table
CREATE TABLE public.maintenance_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  home_id uuid NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL DEFAULT 'General',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'upcoming',
  due_date date,
  completed_at timestamp with time zone,
  recurrence_months integer DEFAULT 0,
  season text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks" ON public.maintenance_tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.maintenance_tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.maintenance_tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.maintenance_tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);
