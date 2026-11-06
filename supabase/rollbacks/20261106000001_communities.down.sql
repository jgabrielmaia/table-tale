-- Rollback of 20261106000001_communities.sql
-- Run AFTER 20261106000002_communities_backfill.down.sql, in a single transaction.
-- Warning: drops ALL community data (communities, memberships, community libraries).
-- Personal collections are preserved: user_games goes back to its original name, game_ownerships.

-- 1. claim_owner back to the original body (no default community, writes to game_ownerships)
create or replace function public.claim_owner(p_user uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_email text;
  v_faction uuid;
  v_base_xp int;
begin
  select value into v_owner_email from app_config where key = 'owner_email';
  if v_owner_email is null
     or not exists (select 1 from profiles where id = p_user and lower(email) = lower(v_owner_email)) then
    return false;
  end if;

  insert into game_ownerships (game_id, user_id, copy_number, condition, acquired_at)
  select g.id, p_user, c.n, i.condition, i.acquired_at
  from owner_inventory i
  join games g on g.slug = i.game_slug
  cross join lateral generate_series(1, i.copies) as c(n)
  on conflict (game_id, user_id, copy_number) do nothing;

  select f.id into v_faction
  from factions f join app_config c on c.key = 'owner_faction_slug' and c.value = f.slug;

  select nullif(value, '')::int into v_base_xp from app_config where key = 'owner_base_xp';

  update profiles
     set faction_id = coalesce(faction_id, v_faction),
         base_experience_points = greatest(base_experience_points, coalesce(v_base_xp, 0))
   where id = p_user;

  perform recompute_progress(p_user);
  return true;
end;
$$;

-- 2. Community objects (tables first: their policies and triggers go with them)
drop trigger if exists profiles_join_default_community on public.profiles;
drop function if exists public.tg_join_default_community();

drop table if exists public.community_games;
drop table if exists public.community_memberships;
drop table if exists public.communities;

drop function if exists public.transfer_community_ownership(uuid, uuid);
drop function if exists public.ensure_default_community(uuid);
drop function if exists public.tg_guard_membership();
drop function if exists public.tg_community_creator_is_owner();
drop function if exists public.is_community_public(uuid);
drop function if exists public.is_community_participant(uuid);
drop function if exists public.is_community_member(uuid);
drop function if exists public.has_community_role(uuid, public.community_role[]);
drop function if exists public.my_community_role(uuid);
drop function if exists public.community_rank(public.community_role);

drop type if exists public.membership_status;
drop type if exists public.community_role;
drop type if exists public.community_visibility;

-- 3. Personal collection back to its original name (compat view goes first: it uses that name)
drop view if exists public.game_ownerships;
alter table public.user_games rename to game_ownerships;
alter index public.user_games_user_idx rename to game_ownerships_user_idx;
alter policy "user games are public" on public.game_ownerships rename to "ownerships are public";
alter policy "users add own user games" on public.game_ownerships rename to "users add own ownerships";
alter policy "users update own user games" on public.game_ownerships rename to "users update own ownerships";
alter policy "users delete own user games" on public.game_ownerships rename to "users delete own ownerships";
