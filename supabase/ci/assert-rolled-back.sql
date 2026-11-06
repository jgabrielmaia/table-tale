-- CI only: checks after the rollback scripts ran. The schema must be back to its pre-community shape
-- and the personal collection preserved.
reset role;
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name in ('communities', 'community_memberships', 'community_games', 'user_games')) then
    raise exception 'rollback left community tables or user_games behind';
  end if;
  if (select table_type from information_schema.tables where table_schema = 'public' and table_name = 'game_ownerships') is distinct from 'BASE TABLE' then
    raise exception 'game_ownerships must be the original base table again';
  end if;
  if (select count(*) from game_ownerships) <> 4 then raise exception 'personal collection rows lost in rollback'; end if;
  if (select count(*) from games) <> 3 then raise exception 'catalog changed in rollback'; end if;
  if exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname in ('community_visibility', 'community_role', 'membership_status')) then
    raise exception 'rollback left community enum types behind';
  end if;
  if exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname in (
      'community_rank', 'my_community_role', 'has_community_role', 'is_community_member', 'is_community_participant',
      'is_community_public', 'tg_community_creator_is_owner', 'tg_guard_membership', 'transfer_community_ownership',
      'ensure_default_community', 'tg_join_default_community')) then
    raise exception 'rollback left community functions behind';
  end if;
  if exists (select 1 from pg_trigger where tgname = 'profiles_join_default_community') then
    raise exception 'rollback left the default-community trigger behind';
  end if;
  if pg_get_functiondef('public.claim_owner(uuid)'::regprocedure) not like '%game_ownerships%'
     or pg_get_functiondef('public.claim_owner(uuid)'::regprocedure) like '%ensure_default_community%' then
    raise exception 'claim_owner was not restored to the original';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'game_ownerships' and policyname = 'ownerships are public') then
    raise exception 'original game_ownerships policies not restored';
  end if;
  if not exists (select 1 from pg_indexes where indexname = 'game_ownerships_user_idx') then
    raise exception 'original game_ownerships index not restored';
  end if;
end $$;
