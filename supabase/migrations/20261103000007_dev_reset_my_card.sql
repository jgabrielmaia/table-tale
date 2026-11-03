-- TEMPORÁRIO: permite ao dono da coleção repetir o sorteio durante os testes.
-- Remover antes de abrir o Fate Draw ao público: drop function public.dev_reset_my_card();
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
    join app_config c on c.key = 'owner_email' and lower(c.value) = lower(p.email)
    where p.id = v_user
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  perform set_config('app.identity_reason', 'Temporary dev reset by owner', true);
  delete from player_card_identities
   where player_id = v_user
     and season_id in (select id from seasons where is_active);
end;
$$;

revoke execute on function public.dev_reset_my_card() from public, anon;
grant execute on function public.dev_reset_my_card() to authenticated;
