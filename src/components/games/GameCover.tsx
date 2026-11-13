import { useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  // The URL that failed to load: a new cover URL gets a fresh try.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const ref = useRef<HTMLImageElement>(null);
  const style = gameStyle(slug);
  const fallback = useMemo(() => svgToDataUri(coverSvg({ slug, title, tone: style.tone, symbol: style.symbol })), [slug, title, style.tone, style.symbol]);
  const hasArtwork = Boolean(coverUrl && coverUrl !== failedUrl);
  const src = hasArtwork ? coverUrl! : fallback;

  // A cover the browser already failed to load (cached error, blocked request) can report the error before React
  // listens, e.g. when coming back to a page. A finished image with no pixels is a failure too.
  useLayoutEffect(() => {
    const img = ref.current;
    if (hasArtwork && img?.complete && img.naturalWidth === 0) setFailedUrl(coverUrl);
  }, [hasArtwork, coverUrl]);

  return (
    <img
      ref={ref}
      src={src}
      alt={hasArtwork ? t('cover.productAlt', { title }) : t('cover.alt', { title, tone: t(`tone.${style.tone}`) })}
      width={600}
      height={400}
      loading={loading}
      decoding="async"
      className={cn(className, hasArtwork && 'game-cover-real')}
      onError={() => setFailedUrl(coverUrl)}
    />
  );
}

export const coverAccent = (slug: string) => COVER_TONES[gameStyle(slug).tone].accent;
