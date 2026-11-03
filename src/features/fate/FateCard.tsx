import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion';
import type { CSSProperties, PointerEvent } from 'react';
import { CARD_BACK_ART } from '@/assets/cards';
import type { FateCardData } from './cards';

interface FateCardProps {
  /** Omit to render the neutral back only; the front art is then not in the DOM at all. */
  card?: FateCardData;
  /** Y rotation in degrees. 0/360 shows the back, 180 shows the front. */
  flipY?: MotionValue<number>;
  interactive?: boolean;
  /** Colour of the halo; defaults to a neutral iridescent halo. */
  aura?: string | null;
  className?: string;
}

const SPRING = { stiffness: 170, damping: 16, mass: 0.6 };

export function FateCard({ card, flipY, interactive = true, aura, className }: FateCardProps) {
  const ownFlip = useMotionValue(0);
  const flip = flipY ?? ownFlip;
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotX = useSpring(useTransform(py, [0, 1], [12, -12]), SPRING);
  const rotY = useSpring(useTransform(px, [0, 1], [-14, 14]), SPRING);
  const sx = useTransform(px, (v) => v * 100);
  const sy = useTransform(py, (v) => v * 100);
  const shine = useMotionTemplate`radial-gradient(circle at ${sx}% ${sy}%, rgba(255,255,255,0.32), transparent 55%)`;

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!interactive || e.pointerType === 'touch') return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  const style = { '--aura': aura ?? undefined } as CSSProperties;

  return (
    <div
      className={`fcard ${className ?? ''}`}
      data-interactive={interactive}
      data-aura={aura ? 'faction' : 'neutral'}
      style={style}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <span className="fcard__floor" aria-hidden />
      <span className="fcard__aura" aria-hidden />
      <motion.div className="fcard__tilt" style={{ rotateX: interactive ? rotX : 0, rotateY: interactive ? rotY : 0 }}>
        <motion.div className="fcard__flip" style={{ rotateY: flip }}>
          <div className="fcard__face fcard__face--back">
            <img src={CARD_BACK_ART} alt="" draggable={false} />
            <span className="fcard__foil" aria-hidden />
            <motion.span className="fcard__shine" style={{ backgroundImage: shine }} aria-hidden />
          </div>
          {card && (
            <div className="fcard__face fcard__face--front">
              <img src={card.image} alt={card.numeral ? `${card.numeral} — ${card.title}` : card.title} draggable={false} />
              <motion.span className="fcard__shine" style={{ backgroundImage: shine }} aria-hidden />
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
