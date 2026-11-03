import { useMemo, useState } from 'react';
import { COVER_TONES, coverSvg, gameStyle, svgToDataUri } from '@/lib/cover';
import { cn } from '@/lib/format';

export interface GameCoverProps {
  slug: string;
  title: string;
  genre: string;
  coverUrl: string | null;
  className?: string;
  loading?: 'lazy' | 'eager';
}

/** Game cover from storage, falling back to the generated brand illustration. */
export function GameCover({ slug, title, genre, coverUrl, className, loading = 'lazy' }: GameCoverProps) {
  const [failed, setFailed] = useState(false);
  const style = gameStyle(slug, genre);
  const fallback = useMemo(() => svgToDataUri(coverSvg({ slug, title, tone: style.tone, symbol: style.symbol })), [slug, title, style.tone, style.symbol]);
  const src = coverUrl && !failed ? coverUrl : fallback;
  return (
    <img
      src={src}
      alt={`Capa ilustrada de ${title}: símbolo dourado sobre fundo ${COVER_TONES[style.tone].name}`}
      width={600}
      height={400}
      loading={loading}
      decoding="async"
      className={cn(className)}
      onError={() => setFailed(true)}
    />
  );
}

export const coverAccent = (slug: string, genre: string) => COVER_TONES[gameStyle(slug, genre).tone].accent;
