-- Table Tale — The Fate Draw: uma carta por jogador por temporada.
-- A atribuição é decidida e guardada exclusivamente no servidor.

-- ------------------------------------------------------------------
-- Temporadas (no máximo uma ativa)
-- ------------------------------------------------------------------
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create unique index seasons_single_active_idx on public.seasons ((true)) where is_active;

-- ------------------------------------------------------------------
-- Cartas (metadados; a arte e os textos editoriais vivem no cliente)
-- ------------------------------------------------------------------
create table public.fate_cards (
  id text primary key check (id ~ '^[a-z]+(-[a-z]+)*$'),
  faction text not null check (faction in ('arcanos', 'elementais')),
  title text not null,
  numeral text,
  sort_order int not null unique,
  unique (id, faction)
);

insert into public.fate_cards (id, faction, title, numeral, sort_order) values
  ('magician',       'arcanos',    'The Magician',      'I',    1),
  ('high-priestess', 'arcanos',    'The High Priestess', 'II',  2),
  ('star',           'arcanos',    'The Star',          'XVII', 3),
  ('world',          'arcanos',    'The World',         'XXI',  4),
  ('temperance',     'arcanos',    'Temperance',        'XIV',  5),
  ('earth',          'elementais', 'Earth',             null,   6),
  ('water',          'elementais', 'Water',             null,   7),
  ('fire',           'elementais', 'Fire',              null,   8),
  ('air',            'elementais', 'Air',               null,   9);

insert into public.seasons (slug, name) values ('season-1', 'Season 1');

-- ------------------------------------------------------------------
-- Identidade de carta: uma por (jogador, temporada)
-- ------------------------------------------------------------------
create table public.player_card_identities (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles (id) on delete cascade,
  season_id uuid not null references public.seasons (id) on delete restrict,
  card_id text not null,
  faction text not null,
  selected_at timestamptz not null default now(),
  is_active boolean not null default true,
  constraint player_card_identities_one_per_season unique (player_id, season_id),
  constraint player_card_identities_card_fk foreign key (card_id, faction) references public.fate_cards (id, faction)
);
create index player_card_identities_season_idx on public.player_card_identities (season_id);
create index player_card_identities_player_idx on public.player_card_identities (player_id, selected_at desc);

-- Registo de auditoria: correções administrativas e remoções.
create table public.player_card_identity_audit (
  id uuid primary key default gen_random_uuid(),
  identity_id uuid not null,
  player_id uuid not null,
  season_id uuid not null,
  action text not null check (action in ('correction', 'delete')),
  old_card_id text not null,
  new_card_id text,
  reason text not null check (btrim(reason) <> ''),
  performed_by text not null default session_user,
  performed_at timestamptz not null default now()
);

-- A carta, o jogador, a temporada e a data só mudam através de admin_correct_card().
create or replace function public.guard_identity_update()
returns trigger
language plpgsql
as $$
begin
  if (new.player_id, new.season_id, new.card_id, new.faction, new.selected_at)
     is distinct from (old.player_id, old.season_id, old.card_id, old.faction, old.selected_at)
     and coalesce(current_setting('app.identity_correction', true), '') <> 'on' then
    raise exception 'card identities are immutable; use admin_correct_card()' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger player_card_identities_guard before update on public.player_card_identities
  for each row execute function public.guard_identity_update();

create or replace function public.audit_identity_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into player_card_identity_audit (identity_id, player_id, season_id, action, old_card_id, reason)
  values (old.id, old.player_id, old.season_id, 'delete', old.card_id,
          coalesce(nullif(btrim(current_setting('app.identity_reason', true)), ''), 'removed without reason (e.g. account deletion)'));
  return old;
end;
$$;

create trigger player_card_identities_audit_delete after delete on public.player_card_identities
  for each row execute function public.audit_identity_delete();

