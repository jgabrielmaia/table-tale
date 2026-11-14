import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { GameGrid } from '@/components/games/GameGrid';
import { Logo } from '@/components/brand/Logo';
import { Scenery } from '@/components/layout/Scenery';
import { ButtonLink, ErrorState, LoadingState } from '@/components/ui';
import { fetchShelfHighlights } from '@/features/games/api';
import { useAuth } from '@/hooks/useAuth';
import { useGames } from '@/hooks/useGames';
import { useI18n } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/queryKeys';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { LibraryGame } from '@/types/domain';
import { highlightNote, highlightsHeading, highlightsSource } from './highlights';

const HIGHLIGHTS = 3;

export function HomePage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { games, isLoading, isError, error } = useGames();
  // The player's last played games, falling back to their communities' and then public favourites (shelf_highlights).
  const highlights = useQuery({
    queryKey: queryKeys.highlights(user?.id ?? null),
    queryFn: () => fetchShelfHighlights(HIGHLIGHTS),
    enabled: isSupabaseConfigured,
  });
  const list = useMemo(() => highlights.data ?? [], [highlights.data]);
  const cards = useMemo(() => {
    const byId = new Map(games.map((g) => [g.id, g]));
    return list.map((h) => byId.get(h.gameId)).filter((g): g is LibraryGame => Boolean(g));
  }, [games, list]);
  const notes = new Map(list.map((h) => [h.gameId, highlightNote(h)]));
  const heading = highlightsHeading(highlightsSource(list));

  return (
    <>
      <section className="hero">
        <Scenery />
        <div className="container hero-inner">
          <div className="hero-copy">
            <p className="eyebrow eyebrow-light">{t('home.eyebrow')}</p>
            <h1>{t('home.title')}</h1>
            <p className="lead">{t('home.lead')}</p>
            <div className="hero-actions">
              <ButtonLink to="/games" variant="primary">{t('home.ctaExplore')}</ButtonLink>
              <ButtonLink to="/lore" variant="teal">{t('home.ctaLore')}</ButtonLink>
              {!user && <ButtonLink to="/login" variant="gold">{t('common.signIn')}</ButtonLink>}
            </div>
          </div>
          <div className="hero-art">
            <Logo variant="primary" className="hero-logo" />
          </div>
        </div>
      </section>

      <section className="container section" aria-labelledby="destaques-title">
        <div className="section-head">
          <div>
            <p className="eyebrow">{t(heading.eyebrow)}</p>
            <h2 id="destaques-title">{t(heading.title)}</h2>
          </div>
          <Link to="/games">{t('home.seeAll')}</Link>
        </div>
        {isLoading || highlights.isLoading ? (
          <LoadingState variant="cards" count={HIGHLIGHTS} />
        ) : isError || highlights.isError ? (
          <ErrorState message={errorMessage(error ?? highlights.error)} />
        ) : (
          <GameGrid games={cards} label={t('home.highlightsLabel')} noteOf={(g) => notes.get(g.id)} />
        )}
      </section>
    </>
  );
}
