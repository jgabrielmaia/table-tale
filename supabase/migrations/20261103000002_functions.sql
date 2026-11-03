-- Table Tale — funções, triggers de autenticação e progressão

-- ------------------------------------------------------------------
-- Progressão: XP, nível e conquistas calculados a partir dos dados
-- ------------------------------------------------------------------
create or replace function public.compute_user_metrics(p_user uuid)
returns table (
  sessions int,
  games_played int,
  completed int,
  favorites int,
  events int,
  genres int,
  minutes int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::int from game_sessions s where s.user_id = p_user),
    (select count(*)::int from (
        select game_id from game_sessions where user_id = p_user
        union
        select game_id from user_game_status where user_id = p_user and status in ('in_progress', 'completed')
      ) played),
    (select count(*)::int from user_game_status u where u.user_id = p_user and u.status = 'completed'),
    (select count(*)::int from user_game_status u where u.user_id = p_user and u.is_favorite),
    (select count(*)::int from event_participants e where e.user_id = p_user),
    (select count(distinct g.genre)::int from game_sessions s join games g on g.id = s.game_id where s.user_id = p_user),
    (select coalesce(sum(coalesce(s.duration_minutes, g.duration_minutes)), 0)::int
       from game_sessions s join games g on g.id = s.game_id where s.user_id = p_user);
$$;

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

create or replace function public.tg_recompute_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform recompute_progress(coalesce(new.user_id, old.user_id));
  return null;
end;
$$;

create trigger game_sessions_progress after insert or update or delete on public.game_sessions
  for each row execute function public.tg_recompute_progress();
create trigger user_game_status_progress after insert or update or delete on public.user_game_status
  for each row execute function public.tg_recompute_progress();
create trigger event_participants_progress after insert or update or delete on public.event_participants
  for each row execute function public.tg_recompute_progress();

-- Estatísticas do utilizador autenticado (respeita auth.uid()).
create or replace function public.my_profile_stats()
returns table (
  sessions int,
  games_played int,
  completed int,
  favorites int,
  events int,
  genres int,
  minutes int,
  achievements int
)
language sql
stable
security definer
set search_path = public
as $$
  select m.sessions, m.games_played, m.completed, m.favorites, m.events, m.genres, m.minutes,
         (select count(*)::int from user_achievements ua where ua.user_id = auth.uid())
  from compute_user_metrics(auth.uid()) m
  where auth.uid() is not null;
$$;

-- ------------------------------------------------------------------
-- Dono da coleção: identificado por app_config.owner_email (OWNER_EMAIL)
-- ------------------------------------------------------------------
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

-- Cria o perfil automaticamente no primeiro login (Google ou magic link).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    left(coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(new.email, 'jogador'), '@', 1)
    ), 60),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  perform claim_owner(new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantém o e-mail do perfil sincronizado se mudar na autenticação.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles set email = new.email where id = new.id;
  perform claim_owner(new.id);
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();
