-- 1. Lock down anon-executable SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.find_user_by_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_user_by_email(text) TO authenticated;
REVOKE ALL ON FUNCTION public.protect_provider_verified_column() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sync_provider_verified_badge() FROM PUBLIC, anon;

-- 2. Prevent users from self-escalating profile fields
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)) THEN
    NEW.suspended := OLD.suspended;
    NEW.suspended_reason := OLD.suspended_reason;
    NEW.subscription_tier := OLD.subscription_tier;
    NEW.user_type := OLD.user_type;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_profile_privileged_columns() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS protect_profile_privileged_columns_trg ON public.profiles;
CREATE TRIGGER protect_profile_privileged_columns_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_columns();

-- 3. Extend provider protection to featured/hidden
CREATE OR REPLACE FUNCTION public.protect_provider_verified_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.trusted_verification_sync', true) IS DISTINCT FROM 'on'
     AND NOT has_role(auth.uid(), 'admin'::app_role)
     AND NOT has_role(auth.uid(), 'moderator'::app_role)
  THEN
    NEW.verified := OLD.verified;
    NEW.featured := OLD.featured;
    NEW.hidden := OLD.hidden;
    NEW.subscription_tier := OLD.subscription_tier;
    NEW.subscription_status := OLD.subscription_status;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_provider_verified_column() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS protect_provider_verified_column_trg ON public.providers;
CREATE TRIGGER protect_provider_verified_column_trg
BEFORE UPDATE ON public.providers
FOR EACH ROW EXECUTE FUNCTION public.protect_provider_verified_column();