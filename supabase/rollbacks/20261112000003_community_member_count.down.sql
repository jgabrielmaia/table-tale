-- Rollback of 20261112000003_community_member_count.sql
-- Removes the member_count computed field. The app falls back to nothing: deploy the previous app version first.

drop function public.member_count(public.communities);
