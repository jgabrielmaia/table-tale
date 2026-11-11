-- CI only: checks after 20261112000003_community_member_count and 20261112000004_no_default_community_join.
-- Raises on the first failed expectation.
-- Fixtures: owner ...0a, players ...0b and ...0c, all members of the default community from the backfill
-- (see seed-before-communities.sql). Newcomer ...0d is created and removed here.
reset role;
select set_config('request.jwt.sub', '', false);
delete from public.communities where slug like 'ci-n-%';
delete from auth.users where id = '00000000-0000-0000-0000-00000000000d';

-- The automatic join is gone; existing members of the default community are untouched.
do $$
begin
  if exists (select 1 from pg_trigger where tgname = 'profiles_join_default_community') then
    raise exception 'onboarding: profiles_join_default_community must be dropped';
  end if;
  if exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'tg_join_default_community') then
    raise exception 'onboarding: tg_join_default_community must be dropped';
  end if;
  if (select count(*) from community_memberships m join communities c on c.id = m.community_id
      where c.slug = 'table-tale' and m.status = 'active') <> 3 then
    raise exception 'onboarding: existing members of the default community must be kept';
  end if;
end $$;

-- A newcomer signs up: a profile, and no community at all.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000d', 'd@ci.test');
do $$
begin
  if not exists (select 1 from profiles where id = '00000000-0000-0000-0000-00000000000d') then
    raise exception 'onboarding: signing up must still create a profile';
  end if;
  if exists (select 1 from community_memberships where user_id = '00000000-0000-0000-0000-00000000000d') then
    raise exception 'onboarding: a new profile must belong to no community';
  end if;
end $$;

-- The newcomer picks a community: a public one is joined at once, a private one is a pending request.
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000c', false);
insert into communities (slug, name, city, district, country, visibility) values ('ci-n-secret', 'CI Secret', 'Faro', 'Centro', 'Portugal', 'private');
-- Private communities are invisible to outsiders, so the request uses an id handed over out of band.
reset role;
select set_config('ci.n_secret', (select id::text from communities where slug = 'ci-n-secret'), false);
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000d', false);
insert into community_memberships (user_id, community_id, status) select auth.uid(), id, 'active' from communities where slug = 'table-tale';
do $$
begin
  begin
    insert into community_memberships (user_id, community_id, status) values (auth.uid(), current_setting('ci.n_secret')::uuid, 'active');
    raise exception 'onboarding: a private community must not be joined without approval';
  exception when insufficient_privilege then null;
  end;
end $$;
insert into community_memberships (user_id, community_id, status) values (auth.uid(), current_setting('ci.n_secret')::uuid, 'pending');
reset role;
do $$
begin
  if (select status from community_memberships m join communities c on c.id = m.community_id
      where c.slug = 'table-tale' and m.user_id = '00000000-0000-0000-0000-00000000000d') <> 'active' then
    raise exception 'onboarding: joining a public community must be active at once';
  end if;
end $$;

-- member_count: anon sees the count of public communities, and nothing of the memberships themselves.
set role anon;
select set_config('request.jwt.sub', '', false);
do $$
begin
  if has_table_privilege('anon', 'public.community_memberships', 'select') then
    raise exception 'member_count: anon must not read community_memberships';
  end if;
  if (select public.member_count(c) from communities c where c.slug = 'table-tale') <> 4 then
    raise exception 'member_count: anon must get the active member count of a public community';
  end if;
  if exists (select 1 from communities where slug = 'ci-n-secret') then
    raise exception 'member_count: a private community must stay invisible to anon';
  end if;
end $$;

-- A made-up row for a private community (calling the function as an RPC) gets null, not the count.
reset role;
create temporary table ci_n_fake as select * from communities where slug = 'ci-n-secret';
grant select on ci_n_fake to anon, authenticated;
set role anon;
do $$
begin
  if (select public.member_count(row(f.*)::public.communities) from ci_n_fake f) is not null then
    raise exception 'member_count: anon must not learn the size of a private community';
  end if;
end $$;
set role authenticated;
-- B is not linked to the private community: null too. Its owner C sees it; pending requests do not count.
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$
begin
  if (select public.member_count(row(f.*)::public.communities) from ci_n_fake f) is not null then
    raise exception 'member_count: an outsider must not learn the size of a private community';
  end if;
end $$;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000c', false);
do $$
begin
  if (select public.member_count(c) from communities c where c.slug = 'ci-n-secret') <> 1 then
    raise exception 'member_count: the owner sees the active count (pending requests excluded)';
  end if;
end $$;

-- Cleanup
reset role;
select set_config('request.jwt.sub', '', false);
drop table ci_n_fake;
delete from communities where slug like 'ci-n-%';
delete from auth.users where id = '00000000-0000-0000-0000-00000000000d';
do $$
begin
  if exists (select 1 from community_memberships where user_id = '00000000-0000-0000-0000-00000000000d') then
    raise exception 'onboarding: cleanup left the newcomer behind';
  end if;
end $$;
