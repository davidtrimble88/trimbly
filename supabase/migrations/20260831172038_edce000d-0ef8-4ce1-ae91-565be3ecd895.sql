ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, user_type, timezone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'homeowner'),
    NULLIF(NEW.raw_user_meta_data ->> 'timezone', '')
  );
  RETURN NEW;
END;
$$;