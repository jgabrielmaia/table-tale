import { formatNumber } from '@/lib/format';
import { t } from '@/i18n';
import type { BggLink, BggThing } from '@/types/bgg';
import { BGG_URL, BggCredit } from './BggCredit';

/** BGG sends 0 for "unknown". The values are shown as BGG gives them; unknown ones become a dash. */
const known = (n: number | null | undefined) => (n ? n : null);
const names = (links: BggLink[]) => links.map((l) => l.value).join(', ');

export const bggPageUrl = (thing: Pick<BggThing, 'id' | 'type'>) =>
  `${BGG_URL}/${thing.type === 'boardgameexpansion' ? 'boardgameexpansion' : 'boardgame'}/${thing.id}`;

/** BoardGameGeek data of a game: statistics, credits, categories and mechanics, with the required attribution. */
export function BggFacts({ thing, headingLevel = 3 }: { thing: BggThing; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const { stats } = thing;
  const overall = stats.ranks.find((r) => r.name === 'boardgame') ?? stats.ranks[0];
  const rank = overall && /^\d+$/.test(overall.value) ? Number(overall.value) : null;
  const rows: [string, string | null][] = [
    [t('game.year'), known(thing.yearPublished)?.toString() ?? null],
    [t('game.minAge'), known(thing.minAge) ? t('game.minAgeValue', { n: thing.minAge! }) : null],
    [t('game.bggRating'), known(stats.average) && known(stats.usersRated) ? t('game.bggRatingValue', { avg: stats.average!.toFixed(2), count: formatNumber(stats.usersRated!) }) : null],
    [t('game.bggRank'), rank ? `#${formatNumber(rank)}` : null],
    [t('game.bggWeight'), known(stats.averageWeight) ? `${stats.averageWeight!.toFixed(2)} / 5` : null],
    [t('game.designers'), names(thing.designers) || null],
    [t('game.artists'), names(thing.artists) || null],
    [t('game.publishers'), names(thing.publishers) || null],
    [t('game.families'), names(thing.families) || null],
  ];

  return (
    <section className="bgg-facts" aria-labelledby={`bgg-facts-${thing.id}`}>
      <Heading id={`bgg-facts-${thing.id}`}>{t('game.bggTitle')}</Heading>
      <dl className="bgg-facts-list">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value ?? '—'}</dd>
          </div>
        ))}
      </dl>
      {thing.categories.length > 0 && (
        <>
          <h4>{t('game.categories')}</h4>
          <ul className="bgg-tags" role="list">{thing.categories.map((c) => <li key={c.id}>{c.value}</li>)}</ul>
        </>
      )}
      {thing.mechanics.length > 0 && (
        <>
          <h4>{t('game.mechanics')}</h4>
          <ul className="bgg-tags" role="list">{thing.mechanics.map((m) => <li key={m.id}>{m.value}</li>)}</ul>
        </>
      )}
      <p className="bgg-source">
        <a href={bggPageUrl(thing)} target="_blank" rel="noopener noreferrer">{t('game.viewOnBgg')}</a>
        <BggCredit />
      </p>
    </section>
  );
}
