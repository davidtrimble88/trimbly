ALTER TABLE public.support_tickets
  ADD COLUMN ai_area text,
  ADD COLUMN ai_issue_type text CHECK (ai_issue_type IN ('bug', 'question', 'feature_request', 'complaint', 'other')),
  ADD COLUMN ai_urgency text CHECK (ai_urgency IN ('low', 'medium', 'high', 'critical')),
  ADD COLUMN ai_summary text,
  ADD COLUMN ai_group_key text,
  ADD COLUMN ai_group_label text,
  ADD COLUMN ai_analyzed_at timestamptz;

CREATE INDEX idx_support_tickets_ai_urgency ON public.support_tickets (ai_urgency) WHERE ai_urgency IS NOT NULL;
CREATE INDEX idx_support_tickets_ai_group_key ON public.support_tickets (ai_group_key) WHERE ai_group_key IS NOT NULL;