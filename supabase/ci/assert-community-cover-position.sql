-- CI only: checks after 20261114000001_community_cover_position. Raises on the first failed expectation.
-- Fixtures: owner ...0a owns the public community "table-tale"; ...0b is a plain member.
reset role;
select set_config('request.jwt.sub', '', false);
update communities set cover_position = 50 where slug = 'table-tale';

do $$
begin
  if (select column_default from information_schema.columns
      where table_schema = 'public' and table_name = 'communities' and column_name = 'cover_position') <> '50' then
    raise exception 'cover position: new covers must default to the centre (50)';
  end if;
end $$;

-- A plain member can't move the cover; the owner can.
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000b', false);
update communities set cover_position = 10 where slug = 'table-tale';
reset role;
do $$
begin
  if (select cover_position from communities where slug = 'table-tale') <> 50 then
    raise exception 'cover position: a plain member must not move the cover';
  end if;
end $$;
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000a', false);
update communities set cover_position = 30 where slug = 'table-tale';
reset role;
do $$
begin
  if (select cover_position from communities where slug = 'table-tale') <> 30 then
    raise exception 'cover position: the owner must be able to move the cover';
  end if;
end $$;

-- Out-of-range positions are refused.
do $$
begin
  begin
    update communities set cover_position = 150 where slug = 'table-tale';
    raise exception 'cover position: 150 must be refused';
  exception when check_violation then null;
  end;
end $$;

update communities set cover_position = 50 where slug = 'table-tale';
