-- CI only: checks after supabase/contract/20261107000002_drop_genre_complexity.sql.
reset role;
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'games' and column_name in ('genre', 'complexity')) then
    raise exception 'contract: genre/complexity must be gone';
  end if;
  if exists (select 1 from pg_indexes where indexname = 'games_genre_idx') then raise exception 'contract: games_genre_idx must be gone'; end if;
  if pg_get_functiondef('public.compute_user_metrics(uuid)'::regprocedure) like '%g.genre%' then
    raise exception 'contract: compute_user_metrics still references genre';
  end if;
  if not exists (select 1 from games where slug = 'ci-bgg') then raise exception 'contract: games lost'; end if;
end $$;
-- Still works without the legacy columns
insert into game_sessions (game_id, user_id, played_at)
select id, '00000000-0000-0000-0000-00000000000b', current_date from games where slug = 'ci-bgg';
do $$
begin
  if (select genres from compute_user_metrics('00000000-0000-0000-0000-00000000000b')) <> 2 then
    raise exception 'contract: genres metric expected 2 BGG categories';
  end if;
end $$;
delete from game_sessions where user_id = '00000000-0000-0000-0000-00000000000b';
