import { type CSSProperties, type ReactNode } from 'react';
import type { CardArtKey } from '@/assets/cards';
import { cardTitle, getFateCard } from '@/features/fate/cards';
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
  if (!card) return <>{children}</>;

  const theme = FRAME_THEMES[card.id as CardArtKey];
  const isCompact = compact ?? size !== 'xl';
  const title = cardTitle(card);
  const label = isCompact ? compactTitle(title) : title;
  const vars = { '--a': theme.a, '--b': theme.b } as CSSProperties;

  return (
    <span
      className={`idf ${className ?? ''}`}
      data-size={size}
      data-faction={card.faction}
      data-card={card.id}
      data-ornament={theme.ornament}
      style={vars}
    >
      <span className="idf__stage">
        <FrameArt className="idf__art" theme={theme} />
        {children}
      </span>
      <span className="idf__plate">
        <span aria-hidden="true">{label}</span>
        <span className="sr-only">{title}</span>
      </span>
    </span>
  );
}
