import { SYMBOLS, isSymbolName, type SymbolName } from './symbols';

export type CoverTone = 'ember' | 'petrol' | 'moss' | 'dusk' | 'steel';

export const COVER_TONES: Record<CoverTone, { name: string; from: string; to: string; accent: string }> = {
  ember: { name: 'brasa', from: '#7a2a1c', to: '#1a0f0c', accent: '#E76F3C' },
  petrol: { name: 'azul petróleo', from: '#0F4C5C', to: '#0B1E2D', accent: '#2DD4BF' },
  moss: { name: 'verde musgo', from: '#2f4a32', to: '#0d1a14', accent: '#9cba6e' },
  dusk: { name: 'roxo arcano', from: '#4a3f72', to: '#0B1E2D', accent: '#9d8bd1' },
  steel: { name: 'cinza frio', from: '#3b4f5c', to: '#0B1E2D', accent: '#8CA3B0' },
};

const GENRE_STYLE: Record<string, { tone: CoverTone; symbol: SymbolName }> = {
  'Música': { tone: 'dusk', symbol: 'music' },
  'Cartas': { tone: 'ember', symbol: 'cards' },
  'Cooperativo': { tone: 'petrol', symbol: 'wave' },
  'Festa': { tone: 'moss', symbol: 'palette' },
  'Narrativo': { tone: 'dusk', symbol: 'star' },
  'Blefe': { tone: 'ember', symbol: 'crown' },
  'Estratégia': { tone: 'moss', symbol: 'mountain' },
  'Duelo': { tone: 'steel', symbol: 'shield' },
  'Clássico': { tone: 'steel', symbol: 'cards' },
};

const TONE_KEYS = Object.keys(COVER_TONES) as CoverTone[];

export function hashString(value: string): number {
  let h = 7;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) % 233280;
  return h;
}

/** Visual style for a game, derived from its genre (falls back to a stable hash). */
export function gameStyle(slug: string, genre: string): { tone: CoverTone; symbol: SymbolName } {
  const known = GENRE_STYLE[genre];
  if (known) return known;
  const h = hashString(slug);
  const symbols = Object.keys(SYMBOLS) as SymbolName[];
  return { tone: TONE_KEYS[h % TONE_KEYS.length] ?? 'petrol', symbol: symbols[h % symbols.length] ?? 'dice' };
}

const CASTLE =
  'M0 200V150H40V120L50 100L60 120V150H90V110H96V96L104 70L112 96V110H118V150H150V130L160 115L170 130V150H200V90H206V70L216 30L226 70V90H232V150H260V120H268V105L276 85L284 105V120H292V150H330V100H336V80L346 45L356 80V100H362V150H400V130L410 112L420 130V150H460V115H466V100L474 78L482 100V115H488V150H530V135L540 120L550 135V150H600V200Z';

const escapeXml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c] ?? c);

export interface CoverOptions {
  slug: string;
  title: string;
  tone: CoverTone;
  symbol: string;
}

/** Generates the illustrated cover (SVG markup) in the Table Tale brand style. Pure — runs in Node and the browser. */
export function coverSvg({ slug, title, tone, symbol }: CoverOptions): string {
  const t = COVER_TONES[tone];
  const icon = isSymbolName(symbol) ? SYMBOLS[symbol] : SYMBOLS.dice;
  let seed = hashString(slug);
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

  let embers = '';
  for (let i = 0; i < 34; i++) {
    const warm = rnd() > 0.35;
    embers += `<circle cx="${(rnd() * 600).toFixed(1)}" cy="${(rnd() * 330).toFixed(1)}" r="${(rnd() * 1.8 + 0.5).toFixed(2)}" fill="${warm ? '#E76F3C' : '#F4EBD0'}" opacity="${(rnd() * 0.6 + 0.25).toFixed(2)}"/>`;
  }
  let sparkles = '';
  for (let i = 0; i < 4; i++) {
    const x = 60 + rnd() * 480;
    const y = 40 + rnd() * 140;
    const s = 4 + rnd() * 5;
    sparkles += `<path d="M${x} ${y - s}L${x + s * 0.25} ${y}L${x} ${y + s}L${x - s * 0.25} ${y}ZM${x - s} ${y}L${x} ${y + s * 0.25}L${x + s} ${y}L${x} ${y - s * 0.25}Z" fill="#D4A85A" opacity=".8"/>`;
  }
  const rot = Math.round(rnd() * 45);
  const corner = (x: number, y: number) => `<path d="M${x} ${y - 7}L${x + 7} ${y}L${x} ${y + 7}L${x - 7} ${y}Z" fill="#D4A85A"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400">
<defs>
<linearGradient id="g" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="${t.from}"/><stop offset="1" stop-color="${t.to}"/></linearGradient>
<radialGradient id="glow" cx=".5" cy=".46" r=".5"><stop offset="0" stop-color="#E76F3C" stop-opacity=".55"/><stop offset=".45" stop-color="#B23A2E" stop-opacity=".18"/><stop offset="1" stop-color="#B23A2E" stop-opacity="0"/></radialGradient>
<radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#050d14" stop-opacity="0"/><stop offset="1" stop-color="#050d14" stop-opacity=".85"/></radialGradient>
<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3d9a0"/><stop offset=".55" stop-color="#D4A85A"/><stop offset="1" stop-color="#a8742f"/></linearGradient>
<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050d14" stop-opacity="0"/><stop offset="1" stop-color="#050d14" stop-opacity=".9"/></linearGradient>
<filter id="blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>
</defs>
<rect width="600" height="400" fill="url(#g)"/>
<circle cx="300" cy="185" r="230" fill="url(#glow)"/>
<path d="M300 20L318 167L465 185L318 203L300 350L282 203L135 185L282 167Z" fill="#D4A85A" opacity=".08"/>
${embers}${sparkles}
<g transform="translate(0 255) scale(1 .72)" opacity=".92"><path d="${CASTLE}" fill="#050d14"/></g>
<rect y="250" width="600" height="150" fill="url(#fade)"/>
<g fill="none" stroke="url(#gold)" transform="rotate(${rot} 300 170)"><circle cx="300" cy="170" r="96" stroke-width="2.2"/><circle cx="300" cy="170" r="84" stroke-width="1" stroke-dasharray="2 6" opacity=".7"/><path d="M300 62v16M300 262v16M192 170h16M392 170h16" stroke-width="2.2"/></g>
<g transform="translate(246 116) scale(2.25)" fill="none" stroke="#E76F3C" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" filter="url(#blur)" opacity=".7">${icon}</g>
<g transform="translate(246 116) scale(2.25)" fill="none" stroke="url(#gold)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icon}</g>
<rect width="600" height="400" fill="url(#vig)"/>
<rect x="12" y="12" width="576" height="376" rx="10" fill="none" stroke="#D4A85A" stroke-opacity=".7" stroke-width="1.5"/>
<rect x="20" y="20" width="560" height="360" rx="6" fill="none" stroke="#D4A85A" stroke-opacity=".3"/>
${corner(12, 12)}${corner(588, 12)}${corner(12, 388)}${corner(588, 388)}
<text x="300" y="342" text-anchor="middle" font-family="Cinzel, 'Trajan Pro', Georgia, serif" font-weight="700" font-size="28" letter-spacing="3" fill="url(#gold)">${escapeXml(title.toUpperCase())}</text>
</svg>`;
}

export const svgToDataUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
