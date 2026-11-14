-- Community cover position: owners and admins drag the cover photo up or down to choose which part shows.
-- Stored as the vertical CSS object-position, in percent (0 = top, 50 = centre, 100 = bottom).
-- Rollback: supabase/rollbacks/20261114000001_community_cover_position.down.sql

alter table public.communities
  add column cover_position smallint not null default 50 check (cover_position between 0 and 100);

-- Column-level grant, like cover_url: the "owner and admin update communities" policy decides who.
grant update (cover_position) on public.communities to authenticated;
