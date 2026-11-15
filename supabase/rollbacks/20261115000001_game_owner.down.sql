-- Rollback of 20261115000001_game_owner.sql
-- Categories go back to being editable only with the service role. Deploy the previous app version first.

drop policy "owners edit their game categories" on public.games;
revoke update (categories) on public.games from authenticated;
alter table public.games drop constraint games_categories_valid;
drop function public.valid_categories(text[]);
drop index public.games_owner_idx;
alter table public.games drop column owner_id;
