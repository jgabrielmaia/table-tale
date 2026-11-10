-- CI only: checks after 20261112000002_achievement_owner ("Guardião da Estante"). Raises on the first failed expectation.
-- Fixtures: owner ...0a (owns the default community after the backfill), players ...0b and ...0c (see seed-before-communities.sql).
reset role;
select set_config('request.jwt.sub', '', false);
delete from public.communities where slug like 'ci-o-%';

create or replace function pg_temp.has_owner_achievement(p uuid) returns boolean language sql as $$
  select exists (select 1 from user_achievements ua join achievements a on a.id = ua.achievement_id
                 where a.slug = 'guardiao-da-estante' and ua.user_id = p)
$$;

do $$
begin
  if not exists (select 1 from achievements where slug = 'guardiao-da-estante' and requirement_type = 'community_owner' and requirement_value = 1 and icon = 'crown') then
    raise exception 'owner achievement: row missing or wrong';
  end if;
  if not pg_temp.has_owner_achievement('00000000-0000-0000-0000-00000000000a') then
    raise exception 'owner achievement: existing owners must get it from the backfill';
  end if;
end $$;

-- C owns nothing yet (assert-migrated may have made C an owner of a ci- community it then deleted: start clean).
delete from user_achievements where user_id = '00000000-0000-0000-0000-00000000000c'
  and achievement_id = (select id from achievements where slug = 'guardiao-da-estante');
select recompute_progress('00000000-0000-0000-0000-00000000000c');
create temporary table owner_xp as select experience_points as xp from profiles where id = '00000000-0000-0000-0000-00000000000c';
do $$
begin
  if pg_temp.has_owner_achievement('00000000-0000-0000-0000-00000000000c') then
    raise exception 'owner achievement: a player who owns no community must not have it';
  end if;
end $$;

-- Creating a community makes C an owner, which unlocks the achievement and its +25 XP.
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000c', false);
insert into communities (slug, name, city, district, country, latitude, longitude) values ('ci-o-mesa', 'CI Mesa', 'Lisboa', 'Centro', 'Portugal', 38.72, -9.14);
reset role;
do $$
begin
  if not pg_temp.has_owner_achievement('00000000-0000-0000-0000-00000000000c') then
    raise exception 'owner achievement: creating a community must unlock it';
  end if;
  if (select experience_points from profiles where id = '00000000-0000-0000-0000-00000000000c') <> (select xp from owner_xp) + 25 then
    raise exception 'owner achievement: unlocking it must add 25 XP';
  end if;
end $$;

-- Receiving ownership by transfer also unlocks it (B loses it first, to prove the transfer gives it back).
delete from user_achievements where user_id = '00000000-0000-0000-0000-00000000000b'
  and achievement_id = (select id from achievements where slug = 'guardiao-da-estante');
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000b', false);
insert into community_memberships (user_id, community_id) select auth.uid(), id from communities where slug = 'ci-o-mesa';
reset role;
do $$
begin
  if pg_temp.has_owner_achievement('00000000-0000-0000-0000-00000000000b') then
    raise exception 'owner achievement: joining as a member must not unlock it';
  end if;
end $$;
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000c', false);
select transfer_community_ownership((select id from communities where slug = 'ci-o-mesa'), '00000000-0000-0000-0000-00000000000b');
reset role;
do $$
begin
  if not pg_temp.has_owner_achievement('00000000-0000-0000-0000-00000000000b') then
    raise exception 'owner achievement: receiving ownership must unlock it';
  end if;
  if not pg_temp.has_owner_achievement('00000000-0000-0000-0000-00000000000c') then
    raise exception 'owner achievement: it stays unlocked after giving ownership away';
  end if;
end $$;

-- The trigger function is internal.
do $$
begin
  if has_function_privilege('authenticated', 'public.tg_membership_progress()', 'execute') then
    raise exception 'owner achievement: tg_membership_progress must not be callable by users';
  end if;
end $$;

reset role;
select set_config('request.jwt.sub', '', false);
delete from communities where slug like 'ci-o-%';
drop table owner_xp;
