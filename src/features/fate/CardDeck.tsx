import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import { FateCard } from './FateCard';

export interface PickInfo {
  index: number;
  cx: number;
  cy: number;
  width: number;
  rotate: number;
}

interface CardDeckProps {
  count: number;
  pickedIndex: number | null;
  onPick: (info: PickInfo) => void;
}

const MID = 4;

export function CardDeck({ count, pickedIndex, onPick }: CardDeckProps) {
  return (
    <div className="deck" role="group" aria-label="Nine face-down cards">
      {Array.from({ length: count }, (_, i) => {
        const c = i - MID;
        const rot = c * 7;
        const slot = { '--dx': c, '--dy': c * c * 0.035, '--rot': rot, '--z': i + 1 } as CSSProperties;
        const picked = pickedIndex !== null;
        const isPicked = pickedIndex === i;
        return (
          <div className="deck__slot" style={slot} key={i}>
            <motion.div
              initial={{ opacity: 0, y: 80, scale: 0.8 }}
              animate={
                !picked
                  ? { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: { delay: 0.1 + i * 0.07, duration: 0.9, ease: [0.16, 1, 0.3, 1] } }
                  : isPicked
                    ? { opacity: 0, transition: { duration: 0 } }
                    : { opacity: 0, y: -50, scale: 0.55, filter: 'blur(5px)', transition: { duration: 1.7, ease: 'easeInOut' } }
              }
            >
              <div className="deck__float" style={{ animationDelay: `${-i * 0.7}s` }}>
                <button
                  type="button"
                  className="deck__btn"
                  disabled={picked}
                  aria-label={`Face-down card ${i + 1} of ${count}`}
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    onPick({ index: i, cx: r.left + r.width / 2, cy: r.top + r.height / 2, width: e.currentTarget.offsetWidth, rotate: rot });
                  }}
                >
                  <FateCard interactive={!picked} />
                </button>
              </div>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
