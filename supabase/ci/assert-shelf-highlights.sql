-- CI only: checks after 20261114000002_shelf_highlights. Raises on the first failed expectation.
-- Its own fixtures, removed at the end: players ...0d (no community), ...0e and ...0f (members of the public "ci-hl-open"),
-- games ci-hl-1/2/3 on that shelf, and ci-hl-x only on the private "ci-hl-secret" of the owner ...0a.
reset role;
select set_config('request.jwt.sub', '', false);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000d', 'd@ci.test'),
  ('00000000-0000-0000-0000-00000000000e', 'e@ci.test'),
  ('00000000-0000-0000-0000-00000000000f', 'f@ci.test');
insert into games (title, slug) values ('HL One', 'ci-hl-1'), ('HL Two', 'ci-hl-2'), ('HL Three', 'ci-hl-3'), ('HL Secret', 'ci-hl-x');
insert into communities (slug, name, visibility, city, district, country, created_by) values
  ('ci-hl-open', 'CI Highlights', 'public', 'Lisboa', 'Centro', 'Portugal', '00000000-0000-0000-0000-00000000000e'),
  ('ci-hl-secret', 'CI Secret', 'private', 'Lisboa', 'Centro', 'Portugal', '00000000-0000-0000-0000-00000000000a');
insert into community_memberships (user_id, community_id, role, status)
select '00000000-0000-0000-0000-00000000000f', id, 'member', 'active' from communities where slug = 'ci-hl-open';
insert into community_games (community_id, game_id, added_by, copies)
select c.id, g.id, c.created_by, v.copies
from (values ('ci-hl-open', 'ci-hl-1', 1), ('ci-hl-open', 'ci-hl-2', 3), ('ci-hl-open', 'ci-hl-3', 1), ('ci-hl-secret', 'ci-hl-x', 5)) v (community, game, copies)
join communities c on c.slug = v.community join games g on g.slug = v.game;

-- "slug:source" in rank order, for the caller set in request.jwt.sub.
create function pg_temp.highlights(p_limit int) returns text[] language sql
as $$
  select coalesce(array_agg(g.slug || ':' || h.source order by h.ord), '{}')
  from public.shelf_highlights(p_limit) with ordinality h (game_id, source, last_played_at, players, sessions, copies, ord)
  join public.games g on g.id = h.game_id;
$$;
grant execute on function pg_temp.highlights(int) to anon, authenticated;

-- A member with no history gets their community's ranking: no sessions yet, so the most copies first.
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000e', false);
do $$
declare v text[] := pg_temp.highlights(3);
begin
  if v[1] <> 'ci-hl-2:community' or not (v @> array['ci-hl-1:community', 'ci-hl-3:community']) then
    raise exception 'highlights: a member without history must get the community ranking by copies, got %', v;
  end if;
end $$;
reset role;

-- Another member plays ci-hl-1 twice; ci-hl-3 only 100 days ago, outside the window. Plays outrank copies.
insert into game_sessions (game_id, user_id, played_at)
select g.id, '00000000-0000-0000-0000-00000000000f', d
from games g, (values (current_date), (current_date - 1)) v (d) where g.slug = 'ci-hl-1';
insert into game_sessions (game_id, user_id, played_at)
select id, '00000000-0000-0000-0000-00000000000f', current_date - 100 from games where slug = 'ci-hl-3';
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000e', false);
do $$
declare v text[] := pg_temp.highlights(3);
begin
  if v[1:2] <> array['ci-hl-1:community', 'ci-hl-2:community'] then
    raise exception 'highlights: the most played game must lead the community ranking, got %', v;
  end if;
  if (select players from shelf_highlights(1)) <> 1 or (select sessions from shelf_highlights(1)) <> 2 then
    raise exception 'highlights: popularity must count distinct players and sessions';
  end if;
end $$;
reset role;

