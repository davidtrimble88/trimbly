
CREATE TABLE public.pending_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  provider_name text NOT NULL,
  provider_category text NOT NULL DEFAULT '',
  provider_city text NOT NULL DEFAULT '',
  provider_state text NOT NULL DEFAULT '',
  provider_country text NOT NULL DEFAULT 'US',
  provider_phone text,
  provider_website text,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own pending messages"
  ON public.pending_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can view own pending messages"
  ON public.pending_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete own pending messages"
  ON public.pending_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);
