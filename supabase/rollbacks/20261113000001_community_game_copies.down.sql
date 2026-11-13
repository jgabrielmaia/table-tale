-- Rollback of 20261113000001_community_game_copies.sql
-- Drops per-copy owners. community_games.copies keeps the current count, so shelves look the same. Deploy the previous app version first.

drop trigger community_games_first_copies on public.community_games;
drop table public.community_game_copies;
drop function public.tg_first_copies();
drop function public.tg_sync_copy_count();
drop function public.tg_copy_community();
drop function public.is_active_community_member(uuid, uuid);
grant update on public.community_games to authenticated;
