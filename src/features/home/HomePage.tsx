import { Link } from 'react-router-dom';
import { GameGrid } from '@/components/games/GameGrid';
import { Emblem, Scenery } from '@/components/layout/Brand';
import { ButtonLink, ErrorState, LoadingState } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useGames } from '@/hooks/useGames';
import { errorMessage } from '@/lib/errors';

export function HomePage() {
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
            <p className="eyebrow eyebrow-light">Make stories. Play them.</p>
            <h1>Cada jogo guarda uma história. Cada partida escreve outra.</h1>
            <p className="lead">
              A Table Tale é uma biblioteca viva de jogos e histórias — um portal entre a mesa e o mundo. Explora a coleção, regista as tuas sessões e
              descobre as duas filosofias — Arcanos e Elementais — que dividem o mundo de Table Tale.
            </p>
            <div className="hero-actions">
              <ButtonLink to="/library" variant="primary">Explorar a coleção</ButtonLink>
              <ButtonLink to="/lore" variant="outline-light">Conhecer o universo</ButtonLink>
              {!user && <ButtonLink to="/login" variant="gold">Entrar</ButtonLink>}
            </div>
          </div>
          <div className="hero-art">
            <div className="hero-emblem"><Emblem /></div>
            <dl className="hero-stats" aria-label="A biblioteca em números">
              <div><dt>Jogos na estante</dt><dd>{isLoading ? '…' : games.length}</dd></div>
              <div><dt>Géneros</dt><dd>{isLoading ? '…' : new Set(games.map((g) => g.genre)).size}</dd></div>
              <div><dt>{user ? 'Os teus favoritos' : 'Facções'}</dt><dd>{user ? favourites : 2}</dd></div>
            </dl>
          </div>
        </div>
      </section>

      <section className="container section" aria-labelledby="destaques-title">
        <div className="section-head">
          <div>
            <p className="eyebrow">Na mesa esta semana</p>
            <h2 id="destaques-title">Destaques da estante</h2>
          </div>
          <Link to="/library">Ver todos os jogos →</Link>
        </div>
        {isLoading ? (
          <LoadingState variant="cards" count={3} />
        ) : isError ? (
          <ErrorState message={errorMessage(error)} />
        ) : (
          <GameGrid games={highlights} label="Destaques" />
        )}
      </section>
    </>
  );
}
