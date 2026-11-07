-- Table Tale — comunidades (Users, Communities, Memberships, Game Libraries independentes)
-- Migração aditiva: nada é apagado. `game_ownerships` passa a chamar-se `user_games`
-- (coleção pessoal); o catálogo global `games` não muda.

create type public.community_visibility as enum ('public', 'private');
create type public.community_role as enum ('owner', 'admin', 'moderator', 'member');
create type public.membership_status as enum ('pending', 'active', 'suspended');

-- ------------------------------------------------------------------
-- Coleção pessoal: renomear em vez de copiar (preserva dados, índices e políticas)
-- ------------------------------------------------------------------
alter table public.game_ownerships rename to user_games;
alter index public.game_ownerships_user_idx rename to user_games_user_idx;
alter policy "ownerships are public" on public.user_games rename to "user games are public";
alter policy "users add own ownerships" on public.user_games rename to "users add own user games";
alter policy "users update own ownerships" on public.user_games rename to "users update own user games";
alter policy "users delete own ownerships" on public.user_games rename to "users delete own user games";

-- Compatibilidade: a versão da app já em produção ainda lê `game_ownerships(...)`. Esta vista só de leitura
-- (respeita a RLS de quem consulta) evita partir a biblioteca entre aplicar a migração e publicar a nova app.
-- Remover numa migração futura, depois de a nova app estar em produção.
create view public.game_ownerships with (security_invoker = true) as select * from public.user_games;
revoke all on public.game_ownerships from anon, authenticated;
grant select on public.game_ownerships to anon, authenticated;

-- ------------------------------------------------------------------
-- Tabelas
-- ------------------------------------------------------------------
create table public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  description text not null default '' check (char_length(description) <= 500),
  visibility public.community_visibility not null default 'public',
  city text not null check (char_length(btrim(city)) > 0),
  district text not null check (char_length(btrim(district)) > 0),
  country text not null check (char_length(btrim(country)) > 0),
  latitude numeric(9, 6) check (latitude between -90 and 90),
  longitude numeric(9, 6) check (longitude between -180 and 180),
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communities_coordinates_pair check ((latitude is null) = (longitude is null))
);
create index communities_city_idx on public.communities (lower(city), lower(district));
create trigger communities_updated_at before update on public.communities
  for each row execute function public.set_updated_at();

create table public.community_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  community_id uuid not null references public.communities (id) on delete cascade,
  role public.community_role not null default 'member',
  status public.membership_status not null default 'active',
  joined_at timestamptz not null default now(),
  unique (user_id, community_id)
);
create index community_memberships_community_idx on public.community_memberships (community_id, status);

create table public.community_games (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  game_id uuid not null references public.games (id) on delete cascade,
  added_by uuid default auth.uid() references public.profiles (id) on delete set null,
  copies int not null default 1 check (copies >= 1),
  condition public.ownership_condition not null default 'good',
  notes text check (char_length(notes) <= 500),
  added_at timestamptz not null default now(),
  unique (community_id, game_id)
);
create index community_games_game_idx on public.community_games (game_id);

-- ------------------------------------------------------------------
-- Funções auxiliares (security definer: evitam recursão nas políticas RLS)
-- ------------------------------------------------------------------
create or replace function public.community_rank(p_role public.community_role)
returns int language sql immutable
as $$ select case p_role when 'owner' then 4 when 'admin' then 3 when 'moderator' then 2 else 1 end; $$;

-- Papel ativo do utilizador autenticado na comunidade (null se não for membro ativo).
create or replace function public.my_community_role(p_community uuid)
returns public.community_role
language sql stable security definer set search_path = public
as $$
  select role from community_memberships
  where community_id = p_community and user_id = auth.uid() and status = 'active';
$$;

create or replace function public.has_community_role(p_community uuid, p_roles public.community_role[])
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(public.my_community_role(p_community) = any (p_roles), false); $$;

