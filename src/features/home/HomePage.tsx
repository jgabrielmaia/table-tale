import { Link } from 'react-router-dom';
import { GameGrid } from '@/components/games/GameGrid';
import { Logo } from '@/components/brand/Logo';
import { Scenery } from '@/components/layout/Scenery';
import { ButtonLink, ErrorState, LoadingState } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useGames } from '@/hooks/useGames';
import { useI18n } from '@/i18n';
import { errorMessage } from '@/lib/errors';

export function HomePage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { games, isLoading, isError, error } = useGames();
  const favourites = games.filter((g) => g.isFavorite).length;
  const highlights = games.slice(0, 3);

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
              <ButtonLink to="/library" variant="primary">{t('home.ctaExplore')}</ButtonLink>
              <ButtonLink to="/lore" variant="teal">{t('home.ctaLore')}</ButtonLink>
              {!user && <ButtonLink to="/login" variant="gold">{t('common.signIn')}</ButtonLink>}
            </div>
          </div>
          <div className="hero-art">
            <Logo variant="primary" className="hero-logo" />
            <dl className="hero-stats" aria-label={t('home.statsAria')}>
              <div><dt>{t('home.statGames')}</dt><dd>{isLoading ? '…' : games.length}</dd></div>
              <div><dt>{t('home.statCategories')}</dt><dd>{isLoading ? '…' : new Set(games.flatMap((g) => g.categories)).size}</dd></div>
              <div><dt>{user ? t('home.statFavorites') : t('home.statFactions')}</dt><dd>{user ? favourites : 2}</dd></div>
            </dl>
          </div>
        </div>
      </section>

      <section className="container section" aria-labelledby="destaques-title">
        <div className="section-head">
          <div>
            <p className="eyebrow">{t('home.weekEyebrow')}</p>
            <h2 id="destaques-title">{t('home.highlights')}</h2>
          </div>
          <Link to="/library">{t('home.seeAll')}</Link>
        </div>
        {isLoading ? (
          <LoadingState variant="cards" count={3} />
        ) : isError ? (
          <ErrorState message={errorMessage(error)} />
        ) : (
          <GameGrid games={highlights} label={t('home.highlightsLabel')} />
        )}
      </section>
    </>
  );
}
