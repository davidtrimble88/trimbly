-- Record where each signup came from (first-touch UTM tags, ad click id,
-- referring site and landing page). The browser sends these in the sign-up
-- metadata as attr_* keys; the profile trigger copies them to real columns.
--
-- These values come from the client, so treat them as analytics, not proof:
-- a user could edit them. They are length-capped here and never used for
-- permissions or billing.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signup_source        text,
  ADD COLUMN IF NOT EXISTS signup_medium        text,
  ADD COLUMN IF NOT EXISTS signup_campaign      text,
  ADD COLUMN IF NOT EXISTS signup_content       text,
  ADD COLUMN IF NOT EXISTS signup_term          text,
  ADD COLUMN IF NOT EXISTS signup_click_id      text,
  ADD COLUMN IF NOT EXISTS signup_landing_path  text,
  ADD COLUMN IF NOT EXISTS signup_referrer      text;

CREATE INDEX IF NOT EXISTS idx_profiles_signup_source ON public.profiles (signup_source);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, full_name, user_type, timezone,
    signup_source, signup_medium, signup_campaign, signup_content,
    signup_term, signup_click_id, signup_landing_path, signup_referrer
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'homeowner'),
    NULLIF(NEW.raw_user_meta_data ->> 'timezone', ''),
    left(NULLIF(NEW.raw_user_meta_data ->> 'attr_source', ''), 100),
    left(NULLIF(NEW.raw_user_meta_data ->> 'attr_medium', ''), 100),
    left(NULLIF(NEW.raw_user_meta_data ->> 'attr_campaign', ''), 100),
    left(NULLIF(NEW.raw_user_meta_data ->> 'attr_content', ''), 100),
    left(NULLIF(NEW.raw_user_meta_data ->> 'attr_term', ''), 100),
    left(NULLIF(NEW.raw_user_meta_data ->> 'attr_click_id', ''), 100),
    left(NULLIF(NEW.raw_user_meta_data ->> 'attr_landing_path', ''), 100),
    left(NULLIF(NEW.raw_user_meta_data ->> 'attr_referrer', ''), 100)
  );
  RETURN NEW;
END;
$$;
