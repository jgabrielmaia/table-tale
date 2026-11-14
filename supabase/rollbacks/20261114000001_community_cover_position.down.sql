-- Rollback of 20261114000001_community_cover_position.sql
-- Covers go back to being centred. Deploy the previous app version first.

alter table public.communities drop column cover_position;
