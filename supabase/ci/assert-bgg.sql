-- CI only: checks after the BGG expand migration (20261107000001). Leaves one BGG-imported game ('ci-bgg') behind on
-- purpose, so the rollback has to cope with a game whose genre, complexity, players and duration are null.
reset role;
select set_config('request.jwt.sub', '', false);

do $$
begin
  if (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'games'
        and column_name in ('bgg_id', 'bgg_data', 'bgg_synced_at', 'categories', 'mechanics', 'year_published', 'min_age',
                            'bgg_rating', 'bgg_rating_count', 'bgg_rank', 'bgg_weight')) <> 11 then
    raise exception 'bgg: missing columns on games';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'games'
        and column_name in ('genre', 'complexity', 'min_players', 'max_players', 'duration_minutes') and is_nullable = 'NO') then
    raise exception 'bgg: genre, complexity, players and duration must be nullable (expand phase)';
  end if;
  if (select column_default from information_schema.columns where table_schema = 'public' and table_name = 'games' and column_name = 'complexity') is not null then
    raise exception 'bgg: complexity must no longer default to Leve';
  end if;
  if not exists (select 1 from pg_indexes where indexname = 'games_categories_idx' and indexdef like '%gin%')
     or not exists (select 1 from pg_indexes where indexname = 'games_mechanics_idx' and indexdef like '%gin%') then
    raise exception 'bgg: GIN indexes missing';
  end if;
  if (select genre from games where slug = 'catan') is distinct from 'Strategy' then raise exception 'bgg: legacy genre must be preserved'; end if;
  if (select categories from games where slug = 'catan') <> '{}' then raise exception 'bgg: legacy games start with no categories'; end if;
end $$;

-- A game imported from BGG: only BGG data, nothing of ours
insert into games (title, slug, description, cover_url, bgg_id, bgg_data, bgg_synced_at, categories, mechanics,
                   year_published, min_age, bgg_rating, bgg_rating_count, bgg_rank, bgg_weight)
values ('CI BGG Game', 'ci-bgg', 'd', null, 424242, '{"id": 424242, "name": "CI BGG Game"}', now(), '{Economic,Negotiation}', '{Trading}',
        1995, 10, 7.12, 120000, 450, 2.31);

do $$
begin
  if not exists (select 1 from games where categories @> array['Economic'] and mechanics @> array['Trading'] and bgg_id = 424242) then
    raise exception 'bgg: category/mechanic filtering failed';
  end if;
  begin
    insert into games (title, slug, bgg_id) values ('Dup', 'ci-bgg-dup', 424242);
    raise exception 'duplicate bgg_id must be rejected';
  exception when unique_violation then null;
  end;
  begin
    insert into games (title, slug, bgg_id, bgg_rating) values ('Bad', 'ci-bgg-bad', 424243, 11);
    raise exception 'rating above 10 must be rejected';
  exception when check_violation then null;
  end;
  begin
    insert into games (title, slug, min_players) values ('Bad', 'ci-bgg-bad', 0);
    raise exception 'min_players = 0 must still be rejected';
  exception when check_violation then null;
  end;
end $$;

-- The catalog stays read-only for clients: only the service role (the Edge Function) writes games
set role anon;
do $$
begin
  if not exists (select 1 from games where slug = 'ci-bgg') then raise exception 'bgg: imported game not readable by anon'; end if;
  begin
    insert into games (title, slug, bgg_id) values ('Anon', 'ci-bgg-anon', 424244);
    raise exception 'anon must not write games';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$
begin
  begin
    insert into games (title, slug, bgg_id) values ('User', 'ci-bgg-user', 424245);
    raise exception 'authenticated users must not write games directly';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set role service_role;
insert into games (title, slug, bgg_id) values ('Service', 'ci-bgg-service', 424246);
delete from games where slug = 'ci-bgg-service';
reset role;

-- The "genres" metric counts BGG categories (and the legacy genre for games without any)
insert into game_sessions (game_id, user_id, played_at)
select id, '00000000-0000-0000-0000-00000000000b', current_date from games where slug in ('ci-bgg', 'catan');
do $$
begin
  if (select genres from compute_user_metrics('00000000-0000-0000-0000-00000000000b')) <> 3 then
    raise exception 'bgg: genres metric expected 3 (2 BGG categories + legacy genre)';
  end if;
end $$;
delete from game_sessions where user_id = '00000000-0000-0000-0000-00000000000b';
