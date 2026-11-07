-- Rollback of 20261106000002_communities_backfill.sql
-- Removes the default "Table Tale" community created by the backfill (memberships and library cascade).
-- Warning: this also removes any members or games added to that community after the backfill.
-- Personal collections (user_games) and the global catalog (games) are never touched.
delete from public.communities where slug = 'table-tale';
