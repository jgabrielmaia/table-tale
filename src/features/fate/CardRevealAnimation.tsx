import { AnimatePresence, animate, motion, useMotionValue, useTransform, type MotionValue, type ValueAnimationTransition } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Avatar } from '@/components/ui';
import { PlayerIdentityFrame } from '@/components/identity/PlayerIdentityFrame';
import { cardTitle, getFaction, type FateCardData } from './cards';
import { useI18n } from '@/i18n';
import { Burst, EnergyField } from './EnergyField';
import { FactionReveal } from './FactionReveal';
import { FateCard } from './FateCard';
import { PosterDialog } from './poster/PosterDialog';

export interface RevealOrigin {
  cx: number;
  cy: number;
  width: number;
  rotate: number;
}

interface CardRevealAnimationProps {
  card: FateCardData;
  /** Where the chosen card was on screen. */
  origin: RevealOrigin;
  reduced: boolean;
  player: { name: string; avatarUrl: string | null };
  seasonName: string;
  /** ISO timestamp of the draw, shown on the poster. */
  discoveredAt?: string;
  onEnter: () => void;
}

type Stage = 'revealing' | 'identity' | 'welcome';

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const NEUTRAL = '#f3ead4';

/** Screens 03-05: reveal sequence, faction/card identity and welcome. The card is fixed before this mounts. */
export function CardRevealAnimation({ card, origin, reduced, player, seasonName, discoveredAt, onEnter }: CardRevealAnimationProps) {
  const { t } = useI18n();
  const faction = getFaction(card.faction);
  const [stage, setStage] = useState<Stage>('revealing');
  const [burstKey, setBurstKey] = useState(0);
  const [accent, setAccent] = useState<string | null>(null);
  const [posterOpen, setPosterOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const flyScale = useMotionValue(1);
  const flyRotate = useMotionValue(0);
  const pop = useMotionValue(1);
  const lift = useMotionValue(0);
  const rotY = useMotionValue(0);
  const charge = useMotionValue(0);
  const dim = useMotionValue(0);
  const flash = useMotionValue(0);
  const tint = useMotionValue(0);
  const cardScale = useTransform(() => flyScale.get() * pop.get());
  const cardY = useTransform(() => y.get() + lift.get());

  // Start the card exactly where the player clicked it.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    x.set(origin.cx - (r.left + r.width / 2));
    y.set(origin.cy - (r.top + r.height / 2));
    flyScale.set(origin.width / el.offsetWidth);
    flyRotate.set(origin.rotate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let alive = true;
    let fired = false;
    const k = reduced ? 0.35 : 1;
    const stops: Array<() => void> = [];
    const go = (mv: MotionValue<number>, to: number | number[], opts: ValueAnimationTransition<number>) => {
      const c = animate(mv, to as number, opts);
      stops.push(() => c.stop());
      return c;
    };
    const wait = (s: number) =>
      new Promise<void>((res) => {
        const id = window.setTimeout(res, s * k * 1000);
        stops.push(() => window.clearTimeout(id));
      });

    const fire = () => {
      setAccent(card.glow);
      setBurstKey((n) => n + 1);
      go(flash, [0, 1, 0], { duration: 1.1 * k, times: [0, 0.12, 1], ease: 'easeOut' });
      go(tint, 1, { duration: 1.6 * k });
      go(pop, [1, 1.06, 1], { duration: 0.9 * k, ease: 'easeOut' });
      go(charge, 0.4, { duration: 1.2 * k });
    };
    const off = rotY.on('change', (v) => {
      if (!fired && alive && v >= 450) {
        fired = true;
        fire();
      }
    });

    const main = async () => {
      rotY.set(0);
      go(dim, 1, { duration: 1.5 * k, ease: 'easeOut' });
      const fly = { duration: 1.5 * k, ease: EASE_OUT } as const;
      go(x, 0, fly);
      go(y, 0, fly);
      go(flyScale, 1, fly);
      go(flyRotate, 0, fly);
      await wait(1.1);
      if (!alive) return;
      go(charge, 1, { duration: 1.8 * k, ease: 'easeIn' });
      go(lift, -12, { duration: 1.8 * k, ease: 'easeInOut' });
      await wait(1.3);
      if (!alive) return;
      await go(rotY, 540, { duration: 1.9 * k, ease: [0.5, 0, 0.2, 1] });
      if (!alive) return;
      go(lift, 0, { duration: 0.9 * k, ease: EASE_OUT });
      await wait(0.8);
      if (!alive) return;
      rotY.set(180);
      setStage('identity');
    };
    void main();

    return () => {
      alive = false;
      off();
      stops.forEach((s) => s());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const vars = { '--fx': accent ?? NEUTRAL, '--faction-gradient': faction.gradient } as CSSProperties;
  const panelMotion = {
    className: 'fate-panel',
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -16 },
    transition: { duration: 0.7, ease: EASE_OUT },
  };

  return (
    <div className="fate-scene" data-stage={stage} style={vars}>
      <motion.div className="fate-scene__dim" style={{ opacity: dim }} />
      <motion.div className="fate-scene__tint" style={{ opacity: tint }} />
      <motion.div className="fate-scene__flash" style={{ opacity: flash }} />

      <div className="fate-scene__content">
        <motion.div layout="position" className="fate-scene__card" ref={wrapRef} transition={{ duration: 0.9, ease: EASE_OUT }}>
          <EnergyField charge={charge} />
          <motion.div className="fate-scene__fly" style={{ x, y: cardY, scale: cardScale, rotate: flyRotate }}>
            <FateCard card={card} flipY={rotY} interactive={stage !== 'revealing'} aura={accent} />
          </motion.div>
          {burstKey > 0 && <Burst key={burstKey} />}
        </motion.div>

        <AnimatePresence mode="wait">
          {stage === 'identity' && (
            <motion.div key="identity" {...panelMotion}>
              <FactionReveal card={card} onContinue={() => setStage('welcome')} />
            </motion.div>
          )}
          {stage === 'welcome' && (
            <motion.div key="welcome" {...panelMotion}>
              <h2 className="fate-welcome">{t('fate.welcome')}</h2>
              <p className="fate-motto">{t('fate.revealed')}</p>
              <ul className="fate-chips">
                <li className="fate-chip fate-chip--faction">{faction.name}</li>
                <li className="fate-chip">{card.numeral ? `${card.numeral} — ` : ''}{cardTitle(card)}</li>
              </ul>
              <div className="fate-preview">
                <PlayerIdentityFrame cardId={card.id} size="xl">
                  <Avatar name={player.name} src={player.avatarUrl} size="xl" decorative />
                </PlayerIdentityFrame>
                <p className="fate-preview__label">{t('fate.frameLabel')}<br /><span>{seasonName}</span></p>
              </div>
              <div className="fate-actions">
                <button type="button" className="fate-btn fate-btn--primary" onClick={onEnter}>
                  {t('fate.enter')}
                </button>
                <button type="button" className="fate-btn" onClick={() => setPosterOpen(true)}>
                  {t('fate.share')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {posterOpen && (
        <PosterDialog
          open
          onClose={() => setPosterOpen(false)}
          input={{ card, playerName: player.name, avatarUrl: player.avatarUrl, seasonName, discoveredAt }}
        />
      )}
    </div>
  );
}
