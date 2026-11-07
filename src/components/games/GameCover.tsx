import { useEffect, useMemo, useState } from 'react';
import { COVER_TONES, coverSvg, gameStyle, svgToDataUri } from '@/lib/cover';
import { t } from '@/i18n';
import { cn } from '@/lib/format';

export interface GameCoverProps {
  slug: string;
  title: string;
  coverUrl: string | null;
  className?: string;
  loading?: 'lazy' | 'eager';
}

/** Game cover from storage, falling back to the generated brand illustration. */
export function GameCover({ slug, title, coverUrl, className, loading = 'lazy' }: GameCoverProps) {
  const [failed, setFailed] = useState(false);
  const style = gameStyle(slug);
  const fallback = useMemo(() => svgToDataUri(coverSvg({ slug, title, tone: style.tone, symbol: style.symbol })), [slug, title, style.tone, style.symbol]);
  const hasArtwork = Boolean(coverUrl && !failed);
  const src = hasArtwork ? coverUrl! : fallback;

  useEffect(() => setFailed(false), [coverUrl]);

  return (
    <img
      src={src}
      alt={hasArtwork ? t('cover.productAlt', { title }) : t('cover.alt', { title, tone: t(`tone.${style.tone}`) })}
      width={600}
      height={400}
      loading={loading}
      decoding="async"
      className={cn(className, hasArtwork && 'game-cover-real')}
      onError={() => setFailed(true)}
    />
  );
}

export const coverAccent = (slug: string) => COVER_TONES[gameStyle(slug).tone].accent;
