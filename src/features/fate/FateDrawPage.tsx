import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { BrandDefs } from '@/components/layout/Brand';
import { useAuth } from '@/hooks/useAuth';
import { useFate } from '@/hooks/useFate';
import { useProfile } from '@/hooks/useProfile';
import { errorMessage } from '@/lib/errors';
import { isSupabaseConfigured } from '@/lib/supabase';
import { createFateAudio } from './audio';
import { CardRevealAnimation, type RevealOrigin } from './CardRevealAnimation';
import { CardSelectionGrid, type PickInfo } from './CardSelectionGrid';
import { FATE_CARDS, getFateCard, type FateCardData } from './cards';
import { FateBackdrop } from './FateBackdrop';
import { FateDrawIntro } from './FateDrawIntro';
import './fate.css';

type Phase = 'invitation' | 'selection';

interface Chosen {
  card: FateCardData;
  origin: RevealOrigin;
}

const EASE = [0.16, 1, 0.3, 1] as const;

export function FateDrawPage() {
  const navigate = useNavigate();
  const reduced = useReducedMotion() ?? false;
  const audio = useMemo(() => createFateAudio(), []);
  const { user } = useAuth();
  const { profile } = useProfile();
  const fate = useFate();
  const [soundOn, setSoundOn] = useState(false);
  const [phase, setPhase] = useState<Phase>('invitation');
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [chosen, setChosen] = useState<Chosen | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => audio.dispose(), [audio]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    audio.setEnabled(next);
    if (next) audio.play('ambient');
  };

  const pick = async (info: PickInfo) => {
    if (pickedIndex !== null) return;
    setPickedIndex(info.index);
    setError(null);
    audio.play('select');
    try {
      // The server picks the card; the face-down slot the player clicked has no influence on it.
      const { identity, alreadyDrawn } = await fate.draw.mutateAsync();
      if (alreadyDrawn) {
        navigate('/profile', { replace: true });
        return;
      }
      const card = getFateCard(identity.cardId);
      if (!card) throw new Error('The draw returned an unknown card.');
      setChosen({ card, origin: { cx: info.cx, cy: info.cy, width: info.width, rotate: info.rotate } });
    } catch (e) {
      setPickedIndex(null);
      setError(errorMessage(e));
    }
  };

  const shell = (children: React.ReactNode) => (
    <main className="fate">
      <BrandDefs />
      <FateBackdrop />
      <section className="fate-screen">{children}</section>
    </main>
  );

  if (!isSupabaseConfigured) {
    return shell(<p className="fate-support">The Fate Draw needs the Table Tale backend, which is not configured.</p>);
  }
  if (fate.state === 'loading' || fate.season.isLoading) {
    return shell(<p className="fate-support" role="status">Opening the table…</p>);
  }
  // Players who already hold this season's card never see the draw again.
  if (fate.active && !chosen && pickedIndex === null) return <Navigate to="/profile" replace />;
  if (!fate.season.data && !chosen) {
    return shell(
      <>
        <p className="fate-support">No season is open right now. Your next draw will be available when the next season begins.</p>
        <Link className="fate-btn" to="/profile">Back to my profile</Link>
      </>,
    );
  }

  return (
    <main className="fate">
      <BrandDefs />
      <FateBackdrop />

      <button type="button" className="fate-sound" aria-pressed={soundOn} onClick={toggleSound}>
        <span aria-hidden>{soundOn ? '♪' : '✕'}</span> Sound {soundOn ? 'on' : 'off'}
      </button>

      <AnimatePresence mode="wait">
        {phase === 'invitation' && (
          <motion.section key="invitation" className="fate-screen fate-invite" exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.7, ease: EASE }}>
            <FateDrawIntro onStart={() => setPhase('selection')} />
          </motion.section>
        )}
      </AnimatePresence>

      {phase === 'selection' && (
        <section className="fate-screen fate-select" aria-label="Choose your card">
          <motion.header
            className="fate-select__head"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: pickedIndex !== null ? 0 : 1, y: 0 }}
            transition={{ duration: pickedIndex !== null ? 0.8 : 1, ease: EASE }}
          >
            <h2 className="fate-select__title">Choose your card</h2>
            <p className="fate-select__sub">Trust your instinct. Your story awaits.</p>
            {error && <p className="fate-error" role="alert">{error}</p>}
          </motion.header>
          <CardSelectionGrid count={FATE_CARDS.length} pickedIndex={pickedIndex} hidePicked={chosen !== null} onPick={(i) => void pick(i)} />
        </section>
      )}

      {chosen && (
        <CardRevealAnimation
          card={chosen.card}
          origin={chosen.origin}
          audio={audio}
          reduced={reduced}
          player={{ name: profile.data?.displayName || user?.email?.split('@')[0] || 'Player', avatarUrl: profile.data?.avatarUrl ?? null }}
          seasonName={fate.season.data?.name ?? 'This season'}
          onEnter={() => navigate('/profile')}
        />
      )}
    </main>
  );
}
