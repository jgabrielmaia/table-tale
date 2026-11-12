-- Rollback of 20261112000006_community_cover.sql
-- Removes the cover column, the upload rules and the helper. Deploy the previous app version first.
-- The bucket is only removed when empty: uploaded files are kept so nothing is lost (delete them in the dashboard if wanted).

drop policy "community covers listed by owner or admin" on storage.objects;
drop policy "community covers upload by owner or admin" on storage.objects;
drop policy "community covers update by owner or admin" on storage.objects;
drop policy "community covers delete by owner or admin" on storage.objects;
drop function public.can_edit_community_folder(text);
alter table public.communities drop column cover_url;
delete from storage.buckets b
where b.id = 'community-covers' and not exists (select 1 from storage.objects o where o.bucket_id = b.id);
