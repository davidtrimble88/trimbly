-- Track AI auto-reply conversation state on contact messages
ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS ai_attempt_count integer NOT NULL DEFAULT 0;

-- Link messages back to the originating contact message + store AI metadata
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS contact_message_id uuid REFERENCES public.contact_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ai_meta jsonb;

-- Index for fast lookup of messages tied to a contact thread
CREATE INDEX IF NOT EXISTS idx_messages_contact_message_id ON public.messages(contact_message_id);
