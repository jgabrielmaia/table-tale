-- Game covers, cover credits and recommended age for games added by hand (builds on 20261115000002_create_game).
-- * `game-covers` bucket (public): players upload the cover of a game they add under their own folder `<user id>/...`;
--   `catalogue/...` (service role only) holds the openly licensed photos copied by scripts/open-covers.ts.
-- * games.cover_credit / cover_credit_url credit a cover's author and licence (CC BY and CC BY-SA require it).
-- * create_game() also takes the recommended age and the cover; update_game() lets the owner of a game added by hand
--   edit it afterwards (games imported from BGG keep BGG's data: their owner still only edits categories).
-- Rollback: supabase/rollbacks/20261117000001_game_cover_age.down.sql

alter table public.games
  add column cover_credit text check (cover_credit is null or char_length(cover_credit) between 1 and 300),
  add column cover_credit_url text check (cover_credit_url is null or (char_length(cover_credit_url) <= 1000 and cover_credit_url ~ '^https://'));
comment on column public.games.cover_credit is 'Author and licence of the cover photo, shown on the game page, e.g. "yoppy · CC BY 2.0 · Wikimedia Commons".';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('game-covers', 'game-covers', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Players manage the files in their own folder; everyone reads covers through the public bucket URL.
create policy "game covers listed by uploader" on storage.objects for select to authenticated
  using (bucket_id = 'game-covers' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "game covers upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'game-covers' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "game covers update own folder" on storage.objects for update to authenticated
  using (bucket_id = 'game-covers' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "game covers delete own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'game-covers' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- The checks create_game and update_game share. Raises 22023 (invalid_parameter_value) on the first problem.
create or replace function public.check_game_input(
  p_uid uuid, p_title text, p_description text, p_min_players int, p_max_players int, p_duration_minutes int,
  p_categories text[], p_min_age int, p_cover_url text
)
returns void
language plpgsql stable set search_path = public
as $$
begin
  if char_length(p_title) not between 1 and 80 then
    raise exception 'the title must have 1 to 80 characters' using errcode = '22023';
  end if;
  if char_length(p_description) > 2000 then
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
  if not public.valid_categories(p_categories) then
    raise exception 'invalid categories' using errcode = '22023';
  end if;
  if p_min_age is not null and p_min_age not between 0 and 21 then
    raise exception 'invalid age' using errcode = '22023';
  end if;
  -- Only a file the player uploaded to their own folder and that is really in the bucket: no hotlinks, no other
  -- people's files, no path tricks. The URL is the one Storage hands out: <host>/storage/v1/object/public/game-covers/<uid>/<file>.
  if p_cover_url is not null and (char_length(p_cover_url) > 1000
     or p_cover_url !~ ('^https?://[^/?#]+/storage/v1/object/public/game-covers/' || p_uid::text || '/[A-Za-z0-9_-][A-Za-z0-9_.-]*$')
     or not exists (select 1 from storage.objects o where o.bucket_id = 'game-covers'
                    and o.name = p_uid::text || '/' || substring(p_cover_url from '[^/]+$'))) then
    raise exception 'invalid cover' using errcode = '22023';
  end if;
end;
$$;
revoke execute on function public.check_game_input(uuid, text, text, int, int, int, text[], int, text) from public, anon, authenticated;

drop function public.create_game(text, text, int, int, int, text[]);

create function public.create_game(
  p_title text,
  p_description text default '',
  p_min_players int default null,
  p_max_players int default null,
  p_duration_minutes int default null,
  p_categories text[] default '{}',
  p_min_age int default null,
  p_cover_url text default null
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
  perform public.check_game_input(v_uid, v_title, v_description, p_min_players, p_max_players, p_duration_minutes, v_categories, p_min_age, p_cover_url);
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

  insert into public.games (title, slug, description, min_players, max_players, duration_minutes, categories, min_age, cover_url, owner_id)
  values (v_title, v_slug, v_description, p_min_players, p_max_players, p_duration_minutes, v_categories, p_min_age, p_cover_url, v_uid)
  returning id into v_id;

  return query select v_id, v_slug;
end;
$$;
revoke execute on function public.create_game(text, text, int, int, int, text[], int, text) from public, anon;
grant execute on function public.create_game(text, text, int, int, int, text[], int, text) to authenticated;

-- The owner edits a game they added by hand. The slug stays, so links keep working. Returns false when the game does not
-- exist, is not theirs, or came from BGG (its data is BGG's and stays as imported).
create function public.update_game(
  p_game uuid,
  p_title text,
  p_description text default '',
  p_min_players int default null,
  p_max_players int default null,
  p_duration_minutes int default null,
  p_categories text[] default '{}',
  p_min_age int default null,
  p_cover_url text default null
)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_title text := btrim(coalesce(p_title, ''));
  v_description text := btrim(coalesce(p_description, ''));
  v_categories text[] := coalesce(
    (select array_agg(btrim(c)) from unnest(coalesce(p_categories, '{}')) c), '{}');
  v_old_cover text;
begin
  if v_uid is null then
    raise exception 'sign in to edit a game' using errcode = '42501';
  end if;
  select g.cover_url into v_old_cover from public.games g where g.id = p_game and g.owner_id = v_uid and g.bgg_id is null;
  if not found then return false; end if;
  -- Keeping the cover the game already has is always allowed (e.g. a catalogue cover).
  perform public.check_game_input(v_uid, v_title, v_description, p_min_players, p_max_players, p_duration_minutes, v_categories, p_min_age,
    case when p_cover_url is not distinct from v_old_cover then null else p_cover_url end);

  update public.games
  set title = v_title, description = v_description, min_players = p_min_players, max_players = p_max_players,
      duration_minutes = p_duration_minutes, categories = v_categories, min_age = p_min_age, cover_url = p_cover_url,
      cover_credit = case when p_cover_url is not distinct from v_old_cover then cover_credit end,
      cover_credit_url = case when p_cover_url is not distinct from v_old_cover then cover_credit_url end
  where id = p_game;
  return true;
end;
$$;
revoke execute on function public.update_game(uuid, text, text, int, int, int, text[], int, text) from public, anon;
grant execute on function public.update_game(uuid, text, text, int, int, int, text[], int, text) to authenticated;