-- The player logs ci-hl-3 yesterday and marks ci-hl-2 as Played today (no session): both lead, newest first, and the
-- free slot is filled with a popular game they have not played.
insert into game_sessions (game_id, user_id, played_at)
select id, '00000000-0000-0000-0000-00000000000e', current_date - 1 from games where slug = 'ci-hl-3';
insert into user_game_status (user_id, game_id, status)
select '00000000-0000-0000-0000-00000000000e', id, 'completed' from games where slug = 'ci-hl-2';
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000e', false);
do $$
declare v text[] := pg_temp.highlights(3);
begin
  if v <> array['ci-hl-2:recent', 'ci-hl-3:recent', 'ci-hl-1:community'] then
    raise exception 'highlights: recent games first, then popular ones, got %', v;
  end if;
  if pg_temp.highlights(2) <> array['ci-hl-2:recent', 'ci-hl-3:recent'] then
    raise exception 'highlights: the limit must cut the list';
  end if;
  if (select last_played_at from shelf_highlights(3) h join games g on g.id = h.game_id where g.slug = 'ci-hl-3') <> current_date - 1 then
    raise exception 'highlights: last_played_at must be the session date';
  end if;
  if pg_temp.highlights(24) && array['ci-hl-x:community', 'ci-hl-x:public'] then
    raise exception 'highlights: a private community''s games must not reach a non-member';
  end if;
end $$;
reset role;

-- Visitors and players without a community get the public ranking, without private shelves.
insert into game_sessions (game_id, user_id, played_at)
select id, '00000000-0000-0000-0000-00000000000a', current_date from games where slug = 'ci-hl-x';
set role anon;
select set_config('request.jwt.sub', '', false);
do $$
declare v text[] := pg_temp.highlights(24);
begin
  if cardinality(v) = 0 or exists (select 1 from unnest(v) x where x not like '%:public') then
    raise exception 'highlights: visitors must only get the public ranking, got %', v;
  end if;
  if v && array['ci-hl-x:public'] then
    raise exception 'highlights: a private community''s games must not reach visitors';
  end if;
  if array_position(v, 'ci-hl-1:public') > array_position(v, 'ci-hl-3:public') then
    raise exception 'highlights: the public ranking must put played games first, got %', v;
  end if;
  if cardinality(pg_temp.highlights(0)) <> 1 or cardinality(pg_temp.highlights(1000)) > 24 then
    raise exception 'highlights: the limit must stay between 1 and 24';
  end if;
end $$;
reset role;
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000d', false);
do $$
declare v text[] := pg_temp.highlights(3);
begin
  if cardinality(v) <> 3 or exists (select 1 from unnest(v) x where x not like '%:public') then
    raise exception 'highlights: a player without community or history must get the public ranking, got %', v;
  end if;
end $$;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$
begin
  if not (pg_temp.highlights(24) @> array['ci-hl-x:recent']) then
    raise exception 'highlights: a player''s own game must show even when only a private shelf has it';
  end if;
end $$;
reset role;

-- A members-only shelf leaves the public ranking.
update communities set shelf_visibility = 'private' where slug = 'ci-hl-open';
set role anon;
select set_config('request.jwt.sub', '', false);
do $$
begin
  if pg_temp.highlights(24) && array['ci-hl-2:public'] then
    raise exception 'highlights: a members-only shelf must not reach visitors';
  end if;
end $$;
reset role;

do $$
begin
  if has_function_privilege('anon', 'public.community_game_popularity(uuid[], date)', 'execute')
     or has_function_privilege('authenticated', 'public.community_game_popularity(uuid[], date)', 'execute') then
    raise exception 'highlights: community_game_popularity must not be callable by clients';
  end if;
  if not has_function_privilege('anon', 'public.shelf_highlights(int)', 'execute') then
    raise exception 'highlights: visitors must be able to call shelf_highlights';
  end if;
end $$;

-- Leave the database as it was.
delete from game_sessions where game_id in (select id from games where slug like 'ci-hl-%');
delete from user_game_status where game_id in (select id from games where slug like 'ci-hl-%');
delete from communities where slug in ('ci-hl-open', 'ci-hl-secret');
delete from games where slug like 'ci-hl-%';
delete from auth.users where id in ('00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-00000000000f');
drop function pg_temp.highlights(int);
select set_config('request.jwt.sub', '', false);
