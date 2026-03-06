
-- Home binder items table
CREATE TABLE public.home_binder_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  home_id uuid NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  item_type text NOT NULL DEFAULT 'appliance',
  name text NOT NULL,
  brand text DEFAULT '',
  model_number text DEFAULT '',
  serial_number text DEFAULT '',
  purchase_date date,
  warranty_expiry date,
  cost numeric DEFAULT 0,
  location_in_home text DEFAULT '',
  notes text DEFAULT '',
  document_url text,
  document_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.home_binder_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own binder items" ON public.home_binder_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own binder items" ON public.home_binder_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own binder items" ON public.home_binder_items FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own binder items" ON public.home_binder_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Storage bucket for binder documents
INSERT INTO storage.buckets (id, name, public) VALUES ('binder-docs', 'binder-docs', false);

-- Storage RLS policies
CREATE POLICY "Users can upload own docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'binder-docs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can view own docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'binder-docs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own docs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'binder-docs' AND (storage.foldername(name))[1] = auth.uid()::text);
