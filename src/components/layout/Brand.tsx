import { CASTLE_PATH } from './sceneryPath';

/** Gradients shared by every emblem on the page (rendered once in AppShell). */
export function BrandDefs() {
  return (
    <svg className="svg-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="tt-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3d9a0" />
          <stop offset=".5" stopColor="#D4A85A" />
          <stop offset="1" stopColor="#a8742f" />
        </linearGradient>
        <radialGradient id="tt-core" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#ffd9a8" />
          <stop offset=".6" stopColor="#E76F3C" />
          <stop offset="1" stopColor="#B23A2E" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export function EmblemPaths() {
  return (
    <>
      <circle cx="32" cy="32" r="20" fill="none" stroke="url(#tt-gold)" strokeWidth="2.4" />
      <path d="M32 2 L36.5 27.5 L62 32 L36.5 36.5 L32 62 L27.5 36.5 L2 32 L27.5 27.5 Z" fill="url(#tt-gold)" />
      <path d="M32 17 C30 26 26 30 17 32 C26 34 30 38 32 47 C34 38 38 34 47 32 C38 30 34 26 32 17 Z" fill="#0B1E2D" />
      <path d="M32 23 L35 32 L32 41 L29 32 Z" fill="url(#tt-core)" />
    </>
  );
}

/** The Table Tale four-pointed star emblem. */
export function Emblem({ className }: { className?: string }) {
  return (
    <svg className={className ?? 'emblem'} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <EmblemPaths />
    </svg>
  );
}

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
