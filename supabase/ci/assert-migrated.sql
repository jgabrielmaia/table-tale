-- CI only: checks after the community migrations. Raises on the first failed expectation.
-- Fixtures: owner ...0a, players ...0b and ...0c (see seed-before-communities.sql).
reset role;
select set_config('request.jwt.sub', '', false);
delete from public.communities where slug like 'ci-%';

-- Backfill preserved data
do $$
begin
  if (select count(*) from community_memberships m join communities c on c.id = m.community_id where c.slug = 'table-tale') <> 3 then
    raise exception 'backfill: expected 3 members in the default community';
  end if;
  if not exists (select 1 from community_memberships where user_id = '00000000-0000-0000-0000-00000000000a' and role = 'owner' and status = 'active') then
    raise exception 'backfill: owner is not an active owner';
  end if;
  if (select count(*) from community_games) <> 2 then raise exception 'backfill: expected 2 library games'; end if;
  if (select copies from community_games cg join games g on g.id = cg.game_id where g.slug = 'catan') <> 2 then
    raise exception 'backfill: catan quantity not preserved';
  end if;
  if (select count(*) from user_games) <> 4 then raise exception 'personal collections changed (expected 4 rows)'; end if;
  if (select count(*) from game_ownerships) <> 4 then raise exception 'compat view game_ownerships does not mirror user_games'; end if;
  if exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name like '%community%') then
    raise exception 'profiles must not reference a community';
  end if;
end $$;

-- Creating a community makes the creator its owner; a user can create several
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000b', false);
insert into communities (slug, name, city, district, country, latitude, longitude) values ('ci-lisbon', 'CI Lisbon', 'Lisboa', 'Alvalade', 'Portugal', 38.75, -9.14);
insert into communities (slug, name, city, district, country, latitude, longitude) values ('ci-porto', 'CI Porto', 'Porto', 'Boavista', 'Portugal', 41.16, -8.65);
do $$
begin
  if (select count(*) from community_memberships m join communities c on c.id = m.community_id
      where c.slug in ('ci-lisbon', 'ci-porto') and m.user_id = auth.uid() and m.role = 'owner' and m.status = 'active') <> 2 then
    raise exception 'creator must become an active owner of each created community';
  end if;
end $$;

-- Location is mandatory; slug is unique
do $$
begin
  begin
    insert into communities (slug, name, city, district, country, latitude, longitude) values ('ci-bad', 'Bad', '', 'd', 'p', 0, 0);
    raise exception 'empty city must be rejected';
  exception when check_violation then null;
  end;
  begin
    insert into communities (slug, name, city, district, country, latitude, longitude) values ('ci-lisbon', 'Dup', 'x', 'y', 'z', 0, 0);
    raise exception 'duplicate slug must be rejected';
  exception when unique_violation then null;
  end;
end $$;

-- Library: managers add; the same game can live in several libraries independently
insert into community_games (community_id, game_id, copies)
select c.id, g.id, 1 from communities c, games g where c.slug = 'ci-lisbon' and g.slug = 'azul';
insert into community_games (community_id, game_id, copies)
select c.id, g.id, 3 from communities c, games g where c.slug = 'ci-porto' and g.slug = 'azul';

-- Joining a public community is an active membership, unique per (user, community); roles cannot be self-assigned
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000c', false);
insert into community_memberships (user_id, community_id) select auth.uid(), id from communities where slug = 'ci-lisbon';
do $$
begin
  begin
    insert into community_memberships (user_id, community_id) select auth.uid(), id from communities where slug = 'ci-lisbon';
    raise exception 'second membership must be rejected';
  exception when unique_violation then null;
  end;
  begin
    insert into community_memberships (user_id, community_id, role) select auth.uid(), id, 'admin' from communities where slug = 'ci-porto';
    raise exception 'self-assigned admin must be rejected';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into community_games (community_id, game_id, copies)
    select c.id, g.id, 1 from communities c, games g where c.slug = 'ci-lisbon' and g.slug = 'dixit';
    raise exception 'a plain member must not add library games';
  exception when insufficient_privilege then null;
  end;
end $$;

-- The last owner cannot leave; ownership can be transferred, after which the old owner may leave
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$
begin
  begin
    delete from community_memberships where user_id = auth.uid() and community_id = (select id from communities where slug = 'ci-lisbon');
    raise exception 'last owner must not be able to leave';
  exception when check_violation then null;
  end;
end $$;
select transfer_community_ownership((select id from communities where slug = 'ci-lisbon'), '00000000-0000-0000-0000-00000000000c');
delete from community_memberships where user_id = auth.uid() and community_id = (select id from communities where slug = 'ci-lisbon');
do $$
begin
  if (select count(*) from user_games where user_id = auth.uid()) <> 1 then raise exception 'leaving a community must not touch the personal library'; end if;
end $$;

-- Private communities are invisible to outsiders and anonymous users
insert into communities (slug, name, city, district, country, visibility, latitude, longitude) values ('ci-secret', 'CI Secret', 'Faro', 'Centro', 'Portugal', 'private', 37.02, -7.93);
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000c', false);
do $$
begin
  if exists (select 1 from communities where slug = 'ci-secret') then raise exception 'private community visible to a non-member'; end if;
end $$;
set role anon;
select set_config('request.jwt.sub', '', false);
do $$
begin
  if exists (select 1 from communities where slug = 'ci-secret') then raise exception 'private community visible to anon'; end if;
  if not exists (select 1 from communities where slug = 'table-tale') then raise exception 'public community not visible to anon'; end if;
end $$;

-- Cleanup: removing communities cascades, leaves the catalog and personal collections alone
reset role;
delete from communities where slug like 'ci-%';
do $$
begin
  if (select count(*) from games where slug not like 'ci-bgg%') <> 3 then raise exception 'catalog changed'; end if;
  if (select count(*) from user_games) <> 4 then raise exception 'personal collections changed'; end if;
end $$;
