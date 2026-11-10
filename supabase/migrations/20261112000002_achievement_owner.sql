-- Achievement "Guardião da Estante": unlocked while the player is an active owner of any community (created or received
-- by a transfer). Like every achievement it stays unlocked afterwards and adds +25 XP.
-- Rollback: supabase/rollbacks/20261112000002_achievement_owner.down.sql

insert into public.achievements (slug, name, description, icon, requirement_type, requirement_value)
values ('guardiao-da-estante', 'Guardião da Estante', 'Sê dono de uma comunidade.', 'crown', 'community_owner', 1)
on conflict (slug) do nothing;

-- Same as 20261103000011_achievement_fate_draw, plus the community_owner branch.
create or replace function public.recompute_progress(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  v_unlocked int;
  v_xp int;
begin
  if p_user is null or not exists (select 1 from profiles where id = p_user) then
    return;
  end if;

  select * into m from compute_user_metrics(p_user);

  insert into user_achievements (user_id, achievement_id)
  select p_user, a.id
  from achievements a
  where (case a.requirement_type
           when 'sessions' then m.sessions
           when 'games_played' then m.games_played
           when 'completed' then m.completed
           when 'favorites' then m.favorites
           when 'events' then m.events
           when 'genres' then m.genres
           when 'fate_draw' then (select count(*)::int from player_card_identities i where i.player_id = p_user)
           when 'community_owner' then (
             select count(*)::int from community_memberships cm
             where cm.user_id = p_user and cm.role = 'owner' and cm.status = 'active'
           )
         end) >= a.requirement_value
  on conflict (user_id, achievement_id) do nothing;

  select count(*) into v_unlocked from user_achievements where user_id = p_user;

  select p.base_experience_points
         + m.sessions * 40 + m.completed * 60 + m.events * 50 + v_unlocked * 25
    into v_xp
  from profiles p where p.id = p_user;

  update profiles
     set experience_points = v_xp,
         level = v_xp / 300 + 1
   where id = p_user
     and (experience_points is distinct from v_xp or level is distinct from v_xp / 300 + 1);
end;
$$;

-- Becoming an owner (creating a community, a transfer, an approved role change) re-checks the player's achievements.
create or replace function public.tg_membership_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'owner' and new.status = 'active' then
    perform recompute_progress(new.user_id);
  end if;
  return new;
end;
$$;
revoke execute on function public.tg_membership_progress() from public, anon, authenticated;
create trigger community_memberships_progress after insert or update of role, status on public.community_memberships
  for each row execute function public.tg_membership_progress();

-- Existing owners get it now.
select recompute_progress(user_id)
from (select distinct user_id from public.community_memberships where role = 'owner' and status = 'active') o;
