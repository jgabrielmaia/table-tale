-- CI only: checks after 20261111000001_reviews_and_privacy. Raises on the first failed expectation and cleans up what it adds.
-- Fixtures: owner ...0a, players ...0b and ...0c (see seed-before-communities.sql).
reset role;
select set_config('request.jwt.sub', '', false);
delete from public.communities where slug like 'ci-g-%';

-- Backfill: each player's latest rated session per game became a review; the average is separate from BGG.
do $$
declare v_catan uuid := (select id from games where slug = 'catan');
begin
  if (select count(*) from game_reviews) <> 2 then raise exception 'reviews backfill: expected 2 reviews'; end if;
  if (select rating from game_reviews where game_id = v_catan and user_id = '00000000-0000-0000-0000-00000000000c') <> 5 then
    raise exception 'reviews backfill: the latest session rating must win';
  end if;
  if (select (review_count, rating_avg) from game_review_stats where game_id = v_catan) is distinct from (2, 4.00) then
    raise exception 'review stats: expected 2 reviews averaging 4.00 for catan';
  end if;
  if exists (select 1 from game_review_stats where game_id = (select id from games where slug = 'azul')) then
    raise exception 'review stats: unrated sessions must not create reviews';
  end if;
end $$;

-- Reviews: signed-in players write, edit and delete only their own; one per game; rating 1–5; feedback ≤ 1000.
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000b', false);
insert into game_reviews (game_id, rating, feedback) select id, 4, 'Bonito e rápido.' from games where slug = 'azul';
update game_reviews set rating = 3 where game_id = (select id from games where slug = 'azul');
do $$
declare n int;
begin
  if (select rating from game_reviews where user_id = auth.uid() and game_id = (select id from games where slug = 'azul')) <> 3 then
    raise exception 'reviews: the author must be able to edit their review';
  end if;
  begin
    insert into game_reviews (game_id, rating) select id, 2 from games where slug = 'azul';
    raise exception 'reviews: a second review of the same game must be rejected';
  exception when unique_violation then null;
  end;
  begin
    insert into game_reviews (game_id, user_id, rating) select id, '00000000-0000-0000-0000-00000000000c', 1 from games where slug = 'dixit';
    raise exception 'reviews: writing a review as someone else must be rejected';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into game_reviews (game_id, rating) select id, 6 from games where slug = 'dixit';
    raise exception 'reviews: a rating above 5 must be rejected';
  exception when check_violation then null;
  end;
  begin
    insert into game_reviews (game_id, rating, feedback) select id, 3, repeat('x', 1001) from games where slug = 'dixit';
    raise exception 'reviews: feedback over 1000 characters must be rejected';
  exception when check_violation then null;
  end;
  update game_reviews set rating = 1 where user_id = '00000000-0000-0000-0000-00000000000c';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'reviews: editing someone else''s review must change nothing'; end if;
  delete from game_reviews where user_id = '00000000-0000-0000-0000-00000000000c';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'reviews: deleting someone else''s review must change nothing'; end if;
end $$;
delete from game_reviews where user_id = auth.uid() and game_id = (select id from games where slug = 'azul');

-- Reviews and their averages are public, also to anonymous visitors.
set role anon;
select set_config('request.jwt.sub', '', false);
do $$
begin
  if (select count(*) from game_reviews) <> 2 then raise exception 'reviews: anon must read every review'; end if;
  if not exists (select 1 from game_review_stats) then raise exception 'reviews: anon must read the averages'; end if;
  begin
    insert into game_reviews (game_id, rating) select id, 5 from games where slug = 'dixit';
    raise exception 'reviews: anon must not write reviews';
  exception when insufficient_privilege then null;
  end;
end $$;

-- "My games" is private: anon has no access, other players see nothing, the owner sees their own.
do $$
begin
  begin
    perform 1 from user_games;
    raise exception 'user_games: anon must not read personal collections';
  exception when insufficient_privilege then null;
  end;
end $$;
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000c', false);
do $$
begin
  if exists (select 1 from user_games) then raise exception 'user_games: another player''s games must be invisible'; end if;
  if exists (select 1 from game_ownerships) then raise exception 'game_ownerships view must follow user_games privacy'; end if;
end $$;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$
begin
  if (select count(*) from user_games) <> 1 then raise exception 'user_games: the owner must see their own games'; end if;
end $$;

-- New communities need coordinates.
do $$
begin
  begin
    insert into communities (slug, name, city, district, country) values ('ci-g-nowhere', 'Nowhere', 'Lisboa', 'Centro', 'Portugal');
    raise exception 'communities: a new community without coordinates must be rejected';
  exception when insufficient_privilege then null;
  end;
end $$;
insert into communities (slug, name, city, district, country, latitude, longitude) values ('ci-g-shelf', 'CI Shelf', 'Lisboa', 'Centro', 'Portugal', 38.72, -9.14);

-- Shelves: only owners add, change or remove games; an admin cannot.
insert into community_games (community_id, game_id, copies) select c.id, g.id, 1 from communities c, games g where c.slug = 'ci-g-shelf' and g.slug = 'azul';
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000c', false);
insert into community_memberships (user_id, community_id) select auth.uid(), id from communities where slug = 'ci-g-shelf';
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000b', false);
update community_memberships set role = 'admin' where user_id = '00000000-0000-0000-0000-00000000000c' and community_id = (select id from communities where slug = 'ci-g-shelf');
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000c', false);
do $$
declare n int;
begin
  if (select role from community_memberships where user_id = auth.uid() and community_id = (select id from communities where slug = 'ci-g-shelf')) <> 'admin' then
    raise exception 'setup: C should be an admin of ci-g-shelf';
  end if;
  begin
    insert into community_games (community_id, game_id, copies) select c.id, g.id, 1 from communities c, games g where c.slug = 'ci-g-shelf' and g.slug = 'dixit';
    raise exception 'community_games: an admin must not add games';
  exception when insufficient_privilege then null;
  end;
  update community_games set copies = 5 where community_id = (select id from communities where slug = 'ci-g-shelf');
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'community_games: an admin must not change copies'; end if;
  delete from community_games where community_id = (select id from communities where slug = 'ci-g-shelf');
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'community_games: an admin must not remove games'; end if;
end $$;

-- The BGG search cache is for the Edge Function only.
do $$
begin
  begin
    perform 1 from bgg_search_cache;
    raise exception 'bgg_search_cache: signed-in users must not read the cache';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
select set_config('request.jwt.sub', '', false);
delete from communities where slug like 'ci-g-%';
do $$
begin
  if (select count(*) from game_reviews) <> 2 then raise exception 'cleanup: reviews changed'; end if;
end $$;
