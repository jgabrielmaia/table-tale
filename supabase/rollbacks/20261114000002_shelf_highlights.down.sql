-- Rollback of 20261114000002_shelf_highlights.sql
-- The home page goes back to the first games found on a community shelf. Deploy the previous app version first.

drop function public.shelf_highlights(int);
drop function public.community_game_popularity(uuid[], date);
drop index if exists public.game_sessions_game_played_idx;
