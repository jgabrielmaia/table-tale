-- Shelf visibility: a community chooses whether its shelf (games and copies) is visible to everyone or to members only.
-- A private community's shelf is always members-only. The community page itself is unaffected.
-- The Games page reads community_games under these rules, so members-only shelves disappear from it for everyone else.

alter table public.communities
  add column shelf_visibility public.community_visibility not null default 'public';
grant update (shelf_visibility) on public.communities to authenticated;

-- Members (any role) always see the shelf; everyone else only when both the community and its shelf are public.
create or replace function public.can_see_community_shelf(p_community uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_community_member(p_community)
    or exists (select 1 from public.communities where id = p_community and visibility = 'public' and shelf_visibility = 'public');
$$;
revoke execute on function public.can_see_community_shelf(uuid) from public;
grant execute on function public.can_see_community_shelf(uuid) to anon, authenticated;

drop policy "community library readable" on public.community_games;
create policy "community library readable" on public.community_games for select to anon, authenticated
  using (public.can_see_community_shelf(community_id));

drop policy "community copies readable" on public.community_game_copies;
create policy "community copies readable" on public.community_game_copies for select to anon, authenticated
  using (public.can_see_community_shelf(community_id));
