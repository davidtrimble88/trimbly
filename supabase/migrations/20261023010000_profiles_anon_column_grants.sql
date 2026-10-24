-- Logged-out visitors (the anon role) were able to read every column of any
-- public profile, including subscription_tier, suspended_reason,
-- referred_by_code, is_testing_account, timezone and the signup_* source
-- columns.
--
-- Why the earlier fix did not work: 20260529050849 ran
--   REVOKE SELECT (suspended_reason, subscription_tier) ON public.profiles FROM anon;
-- but Supabase's default privileges give anon SELECT on the whole table, and a
-- column-level REVOKE cannot remove part of a table-level grant. The way to
-- restrict columns is to revoke the table-level grant and grant back only the
-- columns the public pages actually read.
--
-- Row access is unchanged: the "Public can view public profiles" policy still
-- limits anon to rows where is_public = true AND suspended = false.
--
-- Columns kept for anon (PublicHomeownerProfile.tsx reads
-- id, full_name, avatar_url, bio, is_public, created_at, user_type;
-- PublicProviderProfile.tsx reads avatar_url; suspended is used by the row
-- policy; gallery_urls is public gallery content).

REVOKE SELECT ON public.profiles FROM anon;

GRANT SELECT (
  id,
  full_name,
  avatar_url,
  bio,
  gallery_urls,
  is_public,
  suspended,
  user_type,
  created_at
) ON public.profiles TO anon;
