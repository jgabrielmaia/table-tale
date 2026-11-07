-- Table Tale — dados do BoardGameGeek no catálogo (fase "expand" de expand/contract)
-- Migração aditiva e compatível com a app já em produção: acrescenta colunas BGG e torna anuláveis as colunas que
-- o BGG não fornece. `genre` e `complexity` NÃO são apagadas aqui: a app em produção ainda as lê. A remoção está em
-- supabase/contract/ e só deve ser aplicada depois de a nova app e a função `bgg` estarem em produção.

alter table public.games
  add column bgg_id int unique check (bgg_id > 0),
  add column bgg_data jsonb,
  add column bgg_synced_at timestamptz,
  add column categories text[] not null default '{}',
  add column mechanics text[] not null default '{}',
  add column year_published int,
  add column min_age int check (min_age >= 0),
  add column bgg_rating numeric(4, 2) check (bgg_rating between 0 and 10),
  add column bgg_rating_count int check (bgg_rating_count >= 0),
  add column bgg_rank int check (bgg_rank > 0),
  add column bgg_weight numeric(3, 2) check (bgg_weight between 0 and 5);

comment on column public.games.bgg_data is 'Item completo do BGG tal como devolvido (os termos do BGG proíbem alterar os dados). Fonte única; as colunas tipadas abaixo são derivadas.';
comment on column public.games.categories is 'Categorias do BGG (boardgamecategory), copiadas de bgg_data para filtrar.';
comment on column public.games.mechanics is 'Mecânicas do BGG (boardgamemechanic), copiadas de bgg_data para filtrar.';

create index games_categories_idx on public.games using gin (categories);
create index games_mechanics_idx on public.games using gin (mechanics);

-- O BGG não tem género nem complexidade nossos, e devolve 0 ("desconhecido") para jogadores e duração.
-- As verificações existentes (>= 1, max >= min, > 0) continuam a valer para valores não nulos.
alter table public.games
  alter column genre drop not null,
  alter column complexity drop not null,
  alter column complexity drop default,
  alter column min_players drop not null,
  alter column max_players drop not null,
  alter column duration_minutes drop not null;

-- A conquista "géneros" passa a contar categorias BGG distintas (jogos antigos, sem BGG, continuam a contar o `genre`).
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
