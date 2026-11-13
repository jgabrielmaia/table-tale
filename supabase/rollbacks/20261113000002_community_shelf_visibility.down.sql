-- Rollback of 20261113000002_community_shelf_visibility.sql
-- Every shelf follows its community's visibility again. Deploy the previous app version first.

drop policy "community copies readable" on public.community_game_copies;
create policy "community copies readable" on public.community_game_copies for select to anon, authenticated
  using (public.is_community_public(community_id) or public.is_community_member(community_id));

drop policy "community library readable" on public.community_games;
create policy "community library readable" on public.community_games for select to anon, authenticated
  using (public.is_community_public(community_id) or public.is_community_member(community_id));

drop function public.can_see_community_shelf(uuid);
alter table public.communities drop column shelf_visibility;
