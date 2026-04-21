-- Staff notes
CREATE TABLE public.staff_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL,
  entity_type TEXT NOT NULL, -- 'user' | 'provider' | 'job' | 'contact'
  entity_id UUID NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.staff_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage staff notes" ON public.staff_notes
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = author_id);
CREATE INDEX idx_staff_notes_entity ON public.staff_notes(entity_type, entity_id, created_at DESC);

-- Activity log
CREATE TABLE public.staff_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.staff_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view activity log" ON public.staff_activity_log
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert activity log" ON public.staff_activity_log
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = actor_id);
CREATE INDEX idx_staff_activity_log_created ON public.staff_activity_log(created_at DESC);
CREATE INDEX idx_staff_activity_log_target ON public.staff_activity_log(target_type, target_id);

-- Broadcasts
CREATE TABLE public.broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL,
  audience TEXT NOT NULL, -- 'all' | 'homeowners' | 'providers' | 'pro_subscribers'
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  recipient_count INTEGER DEFAULT 0,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage broadcasts" ON public.broadcasts
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = author_id);

-- Profile flags
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

-- Allow admins to update any profile (for suspension and tier changes)
CREATE POLICY "Admins can update any profile" ON public.profiles
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Provider flags
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT false;

CREATE POLICY "Admins can update any provider" ON public.providers
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Review flags
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS flagged BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flagged_reason TEXT,
  ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT false;

CREATE POLICY "Admins can update any review" ON public.reviews
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any review" ON public.reviews
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all messages (for moderation/dispute investigation)
CREATE POLICY "Admins can view all messages" ON public.messages
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all jobs (already public to authed but explicit for clarity)
-- Admin can update any job (for dispute resolution)
CREATE POLICY "Admins can update any job" ON public.jobs
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all pending_messages
CREATE POLICY "Admins can view all pending messages" ON public.pending_messages
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));