import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { GameGrid } from '@/components/games/GameGrid';
import { Logo } from '@/components/brand/Logo';
import { Scenery } from '@/components/layout/Scenery';
import { ButtonLink, ErrorState, LoadingState } from '@/components/ui';
import { fetchShelfEntries } from '@/features/games/api';
import { useAuth } from '@/hooks/useAuth';
import { useGames } from '@/hooks/useGames';
import { useI18n } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/queryKeys';
import { isSupabaseConfigured } from '@/lib/supabase';

export function HomePage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { games, isLoading, isError, error } = useGames();
  const shelves = useQuery({ queryKey: queryKeys.shelves, queryFn: fetchShelfEntries, enabled: isSupabaseConfigured });
  // Only games that sit on some community shelf: the catalogue itself is never browsed.
  const highlights = useMemo(() => {
    const onShelves = new Set((shelves.data ?? []).map((e) => e.gameId));
    return games.filter((g) => onShelves.has(g.id)).slice(0, 3);
  }, [games, shelves.data]);

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
            <p className="eyebrow">{t('home.weekEyebrow')}</p>
            <h2 id="destaques-title">{t('home.highlights')}</h2>
          </div>
          <Link to="/games">{t('home.seeAll')}</Link>
        </div>
        {isLoading || shelves.isLoading ? (
          <LoadingState variant="cards" count={3} />
        ) : isError || shelves.isError ? (
          <ErrorState message={errorMessage(error ?? shelves.error)} />
        ) : (
          <GameGrid games={highlights} label={t('home.highlightsLabel')} />
        )}
      </section>
    </>
  );
}
