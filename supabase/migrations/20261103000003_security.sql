-- Table Tale — Row Level Security, privilégios e storage

-- ------------------------------------------------------------------
-- Ativar RLS em todas as tabelas
-- ------------------------------------------------------------------
alter table public.factions enable row level security;
alter table public.arcanas enable row level security;
alter table public.elementals enable row level security;
alter table public.arcana_elemental_links enable row level security;
alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.game_ownerships enable row level security;
alter table public.user_game_status enable row level security;
alter table public.game_sessions enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.app_config enable row level security;
alter table public.owner_inventory enable row level security;

-- ------------------------------------------------------------------
-- Catálogo público (só leitura; escrita apenas com service role)
-- ------------------------------------------------------------------
create policy "factions are public" on public.factions for select to anon, authenticated using (true);
create policy "arcanas are public" on public.arcanas for select to anon, authenticated using (true);
create policy "elementals are public" on public.elementals for select to anon, authenticated using (true);
create policy "lore links are public" on public.arcana_elemental_links for select to anon, authenticated using (true);
create policy "games are public" on public.games for select to anon, authenticated using (true);
create policy "events are public" on public.events for select to anon, authenticated using (true);
create policy "achievements are public" on public.achievements for select to anon, authenticated using (true);

-- ------------------------------------------------------------------
-- Perfis: dados públicos visíveis (nome, avatar, nível); e-mail privado.
-- ------------------------------------------------------------------
revoke all on public.profiles from anon, authenticated;
grant select (id, display_name, avatar_url, level, experience_points, faction_id, bio, created_at, updated_at)
  on public.profiles to anon, authenticated;
grant update (display_name, avatar_url, bio, faction_id) on public.profiles to authenticated;

create policy "profiles are publicly readable" on public.profiles for select to anon, authenticated using (true);
create policy "users update own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- O próprio utilizador pode ler o seu e-mail através desta função.
create or replace function public.my_email()
returns text
language sql
stable
security definer
set search_path = public
as $$ select email from profiles where id = auth.uid(); $$;

-- ------------------------------------------------------------------
-- Propriedade de jogos: pública para mostrar o proprietário; escrita própria.
-- ------------------------------------------------------------------
create policy "ownerships are public" on public.game_ownerships for select to anon, authenticated using (true);
create policy "users add own ownerships" on public.game_ownerships for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "users update own ownerships" on public.game_ownerships for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users delete own ownerships" on public.game_ownerships for delete to authenticated
  using (user_id = (select auth.uid()));

-- ------------------------------------------------------------------
-- Dados privados por utilizador
-- ------------------------------------------------------------------
create policy "own game status" on public.user_game_status for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own sessions" on public.game_sessions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own event participation read" on public.event_participants for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own event participation join" on public.event_participants for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "own event participation leave" on public.event_participants for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "own achievements read" on public.user_achievements for select to authenticated
  using (user_id = (select auth.uid()));

-- app_config e owner_inventory: sem políticas => inacessíveis a anon/authenticated.
revoke all on public.app_config from anon, authenticated;
revoke all on public.owner_inventory from anon, authenticated;

-- ------------------------------------------------------------------
-- Funções: apenas as necessárias ficam expostas via RPC
-- ------------------------------------------------------------------
revoke execute on function public.compute_user_metrics(uuid) from public, anon, authenticated;
revoke execute on function public.recompute_progress(uuid) from public, anon, authenticated;
revoke execute on function public.claim_owner(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;
revoke execute on function public.tg_recompute_progress() from public, anon, authenticated;
revoke execute on function public.my_profile_stats() from public, anon;
revoke execute on function public.my_email() from public, anon;
grant execute on function public.my_profile_stats() to authenticated;
grant execute on function public.my_email() to authenticated;
grant execute on function public.claim_owner(uuid) to service_role;
grant execute on function public.recompute_progress(uuid) to service_role;

-- ------------------------------------------------------------------
-- Storage: capas de jogos (escrita só service role) e avatares (por utilizador)
-- ------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('game-covers', 'game-covers', true, 2097152, array['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp']),
  ('avatars', 'avatars', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "avatars upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars update own folder" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars delete own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
