import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CardDeck, type PickInfo } from './CardDeck';
import { FATE_CARDS, shuffle, type FateCardData } from './cards';
import { createFateAudio } from './audio';
import { FateBackdrop } from './FateBackdrop';
import { RevealScene, type RevealOrigin } from './RevealScene';
import './fate.css';

type Phase = 'invitation' | 'selection' | 'reveal';

interface Chosen {
  index: number;
  card: FateCardData;
  origin: RevealOrigin;
}

const EASE = [0.16, 1, 0.3, 1] as const;

export function FateDrawPage() {
  const navigate = useNavigate();
  const reduced = useReducedMotion() ?? false;
  const audio = useMemo(() => createFateAudio(), []);
  const [soundOn, setSoundOn] = useState(false);
  const [phase, setPhase] = useState<Phase>('invitation');
  // The face-down deck is dealt once; a click only reveals what was already assigned to that slot.
  const [deal] = useState(() => shuffle(FATE_CARDS));
  const [chosen, setChosen] = useState<Chosen | null>(null);

  useEffect(() => () => audio.dispose(), [audio]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    audio.setEnabled(next);
    if (next) audio.play('ambient');
  };

  const pick = (info: PickInfo) => {
    if (chosen) return;
    const card = deal[info.index];
    if (!card) return;
    audio.play('select');
    setChosen({ index: info.index, card, origin: { cx: info.cx, cy: info.cy, width: info.width, rotate: info.rotate } });
    setPhase('reveal');
  };

  return (
    <main className="fate">
      <FateBackdrop />

      <button type="button" className="fate-sound" aria-pressed={soundOn} onClick={toggleSound}>
        <span aria-hidden>{soundOn ? '♪' : '✕'}</span> Sound {soundOn ? 'on' : 'off'}
      </button>

      <AnimatePresence mode="wait">
        {phase === 'invitation' && (
          <motion.section
            key="invitation"
            className="fate-screen fate-invite"
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <div className="fate-portal" aria-hidden>
              <i className="fate-portal__ring fate-portal__ring--1" />
              <i className="fate-portal__ring fate-portal__ring--2" />
              <i className="fate-portal__ring fate-portal__ring--3" />
              <i className="fate-portal__core" />
            </div>
            <motion.div
              className="fate-invite__body"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: EASE }}
            >
              <h1 className="fate-brand">Table Tale</h1>
              <p className="fate-kicker">Your story starts here.</p>
              <p className="fate-quote">“Nine cards. Two factions. One destiny.”</p>
              <p className="fate-support">
                Every player has a place in this universe. Choose a card and discover where your story begins.
              </p>
              <button type="button" className="fate-btn fate-btn--primary fate-btn--xl" onClick={() => setPhase('selection')}>
                Discover your fate
              </button>
            </motion.div>
          </motion.section>
        )}
      </AnimatePresence>

      {phase !== 'invitation' && (
        <section className="fate-screen fate-select" aria-label="Choose your card">
          <motion.header
            className="fate-select__head"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: phase === 'reveal' ? 0 : 1, y: 0 }}
            transition={{ duration: phase === 'reveal' ? 0.8 : 1, ease: EASE }}
          >
            <h2 className="fate-select__title">Choose your card</h2>
            <p className="fate-select__sub">Trust your instinct. Your story awaits.</p>
          </motion.header>
          <CardDeck count={deal.length} pickedIndex={chosen?.index ?? null} onPick={pick} />
        </section>
      )}

      {chosen && (
        <RevealScene
          card={chosen.card}
          origin={chosen.origin}
          audio={audio}
          reduced={reduced}
          onEnter={() => navigate('/')}
        />
      )}
    </main>
  );
}
