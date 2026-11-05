alter table public.game_sessions
  add column started_at timestamptz,
  add column ended_at timestamptz,
  add constraint game_sessions_timer_times_check check (
    (started_at is null and ended_at is null)
    or (started_at is not null and ended_at is not null and ended_at >= started_at)
  );