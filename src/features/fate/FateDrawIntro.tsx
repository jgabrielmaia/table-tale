import { motion } from 'framer-motion';
import { Emblem } from '@/components/layout/Brand';

interface FateDrawIntroProps {
  onStart: () => void;
}

const EASE = [0.16, 1, 0.3, 1] as const;

/** Screen 01: the invitation. */
export function FateDrawIntro({ onStart }: FateDrawIntroProps) {
  return (
    <>
      <div className="fate-portal" aria-hidden>
        <i className="fate-portal__ring fate-portal__ring--1" />
        <i className="fate-portal__ring fate-portal__ring--2" />
        <i className="fate-portal__ring fate-portal__ring--3" />
        <i className="fate-portal__core" />
      </div>
      <motion.div className="fate-invite__body" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, ease: EASE }}>
        <Emblem className="fate-emblem" />
        <p className="fate-brand">Table Tale</p>
        <h1 className="fate-title">The Fate Draw</h1>
        <p className="fate-kicker">Your story starts here.</p>
        <p className="fate-quote">“Nine cards. Two factions. One destiny.”</p>
        <button type="button" className="fate-btn fate-btn--primary fate-btn--xl" onClick={onStart}>
          Discover your fate
        </button>
      </motion.div>
    </>
  );
}
