-- ============================================================================
-- Testing-readiness, part 2: homeowner support ticket system.
-- Homeowners report bugs/concerns/suggestions/comments; staff (admin +
-- support, matching the existing Contact Inbox permission split) see every
-- ticket, can comment, and change status. Ticket creators see staff replies
-- and status changes via the same comment thread on their own ticket.
-- ============================================================================

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('bug', 'concern', 'suggestion', 'comment')),
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tickets" ON public.support_tickets
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users create own tickets" ON public.support_tickets
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff manage all tickets" ON public.support_tickets
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'support'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'support'::app_role));

CREATE TRIGGER trg_support_tickets_updated
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_support_tickets_user ON public.support_tickets(user_id, created_at DESC);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status, created_at DESC);

CREATE TABLE public.ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id),
  is_staff boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ticket owners view own ticket comments" ON public.ticket_comments
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid()));

CREATE POLICY "Staff view all ticket comments" ON public.ticket_comments
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'support'::app_role));

CREATE POLICY "Ticket owners can comment on own tickets" ON public.ticket_comments
FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid() AND is_staff = false
  AND EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
);

CREATE POLICY "Staff can comment on any ticket" ON public.ticket_comments
FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid() AND is_staff = true
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'support'::app_role))
);

CREATE INDEX idx_ticket_comments_ticket ON public.ticket_comments(ticket_id, created_at ASC);
