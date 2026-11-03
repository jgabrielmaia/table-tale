-- Table Tale — schema inicial
-- Entidades, relações, índices e timestamps.

create extension if not exists pgcrypto;

create type public.game_status as enum ('unplayed', 'in_progress', 'completed');
create type public.ownership_condition as enum ('new', 'good', 'worn', 'damaged');
create type public.achievement_requirement as enum ('sessions', 'games_played', 'completed', 'favorites', 'events', 'genres');

-- ------------------------------------------------------------------
-- Utilitários
-- ------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------------
-- Universo (fonte de verdade: "S1: Elementais vs Arcanos")
-- ------------------------------------------------------------------
create table public.factions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  symbol text not null,
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  -- Conteúdo editorial estruturado (lema, valores, virtudes/riscos, ...)
  lore jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.arcanas (
  id uuid primary key default gen_random_uuid(),
  faction_id uuid references public.factions (id) on delete set null,
  name text not null,
  slug text not null unique,
  description text not null default '',
  long_description text not null default '',
  symbol text not null,
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  image_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.elementals (
  id uuid primary key default gen_random_uuid(),
  faction_id uuid references public.factions (id) on delete set null,
  name text not null,
  slug text not null unique,
  description text not null default '',
  long_description text not null default '',
  symbol text not null,
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  image_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Relações narrativas entre Arcanos e Elementais. Ficam vazias até serem
-- definidas como cânone (a fonte de verdade ainda não as estabelece).
create table public.arcana_elemental_links (
  arcana_id uuid not null references public.arcanas (id) on delete cascade,
  elemental_id uuid not null references public.elementals (id) on delete cascade,
  relation text not null check (relation in ('tension', 'affinity', 'complement')),
  description text not null default '',
  created_at timestamptz not null default now(),
  primary key (arcana_id, elemental_id)
);

-- ------------------------------------------------------------------
-- Perfis (1:1 com auth.users — sem passwords guardadas aqui)
-- ------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  email text,
  avatar_url text,
  level int not null default 1 check (level >= 1),
  experience_points int not null default 0 check (experience_points >= 0),
  -- XP histórico importado (ex.: progresso anterior do dono da coleção)
  base_experience_points int not null default 0 check (base_experience_points >= 0),
  faction_id uuid references public.factions (id) on delete set null,
  bio text check (char_length(bio) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_email_lower_idx on public.profiles (lower(email));
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- Jogos
-- ------------------------------------------------------------------
create table public.games (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  cover_url text,
  genre text not null,
  min_players int not null check (min_players >= 1),
  max_players int not null check (max_players >= min_players),
  duration_minutes int not null check (duration_minutes > 0),
  complexity text not null default 'Leve',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index games_genre_idx on public.games (genre);
create trigger games_updated_at before update on public.games
  for each row execute function public.set_updated_at();

create table public.game_ownerships (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  copy_number int not null default 1 check (copy_number >= 1),
  acquired_at date,
  condition public.ownership_condition not null default 'good',
  notes text check (char_length(notes) <= 500),
  unique (game_id, user_id, copy_number)
);
create index game_ownerships_user_idx on public.game_ownerships (user_id);

create table public.user_game_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id uuid not null references public.games (id) on delete cascade,
  status public.game_status not null default 'unplayed',
  is_favorite boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, game_id)
);
create trigger user_game_status_updated_at before update on public.user_game_status
  for each row execute function public.set_updated_at();

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  played_at date not null,
  duration_minutes int check (duration_minutes > 0 and duration_minutes <= 1440),
  players_count int check (players_count >= 1 and players_count <= 99),
  rating int check (rating between 1 and 5),
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now()
);
create index game_sessions_user_idx on public.game_sessions (user_id, played_at desc);
create index game_sessions_game_idx on public.game_sessions (game_id);

-- ------------------------------------------------------------------
-- Eventos
-- ------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  location text not null default '',
  event_date timestamptz not null,
  image_url text,
  created_at timestamptz not null default now()
);

create table public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (event_id, user_id)
);

-- ------------------------------------------------------------------
-- Conquistas
-- ------------------------------------------------------------------
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  icon text not null,
  requirement_type public.achievement_requirement not null,
  requirement_value int not null check (requirement_value >= 1)
);

create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

-- ------------------------------------------------------------------
-- Configuração privada (apenas service role / funções security definer)
-- ------------------------------------------------------------------
create table public.app_config (
  key text primary key,
  value text not null
);

-- Inventário inicial do dono da coleção, aplicado quando a conta existir.
create table public.owner_inventory (
  game_slug text primary key references public.games (slug) on update cascade on delete cascade,
  copies int not null default 1 check (copies >= 1),
  condition public.ownership_condition not null default 'good',
  acquired_at date
);
