-- CI only: checks after supabase/rollbacks/20261112000004_no_default_community_join.down.sql alone.
-- The automatic join is back: a new profile lands in the default community as an active member.
reset role;
select set_config('request.jwt.sub', '', false);
delete from auth.users where id = '00000000-0000-0000-0000-00000000000e';
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000e', 'e@ci.test');
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'profiles_join_default_community') then
    raise exception 'rollback 20261112000004: profiles_join_default_community not restored';
  end if;
  if has_function_privilege('authenticated', 'public.tg_join_default_community()', 'execute') then
    raise exception 'rollback 20261112000004: tg_join_default_community must not be callable by users';
  end if;
  if not exists (select 1 from community_memberships m join communities c on c.id = m.community_id
                 where c.slug = 'table-tale' and m.user_id = '00000000-0000-0000-0000-00000000000e'
                   and m.role = 'member' and m.status = 'active') then
    raise exception 'rollback 20261112000004: a new profile must join the default community again';
  end if;
end $$;
delete from auth.users where id = '00000000-0000-0000-0000-00000000000e';
