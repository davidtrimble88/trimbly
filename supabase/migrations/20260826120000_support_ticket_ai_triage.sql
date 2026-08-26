-- Staff were getting flooded with support tickets during beta with no way
-- to sort them beyond status, no urgency signal, and no way to see that
-- five different tickets were actually all reports of the same underlying
-- bug. These columns hold the output of an AI triage pass (a new edge
-- function, triage-support-tickets) run on demand by staff: a feature-area
-- tag, an issue type, an urgency level, a plain-English one-line summary,
-- and a group key/label shared by tickets the AI determines describe the
-- same root issue, so the staff UI can cluster duplicates together.
--
-- These are populated only by the edge function (service-role, bypasses
-- RLS) — no RLS changes needed, existing support_tickets policies already
-- cover read/write access for staff and ticket owners.

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
