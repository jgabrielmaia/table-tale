-- Member count for signed-out visitors. The app used to embed `community_memberships(count)` in the communities query,
-- but anon has no grant on community_memberships (on purpose), so PostgREST answered 401 and the communities pages
-- broke for anyone not signed in. This computed field exposes only the number, never the rows:
--   select=*,member_count
-- It is security definer so it can count past the memberships RLS, and it answers null for a community the caller
-- cannot see (private and not theirs), so calling it as an RPC with a made-up row leaks nothing.
-- Rollback: supabase/rollbacks/20261112000003_community_member_count.down.sql

create or replace function public.member_count(c public.communities)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_community_public(c.id)
      or public.is_community_participant(c.id)
      or exists (select 1 from communities x where x.id = c.id and x.created_by = auth.uid())
    then (select count(*)::int from community_memberships m where m.community_id = c.id and m.status = 'active')
  end;
$$;

revoke execute on function public.member_count(public.communities) from public;
grant execute on function public.member_count(public.communities) to anon, authenticated;
