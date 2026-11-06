/** Per-page search metadata. Pure data: shared by the runtime (client navigation) and the build-time prerender. */
export const SITE_NAME = 'Table Tale';
export const DEFAULT_SITE_URL = 'https://jgabrielmaia.com/table-tale';

export type SeoLang = 'pt' | 'en';
type Localized = Record<SeoLang, string>;

export interface PageSeo {
  /** Router path without the base ("/library"). */
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
    title: { pt: 'Table Tale – Biblioteca de jogos de tabuleiro e comunidade', en: 'Table Tale – Board Game Library, Stories and Community' },
    description: {
      pt: 'Explora a biblioteca viva de jogos de tabuleiro da Table Tale, regista as tuas sessões e descobre o universo dos Arcanos e Elementais.',
      en: 'Explore the living board game library of Table Tale, log your game sessions and discover the universe of the Arcanists and the Elementals.',
    },
  },
  {
    path: '/library',
    index: true,
    title: { pt: 'Biblioteca – Jogos de tabuleiro da comunidade | Table Tale', en: 'Library – Community Board Game Collection | Table Tale' },
    description: {
      pt: 'Consulta a coleção de jogos de tabuleiro e de cartas da Table Tale: filtra por género e complexidade, vê jogadores e duração e guarda os teus favoritos.',
      en: 'Browse the Table Tale collection of board and card games: filter by genre and complexity, check players and duration and save your favourites.',
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
  { path: '/auth/callback', index: false, title: { pt: 'A entrar… | Table Tale', en: 'Signing in… | Table Tale' }, description: { pt: 'A concluir o início de sessão.', en: 'Completing sign-in.' } },
];

export const NOT_FOUND_SEO: Pick<PageSeo, 'title' | 'description'> = {
  title: { pt: 'Página não encontrada | Table Tale', en: 'Page not found | Table Tale' },
  description: { pt: 'Esta página não consta do mapa da Table Tale.', en: 'This page is not on the Table Tale map.' },
};

export const findPage = (path: string) => PAGES.find((p) => p.path === path);

/** Cuts at a word boundary so snippets never end mid-word. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.\s]+$/, '')}…`;
}

export interface GameSeoInput {
  title: string;
  genre: string;
  minPlayers: number;
  maxPlayers: number;
  durationMinutes: number;
  complexity: string;
  description: string;
}

export function gameSeo(g: GameSeoInput, lang: SeoLang): { title: string; description: string } {
  const range = g.minPlayers === g.maxPlayers ? `${g.minPlayers}` : `${g.minPlayers}–${g.maxPlayers}`;
  const facts = lang === 'pt'
    ? `${g.title} (${g.genre}): ${range} jogadores, ${g.durationMinutes} min, dificuldade ${g.complexity.toLowerCase()}.`
    : `${g.title} (${g.genre}): ${range} players, ${g.durationMinutes} min, ${g.complexity.toLowerCase()} complexity.`;
  const full = lang === 'pt' ? `${g.title} – Jogadores, duração e dificuldade | ${SITE_NAME}` : `${g.title} – Players, length and complexity | ${SITE_NAME}`;
  const short = lang === 'pt' ? `${g.title} – Jogadores e duração | ${SITE_NAME}` : `${g.title} – Players and length | ${SITE_NAME}`;
  return {
    title: full.length <= 60 ? full : short,
    description: truncate(`${facts} ${g.description}`, 160),
  };
}
