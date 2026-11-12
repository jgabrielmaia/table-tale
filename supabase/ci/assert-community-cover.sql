-- CI only: checks after 20261112000006_community_cover. Raises on the first failed expectation.
-- Fixtures: owner ...0a owns the default community "table-tale"; ...0b and ...0c are plain members.
reset role;
select set_config('request.jwt.sub', '', false);
-- The CI stand-in storage schema has no grants (Supabase's real one does).
grant usage on schema storage to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
delete from storage.objects where bucket_id = 'community-covers';
update communities set cover_url = null where slug = 'table-tale';
-- Role changes go through tg_guard_membership, so the owner makes them.
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000a', false);
update community_memberships m set role = 'member'
from communities c where c.id = m.community_id and c.slug = 'table-tale'
  and m.user_id = '00000000-0000-0000-0000-00000000000b' and m.role <> 'member';
reset role;

do $$
begin
  if not exists (select 1 from storage.buckets where id = 'community-covers' and public and file_size_limit = 2097152) then
    raise exception 'cover: the public community-covers bucket (2 MB) must exist';
  end if;
end $$;

-- The owner uploads a cover and points the community at it.
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000a', false);
insert into storage.objects (bucket_id, name)
select 'community-covers', id::text || '/cover-1.jpg' from communities where slug = 'table-tale';
update communities set cover_url = 'https://example.supabase.co/storage/v1/object/public/community-covers/x/cover-1.jpg' where slug = 'table-tale';
reset role;
do $$
begin
  if (select cover_url from communities where slug = 'table-tale') is null then
    raise exception 'cover: the owner must be able to set cover_url';
  end if;
end $$;

-- A plain member can neither upload nor change the cover.
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$
begin
  begin
    insert into storage.objects (bucket_id, name)
    select 'community-covers', id::text || '/cover-2.jpg' from communities where slug = 'table-tale';
    raise exception 'cover: a member must not upload' using errcode = 'P0002';
  exception when insufficient_privilege then null;
  end;
  update communities set cover_url = null where slug = 'table-tale';
  if not found then null; else raise exception 'cover: a member must not change cover_url'; end if;
  begin
    insert into storage.objects (bucket_id, name) values ('community-covers', 'not-a-uuid/cover.jpg');
    raise exception 'cover: a non-community folder must be refused' using errcode = 'P0002';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Promoted to admin, the same player may upload and delete covers.
-- Role changes go through tg_guard_membership, so the owner makes them.
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000a', false);
update community_memberships m set role = 'admin'
from communities c where c.id = m.community_id and c.slug = 'table-tale'
  and m.user_id = '00000000-0000-0000-0000-00000000000b' and m.role <> 'admin';
reset role;
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000b', false);
insert into storage.objects (bucket_id, name)
select 'community-covers', id::text || '/cover-3.jpg' from communities where slug = 'table-tale';
delete from storage.objects where bucket_id = 'community-covers' and name like '%/cover-1.jpg';
reset role;
do $$
begin
  if exists (select 1 from storage.objects where bucket_id = 'community-covers' and name like '%/cover-1.jpg') then
    raise exception 'cover: an admin must be able to delete a cover';
  end if;
end $$;

-- Leave the fixtures as they were.
-- Role changes go through tg_guard_membership, so the owner makes them.
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000a', false);
update community_memberships m set role = 'member'
from communities c where c.id = m.community_id and c.slug = 'table-tale'
  and m.user_id = '00000000-0000-0000-0000-00000000000b' and m.role <> 'member';
reset role;
delete from storage.objects where bucket_id = 'community-covers';
update communities set cover_url = null where slug = 'table-tale';
select set_config('request.jwt.sub', '', false);
