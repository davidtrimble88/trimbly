CREATE OR REPLACE FUNCTION public.admin_list_user_addresses()
RETURNS TABLE(user_id uuid, home_id uuid, home_name text, address text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT h.user_id, h.id, h.name,
         trim(both ', ' from concat_ws(', ', nullif(h.street_address,''), nullif(h.city,''), nullif(h.state,'')))
  FROM public.homes h
  WHERE public.has_role(auth.uid(), 'admin')
$$;

REVOKE ALL ON FUNCTION public.admin_list_user_addresses() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_user_addresses() TO authenticated;