-- Table Tale — nome de apresentação a partir de qualquer fornecedor (Google, GitHub, Facebook, ...)
-- A foto continua a vir de pick_provider_avatar() e nunca substitui um avatar já definido.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    left(coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'user_name', ''),
      nullif(new.raw_user_meta_data ->> 'preferred_username', ''),
      split_part(coalesce(new.email, 'jogador'), '@', 1)
    ), 60),
    pick_provider_avatar(new.raw_user_meta_data)
  )
  on conflict (id) do nothing;

  perform claim_owner(new.id);
  return new;
end;
$$;
