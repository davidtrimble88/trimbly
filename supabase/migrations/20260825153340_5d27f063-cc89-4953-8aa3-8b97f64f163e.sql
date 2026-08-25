REVOKE ALL ON FUNCTION public.get_invite_preview(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_invite_preview(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_recovery_questions(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_recovery_questions(text) TO service_role;

REVOKE ALL ON FUNCTION public.recover_account_via_security_questions(text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recover_account_via_security_questions(text, text, text, text, text) TO service_role;