-- Table Tale — games in communities, slice 2: Table Tale reviews, owner-only shelves, private "My games",
-- coordinates for new communities and a BoardGameGeek search cache.
-- Additive except for two tightened policies (community_games, user_games). Rollback: supabase/rollbacks/20261111000001_reviews_and_privacy.down.sql

-- ------------------------------------------------------------------
-- Reviews: one 1–5 rating plus optional feedback per user per game, public. The Table Tale average lives here
-- and is never mixed with the BoardGameGeek rating on `games`.
-- ------------------------------------------------------------------
create table public.game_reviews (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  feedback text check (char_length(feedback) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_id, user_id)
);
create index game_reviews_game_idx on public.game_reviews (game_id, updated_at desc);
create trigger game_reviews_updated_at before update on public.game_reviews
  for each row execute function public.set_updated_at();

-- Bring the old session ratings back as reviews: each player's most recent rated session per game.
insert into public.game_reviews (game_id, user_id, rating, created_at, updated_at)
select distinct on (s.game_id, s.user_id) s.game_id, s.user_id, s.rating, s.created_at, s.created_at
from public.game_sessions s
where s.rating is not null
order by s.game_id, s.user_id, s.played_at desc, s.created_at desc
on conflict (game_id, user_id) do nothing;

-- Average per game (respects the caller's RLS; reviews are public, so everyone sees the same numbers).
create view public.game_review_stats with (security_invoker = true) as
  select game_id, count(*)::int as review_count, round(avg(rating)::numeric, 2) as rating_avg
  from public.game_reviews
  group by game_id;

alter table public.game_reviews enable row level security;
revoke all on public.game_reviews, public.game_review_stats from anon, authenticated;
grant select on public.game_reviews, public.game_review_stats to anon, authenticated;
grant insert (game_id, rating, feedback), update (rating, feedback), delete on public.game_reviews to authenticated;

create policy "reviews are public" on public.game_reviews for select to anon, authenticated using (true);
create policy "users add own review" on public.game_reviews for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "users edit own review" on public.game_reviews for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users delete own review" on public.game_reviews for delete to authenticated
  using (user_id = (select auth.uid()));

-- ------------------------------------------------------------------
-- Community shelves: only owners add, change or remove games (was owner, admin and moderator).
-- ------------------------------------------------------------------
drop policy "managers add community games" on public.community_games;
drop policy "managers update community games" on public.community_games;
drop policy "managers remove community games" on public.community_games;
create policy "owners add community games" on public.community_games for insert to authenticated
  with check (
    added_by = (select auth.uid())
    and public.has_community_role(community_id, array['owner']::public.community_role[])
  );
create policy "owners update community games" on public.community_games for update to authenticated
  using (public.has_community_role(community_id, array['owner']::public.community_role[]))
  with check (public.has_community_role(community_id, array['owner']::public.community_role[]));
create policy "owners remove community games" on public.community_games for delete to authenticated
  using (public.has_community_role(community_id, array['owner']::public.community_role[]));

-- ------------------------------------------------------------------
-- "My games" (user_games) is private: only its owner reads it. Anonymous users lose read access.
-- ------------------------------------------------------------------
drop policy "user games are public" on public.user_games;
create policy "users read own user games" on public.user_games for select to authenticated
  using (user_id = (select auth.uid()));
revoke select on public.user_games, public.game_ownerships from anon;

-- ------------------------------------------------------------------
-- New communities need coordinates (the games list finds shelves by distance). Enforced in the insert policy,
-- so existing communities without a location keep working and the internal default-community setup is unaffected.
-- ------------------------------------------------------------------
drop policy "authenticated create communities" on public.communities;
create policy "authenticated create communities" on public.communities for insert to authenticated
  with check (created_by = (select auth.uid()) and latitude is not null and longitude is not null);

-- ------------------------------------------------------------------
-- BoardGameGeek search cache (7 days), so repeated searches don't spend the BGG rate limit.
-- Only the `bgg` Edge Function (service role) reads and writes it.
-- ------------------------------------------------------------------
create table public.bgg_search_cache (
  query text primary key check (query = lower(btrim(query)) and char_length(query) between 1 and 200),
  results jsonb not null,
  fetched_at timestamptz not null default now()
);
create index bgg_search_cache_fetched_idx on public.bgg_search_cache (fetched_at);
alter table public.bgg_search_cache enable row level security;
revoke all on public.bgg_search_cache from anon, authenticated;
