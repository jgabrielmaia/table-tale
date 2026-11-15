-- CI only: checks after 20261115000002_create_game. Raises on the first failed expectation.
-- Fixtures: ...0b and ...0c are plain players.
reset role;
select set_config('request.jwt.sub', '', false);
grant select on public.games to anon, authenticated;

-- A player adds a game by hand: they own it, the slug comes from the title without accents, the input is cleaned.
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000b', false);
create temporary table created as
  select * from public.create_game('  Café   Noir ', ' Jogo de cartas ', 2, 4, 30, array['Card Game', ' Party ']);
grant select on created to public;
reset role;
do $$
declare g record;
begin
  select * into g from games where slug = 'cafe-noir';
  if g.id is null then raise exception 'create game: slug must come from the title without accents'; end if;
  if g.title <> 'Café   Noir' then raise exception 'create game: title is trimmed only (got %)', g.title; end if;
  if g.owner_id <> '00000000-0000-0000-0000-00000000000b' then raise exception 'create game: the creator must own the game'; end if;
  if g.description <> 'Jogo de cartas' or g.min_players <> 2 or g.max_players <> 4 or g.duration_minutes <> 30 then
    raise exception 'create game: details not stored';
  end if;
  if g.categories <> '{"Card Game",Party}' then raise exception 'create game: categories not trimmed (got %)', g.categories; end if;
  if g.bgg_id is not null then raise exception 'create game: a hand-made game has no BGG link'; end if;
  if (select game_id from created) <> g.id then raise exception 'create game: must return the new id'; end if;
end $$;

-- The same title gets the next free slug; only the title is required; a title with no letters still gets a slug.
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000b', false);
select public.create_game('Café Noir');
select public.create_game('Café Noir');
select public.create_game('♞♞');
reset role;
do $$
begin
  if (select count(*) from games where slug in ('cafe-noir-2', 'cafe-noir-3')) <> 2 then raise exception 'create game: numeric suffix for taken slugs'; end if;
  if not exists (select 1 from games where slug = 'game' and title = '♞♞' and min_players is null and duration_minutes is null and categories = '{}') then
    raise exception 'create game: optional fields stay empty, slug falls back to "game"';
  end if;
end $$;

-- The owner can still edit the categories of the game they made.
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000b', false);
update games set categories = '{Party}' where slug = 'cafe-noir';
reset role;
do $$
begin
  if (select categories from games where slug = 'cafe-noir') <> '{Party}' then raise exception 'create game: the creator must be able to edit categories'; end if;
end $$;

-- Refusals: anonymous, signed out, and every invalid input.
set role anon;
do $$
begin
  begin
    perform public.create_game('Nope');
    raise exception 'create game: anon must not be able to create games';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.sub', '', false);
do $$
begin
  begin
    perform public.create_game('Nope');
    raise exception 'create game: a signed-out call must be refused';
  exception when insufficient_privilege then null;
  end;
end $$;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$
declare
  stmt text;
begin
  foreach stmt in array array[
    $q$select public.create_game('   ')$q$,
    $q$select public.create_game(repeat('x', 81))$q$,
    $q$select public.create_game('A', repeat('x', 2001))$q$,
    $q$select public.create_game('A', '', 0, 4)$q$,
    $q$select public.create_game('A', '', 2, 100)$q$,
    $q$select public.create_game('A', '', 5, 3)$q$,
    $q$select public.create_game('A', '', null, null, 0)$q$,
    $q$select public.create_game('A', '', null, null, 1441)$q$,
    $q$select public.create_game('A', '', null, null, null, array[' '])$q$,
    $q$select public.create_game('A', '', null, null, null, array[repeat('x', 61)])$q$
  ] loop
    begin
      execute stmt;
      raise exception 'create game: should have been refused: %', stmt;
    exception when invalid_parameter_value then null;
    end;
  end loop;
end $$;
reset role;

-- One account cannot add more than 20 games a day.
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000c', false);
select public.create_game('Bulk ' || i) from generate_series(1, 20) i;
do $$
begin
  begin
    perform public.create_game('Bulk 21');
    raise exception 'create game: the 21st game of the day must be refused';
  exception when program_limit_exceeded then null;
  end;
end $$;
reset role;

delete from games where owner_id in ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c');
drop table created;
