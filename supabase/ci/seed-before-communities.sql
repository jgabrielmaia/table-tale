-- CI only: data as it exists BEFORE the community migrations, so the backfill and rollback run on real rows.
-- Owner (owner@ci.test) + two players; owner inventory (catan x2, azul x1); player B owns dixit.
insert into public.games (title, slug, genre, min_players, max_players, duration_minutes) values
  ('Catan', 'catan', 'Strategy', 3, 4, 90),
  ('Azul', 'azul', 'Family', 2, 4, 45),
  ('Dixit', 'dixit', 'Family', 3, 6, 30);
insert into public.app_config (key, value) values ('owner_email', 'owner@ci.test');
insert into public.owner_inventory (game_slug, copies, condition) values ('catan', 2, 'good'), ('azul', 1, 'new');

-- handle_new_user creates the profiles; for the owner it also runs claim_owner (copies the inventory).
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'owner@ci.test'),
  ('00000000-0000-0000-0000-00000000000b', 'b@ci.test'),
  ('00000000-0000-0000-0000-00000000000c', 'c@ci.test');

insert into public.game_ownerships (game_id, user_id)
select id, '00000000-0000-0000-0000-00000000000b' from public.games where slug = 'dixit';

-- Rated sessions, so the reviews backfill has something to bring back: C rated Catan 4 then 5 (latest wins),
-- the owner rated Catan 3; C's Azul session has no rating. (B has no sessions: assert-bgg counts B's genres.)
insert into public.game_sessions (game_id, user_id, played_at, rating)
select g.id, s.user_id::uuid, s.played_at::date, s.rating
from (values
  ('catan', '00000000-0000-0000-0000-00000000000c', '2026-01-10', 4),
  ('catan', '00000000-0000-0000-0000-00000000000c', '2026-02-10', 5),
  ('catan', '00000000-0000-0000-0000-00000000000a', '2026-01-20', 3),
  ('azul',  '00000000-0000-0000-0000-00000000000c', '2026-01-15', null)
) as s(slug, user_id, played_at, rating)
join public.games g on g.slug = s.slug;
