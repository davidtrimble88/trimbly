-- Pro Outreach drafts (pending_messages) had no email column — staff could
-- only manually call/visit a prospective provider's website, since the send
-- step never existed. Nullable so existing rows and phone/website-only
-- outreach keep working unchanged; staff fill this in when they have an
-- address to send to.
ALTER TABLE public.pending_messages ADD COLUMN email text;
