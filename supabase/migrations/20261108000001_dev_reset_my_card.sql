-- TEMPORARY, for testing: lets the collection owner and the test accounts listed in
-- app_config.dev_reset_emails (comma separated) repeat the Fate Draw of the active season.
-- The "repeat the draw" button only exists in dev builds (import.meta.env.DEV); by default nobody but
-- the owner is allowed. Remove with: drop function public.dev_reset_my_card();
create or replace function public.dev_reset_my_card()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not exists (
    select 1 from profiles p
    where p.id = v_user
      and (
        exists (select 1 from app_config c where c.key = 'owner_email' and lower(c.value) = lower(p.email))
        or exists (
          select 1 from app_config c
          where c.key = 'dev_reset_emails'
            and lower(p.email) = any (string_to_array(regexp_replace(lower(c.value), '\s', '', 'g'), ','))
        )
      )
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  perform set_config('app.identity_reason', 'Temporary dev reset by test account', true);
  delete from player_card_identities
   where player_id = v_user
     and season_id in (select id from seasons where is_active);
end;
$$;

revoke execute on function public.dev_reset_my_card() from public, anon;
grant execute on function public.dev_reset_my_card() to authenticated;
