import { useState } from 'react';
import { Button, Icon } from '@/components/ui';
import { useGameTimer, type GameTimerState } from '@/hooks/useGameTimer';
import { t } from '@/i18n';

export interface TimedSession {
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
}

interface GameTimerProps {
  userId: string;
  gameId: string;
  onComplete: (session: TimedSession) => Promise<void>;
}

function formatElapsed(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

export function GameTimer({ userId, gameId, onComplete }: GameTimerProps) {
  const { timer, elapsedMs, start, pause, resume, stop, clear } = useGameTimer(userId, gameId);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const save = async (stopped: GameTimerState) => {
    setSaving(true);
    setSaveFailed(false);
    try {
      await onComplete({
        startedAt: stopped.startedAt,
        endedAt: stopped.endedAt ?? new Date().toISOString(),
        durationMinutes: Math.max(1, Math.min(1440, Math.ceil(stopped.elapsedMs / 60_000))),
      });
      clear();
    } catch {
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const finish = () => {
    const stopped = stop();
    if (stopped) void save(stopped);
  };

  const retrySave = () => {
    if (timer?.status === 'stopped') void save(timer);
  };

  return (
    <section className="game-timer" aria-labelledby="game-timer-title">
      <div className="game-timer-readout">
        <h2 id="game-timer-title">{t('timer.title')}</h2>
        <output className="game-timer-time" role="timer" aria-label={t('timer.elapsed', { time: formatElapsed(elapsedMs) })}>
          {formatElapsed(elapsedMs)}
        </output>
        <p className="game-timer-status" role="status" aria-live="polite">
          {saving ? t('timer.saving') : saveFailed ? t('timer.saveError') : t(`timer.status.${timer?.status ?? 'idle'}`)}
        </p>
      </div>
      <div className="game-timer-controls">
        {!timer && (
          <Button variant="primary" onClick={start} icon={<Icon name="play" />}>
            {t('timer.start')}
          </Button>
        )}
        {timer?.status === 'running' && (
          <>
            <Button variant="secondary" onClick={pause} icon={<Icon name="pause" />}>
              {t('timer.pause')}
            </Button>
            <Button variant="outline-light" onClick={finish} loading={saving} icon={<Icon name="stop" />}>
              {t('timer.stop')}
            </Button>
          </>
        )}
        {timer?.status === 'paused' && (
          <>
            <Button variant="primary" onClick={resume} icon={<Icon name="play" />}>
              {t('timer.resume')}
            </Button>
            <Button variant="outline-light" onClick={finish} loading={saving} icon={<Icon name="stop" />}>
              {t('timer.stop')}
            </Button>
          </>
        )}
        {timer?.status === 'stopped' && (
          <Button variant="secondary" onClick={retrySave} loading={saving} icon={<Icon name="check" />}>
            {saveFailed ? t('timer.retry') : t('timer.save')}
          </Button>
        )}
      </div>
    </section>
  );
}