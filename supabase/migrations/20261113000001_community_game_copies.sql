-- Community shelf copies: each copy of a game on a community shelf has its own owner (a member of that community, or
-- nobody when it belongs to the community itself). community_games.copies stays as the count, kept in sync here, so
-- everything that reads it (the Games page, shelves) keeps working.
-- Personal collections (user_games) are separate and untouched.

create table public.community_game_copies (
  id uuid primary key default gen_random_uuid(),
  community_game_id uuid not null references public.community_games (id) on delete cascade,
  community_id uuid not null references public.communities (id) on delete cascade,
  owner_id uuid references public.profiles (id) on delete set null,
  added_at timestamptz not null default now()
);
create index community_game_copies_entry_idx on public.community_game_copies (community_game_id);
create index community_game_copies_owner_idx on public.community_game_copies (owner_id);

-- True when p_user has an active membership in p_community (security definer: the caller may not see every membership).
create or replace function public.is_active_community_member(p_community uuid, p_user uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.community_memberships
    where community_id = p_community and user_id = p_user and status = 'active'
  );
$$;

-- community_id always matches the shelf entry, whatever the client sends.
create or replace function public.tg_copy_community()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  select community_id into new.community_id from public.community_games where id = new.community_game_id;
  if new.community_id is null then
    raise exception 'unknown community game %', new.community_game_id using errcode = 'foreign_key_violation';
  end if;
  return new;
end;
$$;
create trigger community_game_copies_community
  before insert or update of community_game_id on public.community_game_copies
  for each row execute function public.tg_copy_community();

-- Keeps community_games.copies equal to the number of copies. A shelf entry always keeps at least one copy:
-- removing the game from the shelf is done by deleting the entry.
create or replace function public.tg_sync_copy_count()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_entry uuid := coalesce(new.community_game_id, old.community_game_id);
  v_count int;
begin
  if not exists (select 1 from public.community_games where id = v_entry) then
    return null; -- the entry itself is being deleted (cascade)
  end if;
  select count(*) into v_count from public.community_game_copies where community_game_id = v_entry;
  if v_count = 0 then
    raise exception 'a game on a community shelf keeps at least one copy; remove the game instead' using errcode = 'check_violation';
  end if;
  update public.community_games set copies = v_count where id = v_entry and copies <> v_count;
  return null;
end;
$$;
create trigger community_game_copies_count
  after insert or delete on public.community_game_copies
  for each row execute function public.tg_sync_copy_count();

-- A game put on the shelf starts with its copies owned by whoever added it.
create or replace function public.tg_first_copies()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.community_game_copies (community_game_id, community_id, owner_id)
  select new.id, new.community_id, new.added_by from generate_series(1, new.copies);
  return null;
end;
$$;
create trigger community_games_first_copies
  after insert on public.community_games
  for each row execute function public.tg_first_copies();

-- Existing shelves: one row per copy, owned by whoever added the game (the default shelf came from its owner's games).
insert into public.community_game_copies (community_game_id, community_id, owner_id, added_at)
select g.id, g.community_id, g.added_by, g.added_at
from public.community_games g, generate_series(1, g.copies);

alter table public.community_game_copies enable row level security;
grant select on public.community_game_copies to anon;
grant select, insert, update (owner_id), delete on public.community_game_copies to authenticated;
create policy "community copies readable" on public.community_game_copies for select to anon, authenticated
  using (public.is_community_public(community_id) or public.is_community_member(community_id));
create policy "managers add community copies" on public.community_game_copies for insert to authenticated
  with check (
    public.has_community_role(community_id, array['owner', 'admin', 'moderator']::public.community_role[])
    and (owner_id is null or public.is_active_community_member(community_id, owner_id))
  );
create policy "managers change copy owners" on public.community_game_copies for update to authenticated
  using (public.has_community_role(community_id, array['owner', 'admin', 'moderator']::public.community_role[]))
  with check (
    public.has_community_role(community_id, array['owner', 'admin', 'moderator']::public.community_role[])
    and (owner_id is null or public.is_active_community_member(community_id, owner_id))
  );
create policy "managers remove community copies" on public.community_game_copies for delete to authenticated
  using (public.has_community_role(community_id, array['owner', 'admin', 'moderator']::public.community_role[]));

-- The count now follows the copies, so clients change copies through community_game_copies, not the number itself.
revoke update on public.community_games from authenticated;
grant update (condition, notes) on public.community_games to authenticated;

revoke execute on function public.tg_copy_community() from public, anon, authenticated;
revoke execute on function public.tg_sync_copy_count() from public, anon, authenticated;
revoke execute on function public.tg_first_copies() from public, anon, authenticated;
revoke execute on function public.is_active_community_member(uuid, uuid) from public, anon;
grant execute on function public.is_active_community_member(uuid, uuid) to authenticated;
