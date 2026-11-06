-- Rollback of 20261107000001_bgg_games.sql
-- Warning: the BGG columns (bgg_data, categories, mechanics, ratings...) are dropped, so data imported from BGG is lost.
-- Games imported from BGG are kept (and so are their library entries), but the columns the old schema required are
-- filled with placeholders: genre = first BGG category (or 'Outros'), complexity = 'Leve',
-- players = 1..max (or 1), duration = 60.

update public.games set
  genre = coalesce(genre, categories[1], 'Outros'),
  complexity = coalesce(complexity, 'Leve'),
  min_players = coalesce(min_players, 1),
  duration_minutes = coalesce(duration_minutes, 60)
where genre is null or complexity is null or min_players is null or duration_minutes is null;
update public.games set max_players = min_players where max_players is null;

alter table public.games
  alter column genre set not null,
  alter column complexity set default 'Leve',
  alter column complexity set not null,
  alter column min_players set not null,
  alter column max_players set not null,
  alter column duration_minutes set not null;

drop index public.games_categories_idx;
drop index public.games_mechanics_idx;
alter table public.games
  drop column bgg_id,
  drop column bgg_data,
  drop column bgg_synced_at,
  drop column categories,
  drop column mechanics,
  drop column year_published,
  drop column min_age,
  drop column bgg_rating,
  drop column bgg_rating_count,
  drop column bgg_rank,
  drop column bgg_weight;

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
    (select count(distinct g.genre)::int from game_sessions s join games g on g.id = s.game_id where s.user_id = p_user),
    (select coalesce(sum(coalesce(s.duration_minutes, g.duration_minutes)), 0)::int
       from game_sessions s join games g on g.id = s.game_id where s.user_id = p_user);
$$;
