-- CI only: checks after the rollback scripts ran. The schema must be back to its pre-community shape
-- and the personal collection preserved.
reset role;
do $$
begin
  if exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'can_edit_community_folder') then
    raise exception 'rollback left can_edit_community_folder behind';
  end if;
  if exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'member_count') then
    raise exception 'rollback left member_count behind';
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'bgg_search_cache') then
    raise exception 'rollback left the BGG search cache behind';
  end if;
  if exists (select 1 from public.achievements where slug = 'guardiao-da-estante') then
    raise exception 'rollback left the owner achievement behind';
  end if;
  if exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'tg_membership_progress') then
    raise exception 'rollback left tg_membership_progress behind';
  end if;
  if pg_get_functiondef('public.recompute_progress(uuid)'::regprocedure) like '%community_memberships%' then
    raise exception 'rollback did not restore recompute_progress';
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name in ('communities', 'community_memberships', 'community_games', 'user_games')) then
    raise exception 'rollback left community tables or user_games behind';
  end if;
  if (select table_type from information_schema.tables where table_schema = 'public' and table_name = 'game_ownerships') is distinct from 'BASE TABLE' then
    raise exception 'game_ownerships must be the original base table again';
  end if;
  if (select count(*) from game_ownerships) <> 4 then raise exception 'personal collection rows lost in rollback'; end if;
  if (select count(*) from games where slug <> 'ci-bgg') <> 3 then raise exception 'catalog changed in rollback'; end if;
  -- the BGG-imported game survives with placeholders for what the old schema required
  if not exists (select 1 from games where slug = 'ci-bgg' and genre = 'Economic' and complexity = 'Leve' and min_players = 1 and max_players = 1 and duration_minutes = 60) then
    raise exception 'rollback must keep BGG-imported games and fill their required columns';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'games' and column_name in ('bgg_id', 'bgg_data', 'categories', 'mechanics')) then
    raise exception 'rollback left BGG columns behind';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'games' and column_name in ('genre', 'complexity', 'min_players', 'max_players', 'duration_minutes') and is_nullable = 'YES') then
    raise exception 'rollback must restore NOT NULL on the legacy game columns';
  end if;
  if pg_get_functiondef('public.compute_user_metrics(uuid)'::regprocedure) like '%categories%' then
    raise exception 'compute_user_metrics was not restored to the original';
  end if;
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
