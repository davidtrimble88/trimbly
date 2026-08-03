-- Grant the site owner full admin access to the Staff Portal (/staff).
-- Looked up by email rather than a hardcoded UUID so this works regardless
-- of when/how the account was created. Safe to re-run (ON CONFLICT DO NOTHING
-- matches the (user_id, role) UNIQUE constraint on public.user_roles).
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = lower('davidharrisontrimble@icloud.com')
ON CONFLICT (user_id, role) DO NOTHING;
