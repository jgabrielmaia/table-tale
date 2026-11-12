-- Community cover photo. Owners and admins of a community (the same people who may edit it) upload one picture,
-- shown at the top of the community page and on the community cards. Files live in the public `community-covers`
-- bucket under `<community id>/...`; `communities.cover_url` points at the current one (null = the branded fallback).
-- Rollback: supabase/rollbacks/20261112000006_community_cover.down.sql

alter table public.communities
  add column cover_url text check (cover_url is null or char_length(cover_url) <= 1000);

-- Column-level grant, like the other editable columns: the "owner and admin update communities" policy decides who.
grant update (cover_url) on public.communities to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-covers', 'community-covers', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- True when the first folder of a storage path is a community the caller owns or administers.
-- A folder that is not a uuid is simply refused (no cast error).
create or replace function public.can_edit_community_folder(p_name text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select case
    when (storage.foldername(p_name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.has_community_role((storage.foldername(p_name))[1]::uuid, array['owner', 'admin']::public.community_role[])
    else false
  end;
$$;
revoke execute on function public.can_edit_community_folder(text) from public;
grant execute on function public.can_edit_community_folder(text) to authenticated;

-- Deleting or replacing a file also needs it to be visible (Postgres RLS), so owners and admins can list the folder.
-- Everyone else reads covers through the public bucket URL, which does not go through these policies.
create policy "community covers listed by owner or admin" on storage.objects for select to authenticated
  using (bucket_id = 'community-covers' and public.can_edit_community_folder(name));
create policy "community covers upload by owner or admin" on storage.objects for insert to authenticated
  with check (bucket_id = 'community-covers' and public.can_edit_community_folder(name));
create policy "community covers update by owner or admin" on storage.objects for update to authenticated
  using (bucket_id = 'community-covers' and public.can_edit_community_folder(name));
create policy "community covers delete by owner or admin" on storage.objects for delete to authenticated
  using (bucket_id = 'community-covers' and public.can_edit_community_folder(name));