create or replace function public.is_community_member(p_community uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select public.my_community_role(p_community) is not null; $$;

-- Qualquer ligação (pendente, ativa ou suspensa) à comunidade.
create or replace function public.is_community_participant(p_community uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from community_memberships where community_id = p_community and user_id = auth.uid());
$$;

create or replace function public.is_community_public(p_community uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from communities where id = p_community and visibility = 'public'); $$;

-- ------------------------------------------------------------------
-- Triggers: criador torna-se dono; hierarquia de papéis e último dono
-- ------------------------------------------------------------------
create or replace function public.tg_community_creator_is_owner()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into community_memberships (user_id, community_id, role, status)
  values (new.created_by, new.id, 'owner', 'active')
  on conflict (user_id, community_id) do update set role = 'owner', status = 'active';
  return new;
end;
$$;
create trigger communities_creator_owner after insert on public.communities
  for each row execute function public.tg_community_creator_is_owner();

create or replace function public.tg_guard_membership()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.community_role;
  v_other_owners int;
begin
  -- Service role, triggers de autenticação e a RPC de transferência (flag local) não passam pela hierarquia.
  if v_actor is null or current_setting('app.skip_membership_guard', true) = '1' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  -- Apagar a comunidade apaga as ligações em cascata: já não há nada a proteger.
  if tg_op = 'DELETE' and not exists (select 1 from communities c where c.id = old.community_id) then
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if new.user_id <> old.user_id or new.community_id <> old.community_id then
      raise exception 'membership identity is immutable' using errcode = '42501';
    end if;
    if new.role = old.role and new.status = old.status then
      return new;
    end if;
  end if;

  -- O último dono ativo não pode sair, ser despromovido nem suspenso (a menos que a comunidade seja apagada).
  if old.role = 'owner' and old.status = 'active'
     and (tg_op = 'DELETE' or new.role <> 'owner' or new.status <> 'active')
     and exists (select 1 from communities c where c.id = old.community_id) then
    select count(*) into v_other_owners from community_memberships m
    where m.community_id = old.community_id and m.role = 'owner' and m.status = 'active' and m.id <> old.id;
    if v_other_owners = 0 then
      raise exception 'last_owner: transfer ownership before leaving' using errcode = '23514';
    end if;
  end if;

  -- Sair da comunidade (apagar a própria ligação) é permitido, exceto a suspensos.
  if tg_op = 'DELETE' and old.user_id = v_actor then
    if old.status = 'suspended' then
      raise exception 'suspended members cannot leave' using errcode = '42501';
    end if;
    return old;
  end if;

  select role into v_actor_role from community_memberships
  where community_id = old.community_id and user_id = v_actor and status = 'active';
  if v_actor_role is null or v_actor_role = 'member' then
    raise exception 'insufficient role' using errcode = '42501';
  end if;
  if old.user_id = v_actor then
    raise exception 'cannot change own membership' using errcode = '42501';
  end if;
  -- Só se gere quem está abaixo na hierarquia.
  if public.community_rank(old.role) >= public.community_rank(v_actor_role) then
    raise exception 'cannot manage a member of equal or higher role' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.role <> old.role then
    if v_actor_role not in ('owner', 'admin') then
      raise exception 'only owners and admins change roles' using errcode = '42501';
    end if;
    -- 'owner' só se atribui pela transferência de propriedade.
    if public.community_rank(new.role) >= public.community_rank(v_actor_role) or new.role = 'owner' then
      raise exception 'cannot grant a role equal or higher than your own' using errcode = '42501';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
create trigger community_memberships_guard before update or delete on public.community_memberships
  for each row execute function public.tg_guard_membership();

-- Transferência de propriedade: atómica, só o dono ativo, para um membro ativo.
create or replace function public.transfer_community_ownership(p_community uuid, p_new_owner uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null or p_new_owner = v_me then
    raise exception 'invalid transfer' using errcode = '22023';
  end if;
  if not exists (select 1 from community_memberships where community_id = p_community and user_id = v_me and role = 'owner' and status = 'active') then
    raise exception 'only the owner can transfer ownership' using errcode = '42501';
  end if;
  if not exists (select 1 from community_memberships where community_id = p_community and user_id = p_new_owner and status = 'active') then
    raise exception 'new owner must be an active member' using errcode = '22023';
  end if;
  perform set_config('app.skip_membership_guard', '1', true);
  update community_memberships set role = 'owner' where community_id = p_community and user_id = p_new_owner;
  update community_memberships set role = 'admin' where community_id = p_community and user_id = v_me;
  perform set_config('app.skip_membership_guard', '', true);
end;
$$;

-- ------------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------------
alter table public.communities enable row level security;
alter table public.community_memberships enable row level security;
alter table public.community_games enable row level security;

revoke all on public.communities, public.community_memberships, public.community_games from anon, authenticated;
grant select on public.communities, public.community_games to anon;
grant select, insert, delete on public.communities to authenticated;
grant update (name, description, visibility, city, district, country, latitude, longitude) on public.communities to authenticated;

create policy "communities readable" on public.communities for select to anon, authenticated
  using (visibility = 'public' or created_by = (select auth.uid()) or public.is_community_participant(id));
create policy "authenticated create communities" on public.communities for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy "owner and admin update communities" on public.communities for update to authenticated
  using (public.has_community_role(id, array['owner', 'admin']::public.community_role[]))
  with check (public.has_community_role(id, array['owner', 'admin']::public.community_role[]));
create policy "owner deletes communities" on public.communities for delete to authenticated
  using (public.has_community_role(id, array['owner']::public.community_role[]));

grant select, insert, update, delete on public.community_memberships to authenticated;
create policy "memberships readable" on public.community_memberships for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_community_role(community_id, array['owner', 'admin', 'moderator']::public.community_role[])
    or (status = 'active' and (public.is_community_public(community_id) or public.is_community_member(community_id)))
  );
-- Entrar: comunidade pública fica ativa de imediato; privada fica pendente de aprovação.
create policy "join communities" on public.community_memberships for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'member'
    and (
      (status = 'active' and public.is_community_public(community_id))
      or (status = 'pending' and not public.is_community_public(community_id))
    )
  );
