import { motion } from 'framer-motion';
import { Logo } from '@/components/brand/Logo';
import { useI18n } from '@/i18n';

interface FateDrawIntroProps {
  onStart: () => void;
}

const EASE = [0.16, 1, 0.3, 1] as const;

/** Screen 01: the invitation. */
export function FateDrawIntro({ onStart }: FateDrawIntroProps) {
  const { t } = useI18n();
  return (
    <>
      <div className="fate-portal" aria-hidden>
        <i className="fate-portal__ring fate-portal__ring--1" />
        <i className="fate-portal__ring fate-portal__ring--2" />
        <i className="fate-portal__ring fate-portal__ring--3" />
        <i className="fate-portal__core" />
      </div>
      <motion.div className="fate-invite__body" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, ease: EASE }}>
        <Logo variant="primary" className="fate-logo" />
        <h1 className="fate-title">{t('fate.introTitle')}</h1>
        <p className="fate-kicker">{t('fate.introKicker')}</p>
        <p className="fate-quote">{t('fate.introQuote')}</p>
        <button type="button" className="fate-btn fate-btn--primary fate-btn--xl" onClick={onStart}>
          {t('fate.introCta')}
        </button>
      </motion.div>
    </>
  );
}
