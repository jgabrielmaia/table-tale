-- BoardGameGeek search cache (7 days), so repeated searches don't spend the BGG rate limit.
-- Only the `bgg` Edge Function (service role) reads and writes it; the freshness window lives in the function.
-- Additive. Rollback: supabase/rollbacks/20261112000007_bgg_search_cache.down.sql

create table public.bgg_search_cache (
  query text primary key check (query = lower(btrim(query)) and char_length(query) between 1 and 200),
  results jsonb not null check (jsonb_typeof(results) = 'array'),
  fetched_at timestamptz not null default now()
);
create index bgg_search_cache_fetched_idx on public.bgg_search_cache (fetched_at);

alter table public.bgg_search_cache enable row level security;
-- No policies: with RLS on and no grants, signed-in and anonymous users can neither read nor write it.
revoke all on public.bgg_search_cache from public, anon, authenticated;
grant select, insert, update, delete on public.bgg_search_cache to service_role;
