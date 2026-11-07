-- Table Tale — remover `genre` e `complexity` (fase "contract" de expand/contract)
-- NÃO aplicar antes de a nova app (sem genre/complexity) e a função `bgg` estarem em produção: a app antiga ainda
-- lê estas colunas e deixaria de listar jogos. Ordem completa em docs/bgg-integration.md.
-- Este ficheiro vive em supabase/contract/ para `supabase db push` não o aplicar por engano; depois do deploy,
-- mover para supabase/migrations/ (git mv) com o mesmo nome num PR seguinte.

-- A conquista "géneros" passa a contar só categorias BGG.
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
       cross join lateral unnest(g.categories) c
      where s.user_id = p_user),
    (select coalesce(sum(coalesce(s.duration_minutes, g.duration_minutes)), 0)::int
       from game_sessions s join games g on g.id = s.game_id where s.user_id = p_user);
$$;

drop index if exists public.games_genre_idx;
alter table public.games
  drop column genre,
  drop column complexity;
