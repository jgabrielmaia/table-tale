-- Add a game by hand, without BGG. Any signed-in player can create a catalogue game; they become its owner (see
-- 20261115000001_game_owner) and can then edit its categories. The table itself stays read-only for players, so creation
-- goes through this function, which validates the input and picks a free slug.
-- Rollback: supabase/rollbacks/20261115000002_create_game.down.sql

create or replace function public.create_game(
  p_title text,
  p_description text default '',
  p_min_players int default null,
  p_max_players int default null,
  p_duration_minutes int default null,
  p_categories text[] default '{}'
)
returns table (game_id uuid, slug text)
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_title text := btrim(coalesce(p_title, ''));
  v_description text := btrim(coalesce(p_description, ''));
  v_categories text[] := coalesce(
    (select array_agg(btrim(c)) from unnest(coalesce(p_categories, '{}')) c), '{}');
  v_base text;
  v_slug text;
  v_n int := 1;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'sign in to add a game' using errcode = '42501';
  end if;
  if char_length(v_title) not between 1 and 80 then
    raise exception 'the title must have 1 to 80 characters' using errcode = '22023';
  end if;
  if char_length(v_description) > 2000 then
    raise exception 'the description is too long' using errcode = '22023';
  end if;
  if p_min_players is not null and p_min_players not between 1 and 99
     or p_max_players is not null and p_max_players not between 1 and 99
     or p_min_players > p_max_players then
    raise exception 'invalid number of players' using errcode = '22023';
  end if;
  if p_duration_minutes is not null and p_duration_minutes not between 1 and 1440 then
    raise exception 'invalid duration' using errcode = '22023';
  end if;
  if not public.valid_categories(v_categories) then
    raise exception 'invalid categories' using errcode = '22023';
  end if;
  -- Keeps the catalogue from being flooded by one account.
  if (select count(*) from public.games g where g.owner_id = v_uid and g.created_at > now() - interval '1 day') >= 20 then
    raise exception 'too many games added today' using errcode = '54000';
  end if;

  -- The title without accents, lower-case, words joined by dashes; a numeric suffix when the slug is taken.
  v_base := regexp_replace(lower(regexp_replace(normalize(v_title, nfd), '[̀-ͯ]', '', 'g')), '[^a-z0-9]+', '-', 'g');
  v_base := trim(both '-' from left(trim(both '-' from v_base), 60));
  if v_base = '' then v_base := 'game'; end if;
  v_slug := v_base;
  while exists (select 1 from public.games g where g.slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  insert into public.games (title, slug, description, min_players, max_players, duration_minutes, categories, owner_id)
  values (v_title, v_slug, v_description, p_min_players, p_max_players, p_duration_minutes, v_categories, v_uid)
  returning id into v_id;

  return query select v_id, v_slug;
end;
$$;

revoke execute on function public.create_game(text, text, int, int, int, text[]) from public, anon;
grant execute on function public.create_game(text, text, int, int, int, text[]) to authenticated;
