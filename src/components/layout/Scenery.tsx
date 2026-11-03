import { CASTLE_PATH } from './sceneryPath';

const EMBERS = Array.from({ length: 16 }, (_, i) => ({
  x: `${(i * 61) % 100}%`,
  d: `${6 + (i % 5) * 1.6}s`,
  delay: `${-((i * 1.3) % 9)}s`,
  s: `${2 + (i % 3)}px`,
}));

/** Castle silhouette with lit windows and rising embers (brand "cenário"). */
export function Scenery() {
  return (
    <div className="scenery" aria-hidden="true">
      <div className="embers">
        {EMBERS.map((e, i) => (
          <span key={i} style={{ ['--x' as string]: e.x, ['--d' as string]: e.d, ['--delay' as string]: e.delay, ['--s' as string]: e.s }} />
        ))}
      </div>
      <svg className="castle" viewBox="0 0 600 200" preserveAspectRatio="xMaxYMax meet">
        <path d={CASTLE_PATH} />
        <g className="castle-lights">
          <rect x="214" y="62" width="4" height="7" rx="2" />
          <rect x="344" y="78" width="4" height="7" rx="2" />
          <rect x="102" y="98" width="3" height="6" rx="1.5" />
          <rect x="274" y="108" width="3" height="6" rx="1.5" />
          <rect x="472" y="104" width="3" height="6" rx="1.5" />
          <rect x="300" y="132" width="4" height="8" rx="2" />
        </g>
      </svg>
    </div>
  );
}
