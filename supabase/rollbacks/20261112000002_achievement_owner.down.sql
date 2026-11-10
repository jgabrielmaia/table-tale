-- Rollback of 20261112000002_achievement_owner.sql
-- Removes the "Guardião da Estante" achievement (and who unlocked it), the membership trigger, and restores
-- recompute_progress as in 20261103000011. XP is recomputed for the affected players (each achievement was +25 XP).

drop trigger community_memberships_progress on public.community_memberships;
drop function public.tg_membership_progress();

create temporary table owner_achievement_users on commit drop as
  select ua.user_id from public.user_achievements ua
  join public.achievements a on a.id = ua.achievement_id
  where a.slug = 'guardiao-da-estante';
delete from public.achievements where slug = 'guardiao-da-estante';

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

select public.recompute_progress(user_id) from owner_achievement_users;
