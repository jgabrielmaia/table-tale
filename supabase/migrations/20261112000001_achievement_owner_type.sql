-- New achievement requirement: owning a community. Its own migration because Postgres cannot use a new enum value
-- in the same transaction that adds it (the achievement and the function that read it come in the next migration).
-- Rollback: supabase/rollbacks/20261112000001_achievement_owner_type.down.sql (the value stays; see there).
alter type public.achievement_requirement add value if not exists 'community_owner';
