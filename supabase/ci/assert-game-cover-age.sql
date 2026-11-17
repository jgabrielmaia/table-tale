-- CI only: checks after 20261117000001_game_cover_age. Raises on the first failed expectation.
-- Fixtures: ...0b and ...0c are plain players; 'ci-bgg' is a game imported from BGG.
reset role;
select set_config('request.jwt.sub', '', false);
grant usage on schema storage to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
grant select on public.games to anon, authenticated;
delete from storage.objects where bucket_id = 'game-covers';
delete from games where slug like 'ci-cover%';

do $$
begin
  if not exists (select 1 from storage.buckets where id = 'game-covers' and public and file_size_limit = 2097152) then
    raise exception 'game covers: the public game-covers bucket (2 MB) must exist';
  end if;
end $$;

-- Players upload only to their own folder; catalogue/ is for the service role.
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000b', false);
insert into storage.objects (bucket_id, name) values ('game-covers', '00000000-0000-0000-0000-00000000000b/game-1.webp');
do $$
begin
  begin
    insert into storage.objects (bucket_id, name) values ('game-covers', '00000000-0000-0000-0000-00000000000c/game-1.webp');
    raise exception 'game covers: uploading to another player''s folder must be refused' using errcode = 'P0002';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('game-covers', 'catalogue/uno.jpg');
    raise exception 'game covers: catalogue/ must be service-role only' using errcode = 'P0002';
  exception when insufficient_privilege then null;
  end;
end $$;

-- create_game takes the age and the player's own cover.
select public.create_game('CI Cover', '', 2, 4, 30, array['Party'], 8,
  'https://x.supabase.co/storage/v1/object/public/game-covers/00000000-0000-0000-0000-00000000000b/game-1.webp');
reset role;
do $$
begin
  if not exists (select 1 from games where slug = 'ci-cover' and min_age = 8 and owner_id = '00000000-0000-0000-0000-00000000000b'
                 and cover_url like '%/game-covers/00000000-0000-0000-0000-00000000000b/game-1.webp') then
    raise exception 'game covers: create_game must save the age and the cover';
  end if;
end $$;

-- Invalid ages and covers that are not the player's own upload are refused.
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$
declare
  q text;
begin
  foreach q in array array[
    $q$select public.create_game('CI Cover Bad', '', null, null, null, '{}', 22)$q$,
    $q$select public.create_game('CI Cover Bad', '', null, null, null, '{}', -1)$q$,
    $q$select public.create_game('CI Cover Bad', '', null, null, null, '{}', null, 'https://m.media-amazon.com/x.jpg')$q$,
    $q$select public.create_game('CI Cover Bad', '', null, null, null, '{}', null, 'https://x.supabase.co/storage/v1/object/public/game-covers/00000000-0000-0000-0000-00000000000c/a.webp')$q$,
    $q$select public.create_game('CI Cover Bad', '', null, null, null, '{}', null, 'https://x.supabase.co/storage/v1/object/public/game-covers/catalogue/uno.jpg')$q$
  ] loop
    begin
      execute q;
      raise exception 'game covers: must be refused: %', q using errcode = 'P0002';
    exception when invalid_parameter_value then null;
    end;
  end loop;
end $$;

-- The owner edits everything; the slug stays.
do $$
begin
  if not public.update_game((select id from games where slug = 'ci-cover'), ' CI Cover Renamed ', 'Notes', 3, 5, 45, array['Family'], 10, null) then
    raise exception 'game covers: the owner must be able to edit';
  end if;
end $$;
reset role;
do $$
begin
  if not exists (select 1 from games where slug = 'ci-cover' and title = 'CI Cover Renamed' and description = 'Notes' and min_players = 3
                 and max_players = 5 and duration_minutes = 45 and categories = '{Family}' and min_age = 10 and cover_url is null) then
    raise exception 'game covers: update_game must save every field and keep the slug';
  end if;
end $$;

-- Keeping a catalogue cover (with its credit) is allowed; replacing it drops the credit.
update games set cover_url = 'https://x.supabase.co/storage/v1/object/public/game-covers/catalogue/ci.jpg', cover_credit = 'Someone · CC0'
where slug = 'ci-cover';
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000b', false);
select public.update_game((select id from games where slug = 'ci-cover'), 'CI Cover Renamed', '', 3, 5, 45, '{}', 10,
  'https://x.supabase.co/storage/v1/object/public/game-covers/catalogue/ci.jpg');
reset role;
do $$
begin
  if (select cover_credit from games where slug = 'ci-cover') is distinct from 'Someone · CC0' then
    raise exception 'game covers: keeping the cover must keep its credit';
  end if;
end $$;
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000b', false);
select public.update_game((select id from games where slug = 'ci-cover'), 'CI Cover Renamed', '', 3, 5, 45, '{}', 10,
  'https://x.supabase.co/storage/v1/object/public/game-covers/00000000-0000-0000-0000-00000000000b/game-1.webp');
reset role;
do $$
begin
  if exists (select 1 from games where slug = 'ci-cover' and (cover_credit is not null or cover_url not like '%/00000000-0000-0000-0000-00000000000b/%')) then
    raise exception 'game covers: a new cover must replace the old one and drop its credit';
  end if;
end $$;

-- Someone else, a BGG import, and anonymous visitors: nothing changes.
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000c', false);
do $$
begin
  if public.update_game((select id from games where slug = 'ci-cover'), 'Hacked') then
    raise exception 'game covers: only the owner may edit';
  end if;
end $$;
reset role;
create temp table ci_bgg_owner as select owner_id from games where slug = 'ci-bgg';
update games set owner_id = '00000000-0000-0000-0000-00000000000c' where slug = 'ci-bgg';
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000c', false);
do $$
begin
  if public.update_game((select id from games where slug = 'ci-bgg'), 'Hacked') then
    raise exception 'game covers: games imported from BGG keep BGG''s data';
  end if;
end $$;
reset role;
update games set owner_id = (select owner_id from ci_bgg_owner) where slug = 'ci-bgg';
drop table ci_bgg_owner;
set role anon;
do $$
begin
  perform public.update_game((select id from games where slug = 'ci-cover'), 'Hacked');
  raise exception 'game covers: anon must not call update_game' using errcode = 'P0002';
exception when insufficient_privilege then null;
end $$;
reset role;
do $$
begin
  if (select title from games where slug = 'ci-cover') <> 'CI Cover Renamed' or (select title from games where slug = 'ci-bgg') = 'Hacked' then
    raise exception 'game covers: refused edits must not change anything';
  end if;
end $$;

delete from games where slug like 'ci-cover%';
delete from storage.objects where bucket_id = 'game-covers';
