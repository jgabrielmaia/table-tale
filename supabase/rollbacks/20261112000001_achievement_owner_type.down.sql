-- Rollback of 20261112000001_achievement_owner_type.sql
-- Intentionally a no-op: Postgres cannot drop a value from an enum, and an unused 'community_owner' value is harmless.
-- The achievement that used it is removed by 20261112000002_achievement_owner.down.sql. Re-applying the migration is
-- safe ("add value if not exists").
select 1;
