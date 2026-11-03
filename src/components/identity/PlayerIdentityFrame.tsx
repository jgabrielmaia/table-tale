import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { CardArtKey } from '@/assets/cards';
import { getFateCard } from '@/features/fate/cards';
import { FrameArt } from './frameArt';
import { FRAME_THEMES, compactTitle } from './frameThemes';
import './identity.css';

export type FrameSize = 'xs' | 'sm' | 'xl';

interface PlayerIdentityFrameProps {
  cardId: string;
  /** Must match the wrapped Avatar's size so the ring hugs it. */
  size?: FrameSize;
  /** Force the short title; defaults to on for xs/sm. */
  compact?: boolean;
  children: ReactNode;
  className?: string;
}

/** Seasonal avatar frame: faction + card identity + exact card title, wrapping any avatar without covering it. */
export function PlayerIdentityFrame({ cardId, size = 'sm', compact, children, className }: PlayerIdentityFrameProps) {
  const card = getFateCard(cardId);
  const [open, setOpen] = useState(false);
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  if (!card) return <>{children}</>;

  const theme = FRAME_THEMES[card.id as CardArtKey];
  const isCompact = compact ?? size !== 'xl';
  const label = isCompact ? compactTitle(card.title) : card.title;
  const hasTip = isCompact && label !== card.title;
  const vars = { '--a': theme.a, '--b': theme.b } as CSSProperties;

  return (
    <span
      className={`idf ${className ?? ''}`}
      data-size={size}
      data-faction={card.faction}
      data-card={card.id}
      data-ornament={theme.ornament}
      data-open={open || undefined}
      style={vars}
      onClick={() => {
        if (!hasTip) return;
        setOpen(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setOpen(false), 2500);
      }}
    >
      <span className="idf__stage">
        <FrameArt className="idf__art" theme={theme} />
        {children}
      </span>
      <span className="idf__plate">
        <span aria-hidden="true">{label}</span>
        <span className="sr-only">{card.title}</span>
      </span>
      {hasTip && <span className="idf__tip" aria-hidden="true">{card.title}</span>}
    </span>
  );
}
