insert into public.profiles (id, email, display_name, avatar_url)
select
  u.id,
  u.email,
  left(coalesce(
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    nullif(u.raw_user_meta_data ->> 'name', ''),
    split_part(coalesce(u.email, 'jogador'), '@', 1)
  ), 60),
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
on conflict (id) do nothing;

do $$
declare
  owner_user_id uuid;
begin
  select p.id into owner_user_id
  from public.profiles p
  join public.app_config c on c.key = 'owner_email' and lower(c.value) = lower(p.email)
  limit 1;

  if owner_user_id is not null then
    perform public.claim_owner(owner_user_id);
  end if;
end;
$$;
