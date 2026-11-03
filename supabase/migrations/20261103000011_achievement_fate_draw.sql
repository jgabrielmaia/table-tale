-- Achievement unlocked when the Fate Draw reveals the player's card (and so their faction).
insert into public.achievements (slug, name, description, icon, requirement_type, requirement_value)
values ('destino-revelado', 'Destino Revelado', 'Revela a tua carta no Sorteio do Destino e descobre a tua facção.', 'constellation', 'fate_draw', 1)
on conflict (slug) do nothing;

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

create or replace function public.sync_profile_faction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from seasons s where s.id = new.season_id and s.is_active) then
    update profiles
       set faction_id = (select f.id from factions f where f.slug = new.faction)
     where id = new.player_id;
  end if;
  perform recompute_progress(new.player_id);
  return new;
end;
$$;

select recompute_progress(player_id) from (select distinct player_id from player_card_identities) p;
