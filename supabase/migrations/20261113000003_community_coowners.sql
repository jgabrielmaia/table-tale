-- Communities can have several active owners. These RPCs deliberately bypass the
-- normal role hierarchy, while the membership guard still preserves the last owner.

create or replace function public.add_community_owner(p_community uuid, p_member uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null
     or not exists (select 1 from public.community_memberships where community_id = p_community and user_id = auth.uid() and role = 'owner' and status = 'active')
     or not exists (select 1 from public.community_memberships where community_id = p_community and user_id = p_member and status = 'active') then
    raise exception 'only an active owner may add an active co-owner' using errcode = '42501';
  end if;
  perform set_config('app.skip_membership_guard', '1', true);
  update public.community_memberships set role = 'owner' where community_id = p_community and user_id = p_member;
  perform set_config('app.skip_membership_guard', '', true);
end;
$$;

create or replace function public.remove_community_owner(p_community uuid, p_member uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null
     or p_member = auth.uid()
     or not exists (select 1 from public.community_memberships where community_id = p_community and user_id = auth.uid() and role = 'owner' and status = 'active')
     or not exists (select 1 from public.community_memberships where community_id = p_community and user_id = p_member and role = 'owner' and status = 'active') then
    raise exception 'only an active owner may remove another active co-owner' using errcode = '42501';
  end if;
  perform set_config('app.skip_membership_guard', '1', true);
  update public.community_memberships set role = 'admin' where community_id = p_community and user_id = p_member;
  perform set_config('app.skip_membership_guard', '', true);
end;
$$;

revoke all on function public.add_community_owner(uuid, uuid), public.remove_community_owner(uuid, uuid) from public, anon;
grant execute on function public.add_community_owner(uuid, uuid), public.remove_community_owner(uuid, uuid) to authenticated;
