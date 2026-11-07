-- Rollback of contract/20261107000002_drop_genre_complexity.sql
-- Brings the columns back as nullable (the shape left by 20261107000001_bgg_games.sql). Their old values are gone:
-- genre is refilled from the first BGG category, complexity stays null.

alter table public.games
  add column genre text,
  add column complexity text;
update public.games set genre = categories[1];
create index games_genre_idx on public.games (genre);

create or replace function public.compute_user_metrics(p_user uuid)
returns table (
  sessions int,
  games_played int,
  completed int,
  favorites int,
  events int,
  genres int,
  minutes int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::int from game_sessions s where s.user_id = p_user),
    (select count(*)::int from (
        select game_id from game_sessions where user_id = p_user
        union
        select game_id from user_game_status where user_id = p_user and status in ('in_progress', 'completed')
      ) played),
    (select count(*)::int from user_game_status u where u.user_id = p_user and u.status = 'completed'),
    (select count(*)::int from user_game_status u where u.user_id = p_user and u.is_favorite),
    (select count(*)::int from event_participants e where e.user_id = p_user),
    (select count(distinct c)::int
       from game_sessions s
       join games g on g.id = s.game_id
       cross join lateral unnest(case when cardinality(g.categories) > 0 then g.categories else array[g.genre] end) c
      where s.user_id = p_user and c is not null),
    (select coalesce(sum(coalesce(s.duration_minutes, g.duration_minutes)), 0)::int
       from game_sessions s join games g on g.id = s.game_id where s.user_id = p_user);
$$;
