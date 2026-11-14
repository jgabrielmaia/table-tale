-- Shelf highlights (home page, #77): the caller's most recently played games first, then the games most played in
-- their communities, then the games most played across public communities, so the section is never empty.
-- game_sessions and user_game_status are readable by their owner only (RLS), so the ranking runs as security definer
-- and only ever returns per-game totals, never another member's sessions.

-- Popularity reads sessions per game within a recent window.
create index if not exists game_sessions_game_played_idx on public.game_sessions (game_id, played_at desc);

-- Per-game popularity across a set of communities: distinct active members who played it since p_since, their
-- sessions, and copies on those shelves (the only signal for a community with no sessions yet). A member of several
-- of the communities is counted once. Internal: callers must decide which communities the viewer may see.
create or replace function public.community_game_popularity(p_communities uuid[], p_since date)
returns table (game_id uuid, players int, sessions int, copies int)
language sql stable security definer set search_path = public
as $$
  with members as (
    select distinct m.user_id from community_memberships m
    where m.community_id = any (p_communities) and m.status = 'active'
  ),
  plays as (
    select s.game_id, count(distinct s.user_id)::int as players, count(*)::int as sessions
    from game_sessions s join members mb on mb.user_id = s.user_id
    where s.played_at >= p_since
    group by s.game_id
  ),
  shelf as (
    select g.game_id, sum(g.copies)::int as copies from community_games g
    where g.community_id = any (p_communities)
    group by g.game_id
  )
  select coalesce(p.game_id, sh.game_id), coalesce(p.players, 0), coalesce(p.sessions, 0), coalesce(sh.copies, 0)
  from plays p full join shelf sh on sh.game_id = p.game_id;
$$;
revoke execute on function public.community_game_popularity(uuid[], date) from public, anon, authenticated;

-- What the home page shows, best first, at most p_limit (1–24) games, one row per game:
--   recent    the caller's played games, newest first. A logged session counts by its date; a game marked Playing or
--             Played with no session counts by the day its status last changed.
--   community the most popular games in the caller's active communities (last 90 days).
--   public    the most popular games on the shelves of public communities with a public shelf. Only games on one of
--             those shelves, so a game kept on a private shelf never reaches visitors through a member's plays.
-- Each tier only fills the slots the previous ones left, and never repeats a game. Visitors get the public tier.
create or replace function public.shelf_highlights(p_limit int default 3)
returns table (game_id uuid, source text, last_played_at date, players int, sessions int, copies int)
language sql stable security definer set search_path = public
as $$
  with params as (
    select auth.uid() as me, least(greatest(coalesce(p_limit, 3), 1), 24) as n, current_date - 90 as since
  ),
  played as (
    select s.game_id, s.played_at as day, s.created_at as at
    from game_sessions s, params p where s.user_id = p.me
    union all
    select u.game_id, u.updated_at::date, u.updated_at
    from user_game_status u, params p
    where u.user_id = p.me and u.status in ('in_progress', 'completed')
      and not exists (select 1 from game_sessions s where s.user_id = p.me and s.game_id = u.game_id)
  ),
  recent as (
    select pl.game_id, max(pl.day) as day, max(pl.at) as at from played pl group by pl.game_id
  ),
  mine as (
    select coalesce(array_agg(m.community_id), '{}') as ids
    from community_memberships m, params p where m.user_id = p.me and m.status = 'active'
  ),
  open_shelves as (
    select coalesce(array_agg(c.id), '{}') as ids
    from communities c where c.visibility = 'public' and c.shelf_visibility = 'public'
  ),
  ranked as (
    select r.game_id, 'recent'::text as source, r.day as last_played_at, null::int as players, null::int as sessions,
           null::int as copies, 1 as tier, row_number() over (order by r.day desc, r.at desc, r.game_id) as rk
    from recent r
    union all
    select c.game_id, 'community', null, c.players, c.sessions, c.copies, 2,
           row_number() over (order by c.players desc, c.sessions desc, c.copies desc, c.game_id)
    from params p, mine, public.community_game_popularity(mine.ids, p.since) c
    union all
    select c.game_id, 'public', null, c.players, c.sessions, c.copies, 3,
           row_number() over (order by c.players desc, c.sessions desc, c.copies desc, c.game_id)
    from params p, open_shelves o, public.community_game_popularity(o.ids, p.since) c
    where c.copies > 0
  ),
  best as (
    select distinct on (rd.game_id) rd.* from ranked rd order by rd.game_id, rd.tier, rd.rk
  )
  select b.game_id, b.source, b.last_played_at, b.players, b.sessions, b.copies
  from best b
  order by b.tier, b.rk
  limit (select n from params);
$$;
revoke execute on function public.shelf_highlights(int) from public;
grant execute on function public.shelf_highlights(int) to anon, authenticated;
