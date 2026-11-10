-- Rollback of 20261111000001_reviews_and_privacy.sql
-- Warning: reviews (ratings and feedback) and the BGG search cache are dropped. Session ratings are untouched.

drop table public.bgg_search_cache;

drop policy "authenticated create communities" on public.communities;
create policy "authenticated create communities" on public.communities for insert to authenticated
  with check (created_by = (select auth.uid()));

drop policy "users read own user games" on public.user_games;
create policy "user games are public" on public.user_games for select to anon, authenticated using (true);
grant select on public.user_games, public.game_ownerships to anon;

drop policy "owners add community games" on public.community_games;
drop policy "owners update community games" on public.community_games;
drop policy "owners remove community games" on public.community_games;
create policy "managers add community games" on public.community_games for insert to authenticated
  with check (
    added_by = (select auth.uid())
    and public.has_community_role(community_id, array['owner', 'admin', 'moderator']::public.community_role[])
  );
create policy "managers update community games" on public.community_games for update to authenticated
  using (public.has_community_role(community_id, array['owner', 'admin', 'moderator']::public.community_role[]))
  with check (public.has_community_role(community_id, array['owner', 'admin', 'moderator']::public.community_role[]));
create policy "managers remove community games" on public.community_games for delete to authenticated
  using (public.has_community_role(community_id, array['owner', 'admin', 'moderator']::public.community_role[]));

drop view public.game_review_stats;
drop table public.game_reviews;
