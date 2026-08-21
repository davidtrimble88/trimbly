GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_invites TO authenticated;
GRANT ALL ON public.home_invites TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_shares TO authenticated;
GRANT ALL ON public.home_shares TO service_role;