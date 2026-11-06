import { useEffect, useState } from 'react';

export type GameTimerStatus = 'running' | 'paused' | 'stopped';

export interface GameTimerState {
  status: GameTimerStatus;
  startedAt: string;
  endedAt: string | null;
  elapsedMs: number;
  resumedAt: string | null;
}

const storageKey = (userId: string | undefined, gameId: string) =>
  userId ? `table-tale:game-timer:${userId}:${gameId}` : null;

function readTimer(key: string | null): GameTimerState | null {
  if (!key || typeof window === 'undefined') return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? 'null') as GameTimerState | null;
    if (!value || !['running', 'paused', 'stopped'].includes(value.status)) return null;
    if (!Number.isFinite(Date.parse(value.startedAt)) || !Number.isFinite(value.elapsedMs) || value.elapsedMs < 0) return null;
    if (value.status === 'running' && !Number.isFinite(Date.parse(value.resumedAt ?? ''))) return null;
    if (value.status === 'stopped' && !Number.isFinite(Date.parse(value.endedAt ?? ''))) return null;
    return value;
  } catch {
    return null;
  }
}

function elapsedAt(timer: GameTimerState, timestamp: number) {
  return timer.elapsedMs + (timer.status === 'running' ? Math.max(0, timestamp - Date.parse(timer.resumedAt ?? '')) : 0);
}

export function useGameTimer(userId: string | undefined, gameId: string) {
  const key = storageKey(userId, gameId);
  const [stored, setStored] = useState(() => ({ key, timer: readTimer(key) }));
  const timer = stored.key === key ? stored.timer : null;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (stored.key !== key) setStored({ key, timer: readTimer(key) });
  }, [key, stored.key]);

  useEffect(() => {
    if (!key || stored.key !== key) return;
    try {
      if (stored.timer) window.localStorage.setItem(key, JSON.stringify(stored.timer));
      else window.localStorage.removeItem(key);
    } catch {
      // The timer remains usable for this page even when browser storage is unavailable.
    }
  }, [key, stored]);

  useEffect(() => {
    if (!key) return;
    const sync = (event: StorageEvent) => {
      if (event.key === key) setStored({ key, timer: readTimer(key) });
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [key]);

  useEffect(() => {
    if (timer?.status !== 'running') return;
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [timer?.status]);

  const elapsedMs = timer ? elapsedAt(timer, now) : 0;

  const start = () => {
    const timestamp = new Date().toISOString();
    setNow(Date.now());
    setStored({
      key,
      timer: { status: 'running', startedAt: timestamp, endedAt: null, elapsedMs: 0, resumedAt: timestamp },
    });
  };

  const pause = () => {
    if (!timer || timer.status !== 'running') return;
    const timestamp = Date.now();
    setNow(timestamp);
    setStored({ key, timer: { ...timer, status: 'paused', elapsedMs: elapsedAt(timer, timestamp), resumedAt: null } });
  };

  const resume = () => {
    if (!timer || timer.status !== 'paused') return;
    const timestamp = new Date().toISOString();
    setNow(Date.now());
    setStored({ key, timer: { ...timer, status: 'running', resumedAt: timestamp } });
  };

  const stop = () => {
    if (!timer || timer.status === 'stopped') return timer;
    const timestamp = Date.now();
    const stopped: GameTimerState = {
      ...timer,
      status: 'stopped',
      endedAt: new Date(timestamp).toISOString(),
      elapsedMs: elapsedAt(timer, timestamp),
      resumedAt: null,
    };
    setNow(timestamp);
    setStored({ key, timer: stopped });
    return stopped;
  };

  const clear = () => setStored({ key, timer: null });

  return { timer, elapsedMs, start, pause, resume, stop, clear };
}