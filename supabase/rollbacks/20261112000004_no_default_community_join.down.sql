-- Rollback of 20261112000004_no_default_community_join.sql
-- Restores the automatic join exactly as 20261106000001_communities created it. Players who signed up in between
-- are not back-filled: they keep whatever communities they chose.

create or replace function public.tg_join_default_community()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into community_memberships (user_id, community_id, role, status)
  select new.id, c.id, 'member', 'active' from communities c where c.slug = 'table-tale'
  on conflict (user_id, community_id) do nothing;
  return new;
end;
$$;
revoke execute on function public.tg_join_default_community() from public, anon, authenticated;
create trigger profiles_join_default_community after insert on public.profiles
  for each row execute function public.tg_join_default_community();