-- ------------------------------------------------------------------
-- Sorteio atómico: valida elegibilidade, escolhe a carta e grava.
-- Idempotente: quem já tem carta nesta temporada recebe a mesma carta.
-- ------------------------------------------------------------------
create or replace function public.draw_fate_card()
returns table (
  r_season_id uuid,
  r_card_id text,
  r_faction text,
  r_selected_at timestamptz,
  r_is_active boolean,
  r_already_drawn boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_season uuid;
  v_card record;
  v_row public.player_card_identities;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from profiles where id = v_user) then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  -- FOR SHARE impede que a temporada seja arquivada a meio do sorteio.
  select s.id into v_season from seasons s where s.is_active for share;
  if v_season is null then
    raise exception 'no active season' using errcode = 'P0001', hint = 'no_active_season';
  end if;

  select * into v_row from player_card_identities i where i.player_id = v_user and i.season_id = v_season;
  if found then
    return query select v_row.season_id, v_row.card_id, v_row.faction, v_row.selected_at, v_row.is_active, true;
    return;
  end if;

  select c.id, c.faction into v_card from fate_cards c order by random() limit 1;

  insert into player_card_identities (player_id, season_id, card_id, faction)
  values (v_user, v_season, v_card.id, v_card.faction)
  on conflict (player_id, season_id) do nothing
  returning * into v_row;

  if v_row.id is not null then
    return query select v_row.season_id, v_row.card_id, v_row.faction, v_row.selected_at, v_row.is_active, false;
    return;
  end if;

  -- Pedido concorrente do mesmo jogador venceu a corrida: devolve a carta já gravada.
  select * into v_row from player_card_identities i where i.player_id = v_user and i.season_id = v_season;
  return query select v_row.season_id, v_row.card_id, v_row.faction, v_row.selected_at, v_row.is_active, true;
end;
$$;

-- ------------------------------------------------------------------
-- Administração (apenas service role): rotação de temporada e correções auditadas
-- ------------------------------------------------------------------
create or replace function public.rotate_season(p_slug text, p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new uuid;
begin
  update seasons set is_active = false, ends_at = now() where is_active;
  update player_card_identities set is_active = false where is_active;
  insert into seasons (slug, name) values (p_slug, p_name) returning id into v_new;
  return v_new;
end;
$$;

create or replace function public.admin_correct_card(p_player uuid, p_season uuid, p_card text, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old player_card_identities;
  v_faction text;
begin
  if btrim(coalesce(p_reason, '')) = '' then
    raise exception 'a reason is required' using errcode = '22023';
  end if;
  select * into v_old from player_card_identities where player_id = p_player and season_id = p_season for update;
  if not found then
    raise exception 'identity not found' using errcode = 'P0002';
  end if;
  select faction into v_faction from fate_cards where id = p_card;
  if not found then
    raise exception 'unknown card' using errcode = '22023';
  end if;

  insert into player_card_identity_audit (identity_id, player_id, season_id, action, old_card_id, new_card_id, reason)
  values (v_old.id, p_player, p_season, 'correction', v_old.card_id, p_card, p_reason);

  perform set_config('app.identity_correction', 'on', true);
  update player_card_identities set card_id = p_card, faction = v_faction where id = v_old.id;
  perform set_config('app.identity_correction', 'off', true);
end;
$$;

-- ------------------------------------------------------------------
-- Leitura pública das identidades ativas (molduras de avatar em toda a app)
-- ------------------------------------------------------------------
create view public.active_player_identities with (security_invoker = true) as
select i.player_id, i.season_id, i.card_id, i.faction, c.title as card_title, i.selected_at
from public.player_card_identities i
join public.seasons s on s.id = i.season_id and s.is_active
join public.fate_cards c on c.id = i.card_id
where i.is_active;

-- ------------------------------------------------------------------
-- Segurança
-- ------------------------------------------------------------------
alter table public.seasons enable row level security;
alter table public.fate_cards enable row level security;
alter table public.player_card_identities enable row level security;
alter table public.player_card_identity_audit enable row level security;

revoke all on public.seasons, public.fate_cards, public.player_card_identities, public.player_card_identity_audit from anon, authenticated;
revoke all on public.active_player_identities from anon, authenticated;
grant select on public.seasons, public.fate_cards, public.player_card_identities, public.active_player_identities to anon, authenticated;

create policy "seasons are public" on public.seasons for select to anon, authenticated using (true);
create policy "fate cards are public" on public.fate_cards for select to anon, authenticated using (true);
create policy "card identities are public" on public.player_card_identities for select to anon, authenticated using (true);
-- Sem políticas de escrita: clientes nunca inserem, alteram ou apagam identidades.

revoke execute on function public.guard_identity_update() from public, anon, authenticated;
revoke execute on function public.audit_identity_delete() from public, anon, authenticated;
revoke execute on function public.draw_fate_card() from public, anon;
revoke execute on function public.rotate_season(text, text) from public, anon, authenticated;
revoke execute on function public.admin_correct_card(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.draw_fate_card() to authenticated;
grant execute on function public.rotate_season(text, text) to service_role;
grant execute on function public.admin_correct_card(uuid, uuid, text, text) to service_role;
