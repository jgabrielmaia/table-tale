-- Table Tale — reutiliza a foto de perfil do fornecedor de autenticação (Google, GitHub, Facebook, ...)

-- Primeira URL https encontrada nos metadados do fornecedor (avatar_url, picture ou picture.data.url).
create or replace function public.pick_provider_avatar(meta jsonb)
returns text
language sql
immutable
set search_path = public
as $$
  select u
  from unnest(array[meta ->> 'avatar_url', meta ->> 'picture', meta #>> '{picture,data,url}']) as u
  where u like 'https://%' and char_length(u) <= 2048
  limit 1;
$$;

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
      split_part(coalesce(new.email, 'jogador'), '@', 1)
    ), 60),
    pick_provider_avatar(new.raw_user_meta_data)
  )
  on conflict (id) do nothing;

  perform claim_owner(new.id);
  return new;
end;
$$;

-- Associar um fornecedor mais tarde preenche o avatar, mas nunca substitui um já definido.
create or replace function public.handle_identity_avatar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles
     set avatar_url = pick_provider_avatar(new.identity_data)
   where id = new.user_id
     and avatar_url is null
     and pick_provider_avatar(new.identity_data) is not null;
  return new;
end;
$$;

create trigger on_auth_identity_created
  after insert on auth.identities
  for each row execute function public.handle_identity_avatar();

-- Perfis existentes sem avatar adotam a foto do fornecedor, se existir.
update public.profiles p
   set avatar_url = x.url
  from (
    select distinct on (user_id) user_id, public.pick_provider_avatar(identity_data) as url
    from auth.identities
    where public.pick_provider_avatar(identity_data) is not null
    order by user_id, created_at
  ) x
 where p.id = x.user_id and p.avatar_url is null;

revoke execute on function public.pick_provider_avatar(jsonb) from public, anon, authenticated;
revoke execute on function public.handle_identity_avatar() from public, anon, authenticated;
