-- Providers already collect a phone number, but it was never shown publicly.
-- Add an explicit opt-in so a pro chooses to publish it (like putting a
-- number on a real business website) rather than it being exposed by default.
ALTER TABLE public.providers
  ADD COLUMN show_phone_publicly BOOLEAN NOT NULL DEFAULT false;