create policy "managers update memberships" on public.community_memberships for update to authenticated
  using (public.has_community_role(community_id, array['owner', 'admin', 'moderator']::public.community_role[]))
  with check (public.has_community_role(community_id, array['owner', 'admin', 'moderator']::public.community_role[]));
create policy "leave or remove memberships" on public.community_memberships for delete to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_community_role(community_id, array['owner', 'admin', 'moderator']::public.community_role[])
  );

grant select, insert, update, delete on public.community_games to authenticated;
create policy "community library readable" on public.community_games for select to anon, authenticated
  using (public.is_community_public(community_id) or public.is_community_member(community_id));
create policy "managers add community games" on public.community_games for insert to authenticated
  with check (
    added_by = (select auth.uid())
    and public.has_community_role(community_id, array['owner', 'admin', 'moderator']::public.community_role[])
  );
create policy "managers update community games" on public.community_games for update to authenticated
  using (public.has_community_role(community_id, array['owner', 'admin', 'moderator']::public.community_role[]))
  with check (public.has_community_role(community_id, array['owner', 'admin', 'moderator']::public.community_role[]));
create policy "managers remove community games" on public.community_games for delete to authenticated
  using (public.has_community_role(community_id, array['owner', 'admin', 'moderator']::public.community_role[]));

-- Funções: triggers internos não são chamáveis; helpers e a transferência ficam disponíveis.
revoke execute on function public.tg_community_creator_is_owner() from public, anon, authenticated;
revoke execute on function public.tg_guard_membership() from public, anon, authenticated;
revoke execute on function public.transfer_community_ownership(uuid, uuid) from public, anon;
grant execute on function public.transfer_community_ownership(uuid, uuid) to authenticated;
grant execute on function public.my_community_role(uuid), public.has_community_role(uuid, public.community_role[]),
  public.is_community_member(uuid), public.is_community_participant(uuid), public.is_community_public(uuid)
  to anon, authenticated;

-- ------------------------------------------------------------------
-- Comunidade por omissão (migração de dados + novos utilizadores)
-- ------------------------------------------------------------------
-- Cria (se faltar) a comunidade "Table Tale" com `p_owner` como dono e copia a coleção dele para a biblioteca.
-- A localização é provisória ("Por definir") e deve ser editada pelo dono: as colunas são obrigatórias.
create or replace function public.ensure_default_community(p_owner uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id from communities where slug = 'table-tale';
  if v_id is null then
    insert into communities (slug, name, description, visibility, city, district, country, created_by)
    values ('table-tale', 'Table Tale', 'Comunidade original da Table Tale.', 'public', 'Por definir', 'Por definir', 'Por definir', p_owner)
    returning id into v_id;
  end if;

  insert into community_games (community_id, game_id, added_by, copies, condition)
  select v_id, ug.game_id, p_owner, count(*)::int, (array_agg(ug.condition order by ug.copy_number))[1]
  from user_games ug
  where ug.user_id = p_owner
  group by ug.game_id
  on conflict (community_id, game_id) do nothing;
  return v_id;
end;
$$;
revoke execute on function public.ensure_default_community(uuid) from public, anon, authenticated;

-- claim_owner passa a usar user_games e a preparar a comunidade por omissão.
create or replace function public.claim_owner(p_user uuid)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_owner_email text;
  v_faction uuid;
  v_base_xp int;
begin
  select value into v_owner_email from app_config where key = 'owner_email';
  if v_owner_email is null
     or not exists (select 1 from profiles where id = p_user and lower(email) = lower(v_owner_email)) then
    return false;
  end if;

  insert into user_games (game_id, user_id, copy_number, condition, acquired_at)
  select g.id, p_user, c.n, i.condition, i.acquired_at
  from owner_inventory i
  join games g on g.slug = i.game_slug
  cross join lateral generate_series(1, i.copies) as c(n)
  on conflict (game_id, user_id, copy_number) do nothing;

  select f.id into v_faction
  from factions f join app_config c on c.key = 'owner_faction_slug' and c.value = f.slug;

  select nullif(value, '')::int into v_base_xp from app_config where key = 'owner_base_xp';

  update profiles
     set faction_id = coalesce(faction_id, v_faction),
         base_experience_points = greatest(base_experience_points, coalesce(v_base_xp, 0))
   where id = p_user;

  perform ensure_default_community(p_user);
  perform recompute_progress(p_user);
  return true;
end;
$$;

-- Novos perfis entram na comunidade por omissão, se existir.
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
