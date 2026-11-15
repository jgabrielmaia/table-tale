-- CI only: checks after 20261115000001_game_owner. Raises on the first failed expectation.
-- Fixtures: owner ...0a is app_config.owner_email and owns every game from before; ...0b is a plain player.
reset role;
select set_config('request.jwt.sub', '', false);
-- The CI stand-in roles have no table grants (Supabase's real ones do): reading is what the policies allow anyway.
grant select on public.games to anon, authenticated;

do $$
begin
  if exists (select 1 from games where slug in ('catan', 'azul', 'dixit') and owner_id is null) then
    raise exception 'game owner: every existing game must be backfilled to the collection owner';
  end if;
  if exists (select 1 from games where slug in ('catan', 'azul', 'dixit') and owner_id <> '00000000-0000-0000-0000-00000000000a') then
    raise exception 'game owner: existing games belong to the OWNER_EMAIL account';
  end if;
end $$;

-- A game by a plain player, with a category list.
insert into games (title, slug, description, owner_id, categories)
values ('CI Owned', 'ci-owned', 'x', '00000000-0000-0000-0000-00000000000b', '{Card Game}');

-- The owner edits categories.
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000b', false);
update games set categories = '{Card Game,Party,Family}' where slug = 'ci-owned';
reset role;
do $$
begin
  if (select categories from games where slug = 'ci-owned') <> '{"Card Game",Party,Family}' then
    raise exception 'game owner: the owner must be able to change categories';
  end if;
end $$;

-- Someone else changes nothing (RLS filters the row out: no error, no change).
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000a', false);
update games set categories = '{Hacked}' where slug = 'ci-owned';
reset role;
do $$
begin
  if (select categories from games where slug = 'ci-owned') = '{Hacked}' then
    raise exception 'game owner: only the owner may change categories';
  end if;
end $$;

-- An anonymous visitor cannot update at all.
set role anon;
do $$
begin
  begin
    update games set categories = '{Hacked}' where slug = 'ci-owned';
    raise exception 'game owner: anon must not be able to update games';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- The owner cannot touch other columns, nor give the game away.
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$
begin
  begin
    update games set title = 'Renamed' where slug = 'ci-owned';
    raise exception 'game owner: the title must not be editable';
  exception when insufficient_privilege then null;
  end;
  begin
    update games set owner_id = '00000000-0000-0000-0000-00000000000a' where slug = 'ci-owned';
    raise exception 'game owner: owner_id must not be editable';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Category lists are validated: no blanks, at most 60 characters each, at most 30 of them.
do $$
begin
  begin
    update games set categories = '{"Card Game"," "}' where slug = 'ci-owned';
    raise exception 'game owner: a blank category must be refused';
  exception when check_violation then null;
  end;
  begin
    update games set categories = array[repeat('x', 61)] where slug = 'ci-owned';
    raise exception 'game owner: a 61-character category must be refused';
  exception when check_violation then null;
  end;
  begin
    update games set categories = (select array_agg('c' || i) from generate_series(1, 31) i) where slug = 'ci-owned';
    raise exception 'game owner: more than 30 categories must be refused';
  exception when check_violation then null;
  end;
end $$;

delete from games where slug = 'ci-owned';
