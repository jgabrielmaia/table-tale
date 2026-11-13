-- CI only: checks after 20261113000002_community_shelf_visibility. Raises on the first failed expectation.
-- Fixtures: owner ...0a owns the public community "table-tale" (with games on its shelf); ...0b is a plain member, ...0c leaves it for this check.
reset role;
select set_config('request.jwt.sub', '', false);
update communities set shelf_visibility = 'public' where slug = 'table-tale';
delete from community_memberships m using communities c
where c.id = m.community_id and c.slug = 'table-tale' and m.user_id = '00000000-0000-0000-0000-00000000000c';

-- Public shelf: visitors see the games and copies.
set role anon;
select set_config('request.jwt.sub', '', false);
do $$
begin
  if not exists (select 1 from community_games g join communities c on c.id = g.community_id where c.slug = 'table-tale') then
    raise exception 'shelf: a public shelf must be visible to visitors';
  end if;
end $$;
reset role;

-- The owner makes the shelf members-only; a plain member can't change it.
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000b', false);
update communities set shelf_visibility = 'private' where slug = 'table-tale';
reset role;
do $$
begin
  if (select shelf_visibility from communities where slug = 'table-tale') <> 'public' then
    raise exception 'shelf: a plain member must not change the shelf visibility';
  end if;
end $$;
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000a', false);
update communities set shelf_visibility = 'private' where slug = 'table-tale';
reset role;

-- Members-only shelf: visitors and non-members see nothing, members still see everything, the community stays visible.
set role anon;
select set_config('request.jwt.sub', '', false);
do $$
begin
  if exists (select 1 from community_games g join communities c on c.id = g.community_id where c.slug = 'table-tale')
     or exists (select 1 from community_game_copies k join communities c on c.id = k.community_id where c.slug = 'table-tale') then
    raise exception 'shelf: a members-only shelf must be hidden from visitors';
  end if;
  if not exists (select 1 from communities where slug = 'table-tale') then
    raise exception 'shelf: the community itself must stay visible';
  end if;
end $$;
reset role;
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000c', false);
do $$
begin
  if exists (select 1 from community_games g join communities c on c.id = g.community_id where c.slug = 'table-tale') then
    raise exception 'shelf: a members-only shelf must be hidden from signed-in non-members';
  end if;
end $$;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$
begin
  if not exists (select 1 from community_games g join communities c on c.id = g.community_id where c.slug = 'table-tale')
     or not exists (select 1 from community_game_copies k join communities c on c.id = k.community_id where c.slug = 'table-tale') then
    raise exception 'shelf: members must still see a members-only shelf';
  end if;
end $$;
reset role;

-- Leave the fixtures as they were.
update communities set shelf_visibility = 'public' where slug = 'table-tale';
insert into community_memberships (user_id, community_id, role, status)
select '00000000-0000-0000-0000-00000000000c', c.id, 'member', 'active' from communities c
where c.slug = 'table-tale'
  and not exists (select 1 from community_memberships m where m.community_id = c.id and m.user_id = '00000000-0000-0000-0000-00000000000c');
select set_config('request.jwt.sub', '', false);
