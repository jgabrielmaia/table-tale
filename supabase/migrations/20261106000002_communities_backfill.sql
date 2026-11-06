-- Table Tale — migração de dados para comunidades (idempotente, validada, sem apagar nada).
-- Não existiam ligações utilizador-comunidade: cria a comunidade por omissão, inscreve todos os perfis
-- e copia a coleção do dono para a biblioteca da comunidade. Aborta (rollback) se a validação falhar.

do $$
declare
  v_owner uuid;
  v_community uuid;
  v_profiles int;
  v_members int;
  v_expected_games int;
  v_games int;
begin
  select count(*) into v_profiles from public.profiles;
  if v_profiles = 0 then
    raise notice 'communities backfill: no profiles yet; the default community is created on the owner first login';
    return;
  end if;

  -- Dono: o perfil com o e-mail de app_config.owner_email; sem isso, o perfil mais antigo.
  select p.id into v_owner
  from public.profiles p
  join public.app_config c on c.key = 'owner_email' and lower(c.value) = lower(p.email)
  limit 1;
  if v_owner is null then
    select id into v_owner from public.profiles order by created_at, id limit 1;
    raise notice 'communities backfill: owner_email not matched; using oldest profile % as owner', v_owner;
  end if;

  v_community := public.ensure_default_community(v_owner);

  insert into public.community_memberships (user_id, community_id, role, status)
  select p.id, v_community, case when p.id = v_owner then 'owner' else 'member' end::public.community_role, 'active'
  from public.profiles p
  on conflict (user_id, community_id) do nothing;

  -- Validação
  select count(*) into v_members from public.community_memberships where community_id = v_community;
  if v_members < v_profiles then
    raise exception 'communities backfill: % profiles but % memberships', v_profiles, v_members;
  end if;
  if not exists (select 1 from public.community_memberships where community_id = v_community and role = 'owner' and status = 'active') then
    raise exception 'communities backfill: default community has no active owner';
  end if;
  select count(distinct game_id) into v_expected_games from public.user_games where user_id = v_owner;
  select count(*) into v_games from public.community_games where community_id = v_community;
  if v_games < v_expected_games then
    raise exception 'communities backfill: owner has % distinct games but library has %', v_expected_games, v_games;
  end if;
  raise notice 'communities backfill ok: % memberships, % library games', v_members, v_games;
end;
$$;
