-- Game owner. Every game belongs to the person who added it, who may edit its categories (and nothing else about it).
-- Existing games go to the collection owner (app_config.owner_email); BGG imports set the importing user (Edge Function).
-- Rollback: supabase/rollbacks/20261115000001_game_owner.down.sql

alter table public.games
  add column owner_id uuid references public.profiles (id) on delete set null;
create index games_owner_idx on public.games (owner_id);

update public.games
set owner_id = (
  select p.id from public.profiles p
  join public.app_config c on c.key = 'owner_email' and lower(p.email) = lower(c.value)
)
where owner_id is null;

-- 1 to 30 labels of up to 60 characters each (BGG's own are short), so a category list stays a list of labels.
create or replace function public.valid_categories(p_categories text[])
returns boolean
language sql immutable
as $$
  select coalesce(cardinality(p_categories), 0) <= 30
     and not exists (select 1 from unnest(p_categories) c where c is null or char_length(btrim(c)) not between 1 and 60)
$$;
alter table public.games add constraint games_categories_valid check (public.valid_categories(categories));

-- Owners update their own games, and only the categories column (the table stays read-only for everything else).
revoke update on public.games from anon, authenticated;
grant update (categories) on public.games to authenticated;
create policy "owners edit their game categories" on public.games for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
