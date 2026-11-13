-- CI only: checks after 20261113000001_community_game_copies. Raises on the first failed expectation.
-- Fixtures: owner ...0a owns the default community "table-tale", whose shelf has Catan (2 copies); ...0b and ...0c are plain members.
reset role;
select set_config('request.jwt.sub', '', false);

do $$
begin
  if exists (
    select 1 from community_games g
    where g.copies <> (select count(*) from community_game_copies k where k.community_game_id = g.id)
  ) then
    raise exception 'copies: every shelf entry must have one copy row per copy';
  end if;
  if exists (select 1 from community_game_copies k join community_games g on g.id = k.community_game_id where k.community_id <> g.community_id) then
    raise exception 'copies: a copy must belong to its entry''s community';
  end if;
end $$;

-- The owner adds a copy owned by a member, then hands it to another member.
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000a', false);
insert into community_game_copies (community_game_id, community_id, owner_id)
select g.id, '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000000b'
from community_games g join communities c on c.id = g.community_id join games x on x.id = g.game_id
where c.slug = 'table-tale' and x.slug = 'catan';
update community_game_copies set owner_id = '00000000-0000-0000-0000-00000000000c'
where owner_id = '00000000-0000-0000-0000-00000000000b';
reset role;
do $$
declare v_entry community_games;
begin
  select g.* into v_entry from community_games g join communities c on c.id = g.community_id join games x on x.id = g.game_id
  where c.slug = 'table-tale' and x.slug = 'catan';
  if v_entry.copies <> 3 then
    raise exception 'copies: adding a copy must raise the count to 3, got %', v_entry.copies;
  end if;
  if not exists (select 1 from community_game_copies where community_game_id = v_entry.id and owner_id = '00000000-0000-0000-0000-00000000000c') then
    raise exception 'copies: the owner must be able to change who owns a copy';
  end if;
  if exists (select 1 from community_game_copies where community_id = '00000000-0000-0000-0000-000000000000') then
    raise exception 'copies: community_id must come from the shelf entry, not the client';
  end if;
end $$;

-- A plain member can't add copies, and nobody sets the count by hand.
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$
begin
  begin
    insert into community_game_copies (community_game_id, community_id)
    select g.id, g.community_id from community_games g join games x on x.id = g.game_id where x.slug = 'catan' limit 1;
    raise exception 'copies: a member must not add copies' using errcode = 'P0002';
  exception when insufficient_privilege then null;
  end;
  delete from community_game_copies;
  if found then raise exception 'copies: a member must not remove copies'; end if;
end $$;
reset role;
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$
begin
  begin
    update community_games set copies = 9;
    raise exception 'copies: the count must not be set directly' using errcode = 'P0002';
  exception when insufficient_privilege then null;
  end;
  update community_games set notes = 'Box is a bit worn' from games x where x.id = community_games.game_id and x.slug = 'catan';
  if not found then raise exception 'copies: the owner must still edit the notes'; end if;
end $$;

-- Removing copies lowers the count; the last copy stays (remove the game instead).
delete from community_game_copies where owner_id = '00000000-0000-0000-0000-00000000000c';
do $$
declare v_entry uuid; v_last uuid;
begin
  select g.id into v_entry from community_games g join games x on x.id = g.game_id join communities c on c.id = g.community_id
  where c.slug = 'table-tale' and x.slug = 'catan';
  if (select copies from community_games where id = v_entry) <> 2 then
    raise exception 'copies: removing a copy must lower the count back to 2';
  end if;
  select id into v_last from community_game_copies where community_game_id = v_entry limit 1;
  delete from community_game_copies where community_game_id = v_entry and id <> v_last;
  begin
    delete from community_game_copies where id = v_last;
    raise exception 'copies: the last copy must not be removable' using errcode = 'P0002';
  exception when check_violation then null;
  end;
  -- Put the second copy back for the fixtures.
  insert into community_game_copies (community_game_id, community_id, owner_id)
  select v_entry, community_id, owner_id from community_game_copies where id = v_last;
end $$;
reset role;

-- A game put on the shelf starts with a copy owned by whoever added it; removing the game removes its copies.
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000a', false);
insert into community_games (community_id, game_id, added_by)
select c.id, x.id, '00000000-0000-0000-0000-00000000000a' from communities c, games x
where c.slug = 'table-tale' and x.slug = 'dixit'
  and not exists (select 1 from community_games g where g.community_id = c.id and g.game_id = x.id);
reset role;
do $$
declare v_entry uuid;
begin
  select g.id into v_entry from community_games g join games x on x.id = g.game_id join communities c on c.id = g.community_id
  where c.slug = 'table-tale' and x.slug = 'dixit';
  if v_entry is null then return; end if; -- already on the shelf in this fixture set
  if not exists (select 1 from community_game_copies where community_game_id = v_entry and owner_id = '00000000-0000-0000-0000-00000000000a') then
    raise exception 'copies: a new shelf game must start with a copy owned by whoever added it';
  end if;
end $$;
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000a', false);
delete from community_games g using games x, communities c
where x.id = g.game_id and c.id = g.community_id and c.slug = 'table-tale' and x.slug = 'dixit'
  and g.added_at > now() - interval '1 minute';
reset role;
do $$
begin
  if exists (select 1 from community_game_copies k where not exists (select 1 from community_games g where g.id = k.community_game_id)) then
    raise exception 'copies: removing a game must remove its copies';
  end if;
end $$;

-- Leave the fixtures as they were.
update community_games set notes = null where notes = 'Box is a bit worn';
select set_config('request.jwt.sub', '', false);
