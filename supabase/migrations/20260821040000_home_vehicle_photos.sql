-- Photo support for homes and vehicles, mirroring the existing avatar
-- pattern (profileImages.ts / the "profile-images" bucket): a plain public
-- URL column, uploaded client-side, no new storage bucket required since
-- the same public bucket + a distinct path prefix works fine here.
ALTER TABLE public.homes
  ADD COLUMN IF NOT EXISTS photo_url text;

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS photo_url text;
