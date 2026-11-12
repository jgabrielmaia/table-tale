-- Rollback of 20261112000007_bgg_search_cache.sql
-- Drops the cached BGG searches (they are only a cache: the next searches go to BGG again).

drop table public.bgg_search_cache;
