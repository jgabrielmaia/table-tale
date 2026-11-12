-- CI only: checks after 20261112000007_bgg_search_cache. Raises on the first failed expectation.
reset role;
select set_config('request.jwt.sub', '', false);
delete from public.bgg_search_cache where query like 'ci-%';

do $$
begin
  if not exists (select 1 from pg_class where oid = 'public.bgg_search_cache'::regclass and relrowsecurity) then
    raise exception 'bgg_search_cache: row-level security must be on';
  end if;
  if not exists (select 1 from pg_indexes where indexname = 'bgg_search_cache_fetched_idx') then
    raise exception 'bgg_search_cache: missing fetched_at index';
  end if;
  -- the key is the normalised query (trimmed, lower case, 1 to 200 characters) and results is a JSON array
  begin
    insert into public.bgg_search_cache (query, results) values ('CI-Upper', '[]');
    raise exception 'bgg_search_cache: an upper-case key must be rejected';
  exception when check_violation then null;
  end;
  begin
    insert into public.bgg_search_cache (query, results) values (' ci-padded ', '[]');
    raise exception 'bgg_search_cache: an untrimmed key must be rejected';
  exception when check_violation then null;
  end;
  begin
    insert into public.bgg_search_cache (query, results) values ('', '[]');
    raise exception 'bgg_search_cache: an empty key must be rejected';
  exception when check_violation then null;
  end;
  begin
    insert into public.bgg_search_cache (query, results) values ('ci-' || repeat('x', 198), '[]');
    raise exception 'bgg_search_cache: a key over 200 characters must be rejected';
  exception when check_violation then null;
  end;
  begin
    insert into public.bgg_search_cache (query, results) values ('ci-object', '{}');
    raise exception 'bgg_search_cache: results must be an array';
  exception when check_violation then null;
  end;
end $$;

-- The Edge Function (service role) upserts and reads entries.
set role service_role;
insert into public.bgg_search_cache (query, results) values ('ci-catan', '[{"id": 13, "name": "CATAN"}]')
on conflict (query) do update set results = excluded.results, fetched_at = now();
insert into public.bgg_search_cache (query, results) values ('ci-catan', '[{"id": 13, "name": "CATAN"}, {"id": 926, "name": "Catan: Cities & Knights"}]')
on conflict (query) do update set results = excluded.results, fetched_at = now();
do $$
begin
  if (select jsonb_array_length(results) from public.bgg_search_cache where query = 'ci-catan') is distinct from 2 then
    raise exception 'bgg_search_cache: the service role must upsert entries';
  end if;
end $$;

-- Signed-in and anonymous users can't touch it.
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$
begin
  begin
    perform 1 from public.bgg_search_cache;
    raise exception 'bgg_search_cache: signed-in users must not read the cache';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.bgg_search_cache (query, results) values ('ci-poison', '[]');
    raise exception 'bgg_search_cache: signed-in users must not write the cache';
  exception when insufficient_privilege then null;
  end;
end $$;
set role anon;
select set_config('request.jwt.sub', '', false);
do $$
begin
  begin
    perform 1 from public.bgg_search_cache;
    raise exception 'bgg_search_cache: anonymous users must not read the cache';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
delete from public.bgg_search_cache where query like 'ci-%';
