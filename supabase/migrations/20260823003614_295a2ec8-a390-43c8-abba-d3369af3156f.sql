-- homes.user_id had no FK to auth.users, so deleting a user account never
-- cascaded to their homes (or, transitively, maintenance_tasks/home_binder_items/
-- etc., which already cascade correctly from homes.id). This orphaned homes
-- rows behind deleted accounts, which then permanently blocked the
-- one-account-per-address unique index for anyone re-claiming that address.
-- All pre-existing orphans have already been cleaned up manually.
ALTER TABLE public.homes
  ADD CONSTRAINT homes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;