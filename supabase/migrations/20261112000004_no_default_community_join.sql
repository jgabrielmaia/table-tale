-- New players no longer join the "Table Tale" community automatically. After the Fate Draw they pick a community
-- themselves (join a public one, or ask to join a private one), and until then they belong to none.
-- Existing memberships are kept as they are: this migration changes no data, it only stops the automatic join.
-- Rollback: supabase/rollbacks/20261112000004_no_default_community_join.down.sql

drop trigger profiles_join_default_community on public.profiles;
drop function public.tg_join_default_community();
