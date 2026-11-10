/** Per-page search metadata. Pure data: shared by the runtime (client navigation) and the build-time prerender. */
export const SITE_NAME = 'Table Tale';
export const DEFAULT_SITE_URL = 'https://jgabrielmaia.com/table-tale';

export type SeoLang = 'pt' | 'en';
type Localized = Record<SeoLang, string>;

export interface PageSeo {
  /** Router path without the base ("/games"). */
  path: string;
  /** false: kept out of the index (private, transactional or utility pages). */
  index: boolean;
  title: Localized;
  description: Localized;
}

export const PAGES: readonly PageSeo[] = [
  {
    path: '/',
    index: true,
    title: { pt: 'Table Tale – Jogos de tabuleiro, histórias e comunidades', en: 'Table Tale – Board Games, Stories and Communities' },
    description: {
      pt: 'Descobre jogos de tabuleiro nas comunidades perto de ti, regista as tuas sessões e conhece o universo dos Arcanos e Elementais da Table Tale.',
      en: 'Find board games on the shelves of communities near you, log your game sessions and discover the universe of the Arcanists and the Elementals.',
    },
  },
  {
    path: '/games',
    index: true,
    title: { pt: 'Jogos – Jogos de tabuleiro perto de ti | Table Tale', en: 'Games – Board Games in Communities Near You | Table Tale' },
    description: {
      pt: 'Descobre os jogos de tabuleiro nas estantes das comunidades perto de ti: filtra por distância, comunidade e categoria do BoardGameGeek e guarda favoritos.',
      en: 'Find the board and card games on the shelves of communities near you: filter by distance, community, BoardGameGeek category and mechanic, and save favourites.',
    },
  },
  {
    path: '/lore',
    index: true,
    title: { pt: 'Lore – Arcanos e Elementais, o universo | Table Tale', en: 'Lore – Arcanists and Elementals Universe | Table Tale' },
    description: {
      pt: 'Conhece o universo da Table Tale: as facções Arcanos e Elementais, as nove cartas do Sorteio do Destino e a filosofia de cada uma.',
      en: 'Discover the Table Tale universe: the Arcanists and Elementals factions, the nine cards of the Fate Draw and the philosophy behind each of them.',
    },
  },
  { path: '/events', index: false, title: { pt: 'Eventos | Table Tale', en: 'Events | Table Tale' }, description: { pt: 'Eventos da comunidade Table Tale.', en: 'Table Tale community events.' } },
  { path: '/login', index: false, title: { pt: 'Entrar | Table Tale', en: 'Sign in | Table Tale' }, description: { pt: 'Entra na Table Tale com Google, GitHub ou e-mail.', en: 'Sign in to Table Tale with Google, GitHub or email.' } },
  { path: '/register', index: false, title: { pt: 'Criar conta | Table Tale', en: 'Create account | Table Tale' }, description: { pt: 'Cria a tua conta Table Tale.', en: 'Create your Table Tale account.' } },
  { path: '/profile', index: false, title: { pt: 'O meu perfil | Table Tale', en: 'My profile | Table Tale' }, description: { pt: 'O teu perfil e identidade sazonal na Table Tale.', en: 'Your profile and seasonal identity on Table Tale.' } },
  { path: '/fate', index: false, title: { pt: 'O Sorteio do Destino | Table Tale', en: 'The Fate Draw | Table Tale' }, description: { pt: 'Descobre a carta que revela o teu destino na Table Tale.', en: 'Discover the card that reveals your destiny in Table Tale.' } },
  { path: '/communities', index: false, title: { pt: 'Comunidades | Table Tale', en: 'Communities | Table Tale' }, description: { pt: 'Encontra comunidades de jogos de tabuleiro perto de ti na Table Tale.', en: 'Find board game communities near you on Table Tale.' } },
  { path: '/communities/new', index: false, title: { pt: 'Nova comunidade | Table Tale', en: 'New community | Table Tale' }, description: { pt: 'Cria uma comunidade de jogos de tabuleiro na Table Tale.', en: 'Create a board game community on Table Tale.' } },
  { path: '/games/import', index: false, title: { pt: 'Importar do BoardGameGeek | Table Tale', en: 'Import from BoardGameGeek | Table Tale' }, description: { pt: 'Pesquisa no BoardGameGeek e importa jogos para a Table Tale.', en: 'Search BoardGameGeek and import games into Table Tale.' } },
  { path: '/auth/callback', index: false, title: { pt: 'A entrar… | Table Tale', en: 'Signing in… | Table Tale' }, description: { pt: 'A concluir o início de sessão.', en: 'Completing sign-in.' } },
];

export const NOT_FOUND_SEO: Pick<PageSeo, 'title' | 'description'> = {
  title: { pt: 'Página não encontrada | Table Tale', en: 'Page not found | Table Tale' },
  description: { pt: 'Esta página não consta do mapa da Table Tale.', en: 'This page is not on the Table Tale map.' },
};

export const findPage = (path: string) => PAGES.find((p) => p.path === path);

/** Routes whose page sets its own title and description with `usePageSeo` (games, communities, players). */
export const DYNAMIC_SEO_PREFIXES = ['/games/', '/communities/', '/players/'] as const;

/** Cuts at a word boundary so snippets never end mid-word. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.\s]+$/, '')}…`;
}

export interface GameSeoInput {
  title: string;
  categories: string[];
  minPlayers: number | null;
  maxPlayers: number | null;
  durationMinutes: number | null;
  description: string;
}

export function gameSeo(g: GameSeoInput, lang: SeoLang): { title: string; description: string } {
  const lo = g.minPlayers ?? g.maxPlayers;
  const hi = g.maxPlayers ?? g.minPlayers;
  const range = lo === null || hi === null ? null : lo === hi ? `${lo}` : `${lo}–${hi}`;
  const pt = lang === 'pt';
  const parts = [
    range && (pt ? `${range} jogadores` : `${range} players`),
    g.durationMinutes !== null && `${g.durationMinutes} min`,
  ].filter(Boolean);
  const category = g.categories[0] ? ` (${g.categories[0]})` : '';
  const facts = parts.length ? `${g.title}${category}: ${parts.join(', ')}.` : `${g.title}${category}.`;
  const title = lang === 'pt' ? `${g.title} – Jogadores e duração | ${SITE_NAME}` : `${g.title} – Players and length | ${SITE_NAME}`;
  return {
    title,
    description: truncate(`${facts} ${g.description}`, 160),
  };
}
