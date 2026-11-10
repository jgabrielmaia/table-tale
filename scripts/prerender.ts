/**
 * Build step that runs after `vite build`: writes one crawlable HTML file per public route (real title, description,
 * canonical, Open Graph, JSON-LD and the page's main content), plus sitemap.xml, robots.txt and llms.txt.
 * The React app still mounts over it, so users see no difference; crawlers that do not run JS read the content.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DEFAULT_SITE_URL, PAGES, SITE_NAME, gameSeo, truncate } from '../src/seo/pages';
import { pt } from '../src/i18n/messages.pt';
import { contentPt } from '../src/i18n/content.pt';
import { games } from './seed-data';

const SITE = (process.env.SITE_URL ?? DEFAULT_SITE_URL).replace(/\/+$/, '');
const BASE_PATH = new URL(SITE).pathname.replace(/\/+$/, '');
const OUT = join('dist', BASE_PATH);
const BUILD_DATE = new Date().toISOString().slice(0, 10);
const IMAGE = `${SITE}/og-image.png`;
const LOGO = `${SITE}/favicon.png`;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const url = (path: string) => `${SITE}${path === '/' ? '/' : `${path}/`}`;
const href = (path: string) => `${BASE_PATH}${path === '/' ? '/' : `${path}/`}`;
const ld = (data: unknown) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

const players = (min: number, max: number) => (min === max ? `${min}` : `${min} a ${max}`);
const gameSeoInput = (g: (typeof games)[number]) => ({
  title: g.title, categories: g.categories, minPlayers: g.min_players, maxPlayers: g.max_players,
  durationMinutes: g.duration_minutes, description: g.description,
});

const ORG_ID = `${SITE}/#organization`;
const SITE_ID = `${SITE}/#website`;
const organization = { '@type': 'Organization', '@id': ORG_ID, name: SITE_NAME, url: `${SITE}/`, logo: LOGO, slogan: pt['home.eyebrow'] };
const website = { '@type': 'WebSite', '@id': SITE_ID, url: `${SITE}/`, name: SITE_NAME, inLanguage: 'pt-PT', publisher: { '@id': ORG_ID } };

const crumbs = (items: [string, string][]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: url(path) })),
});

interface Page {
  path: string;
  title: string;
  description: string;
  index: boolean;
  ogType: 'website' | 'article';
  jsonLd: unknown[];
  body: string;
}

const NAV = `<header><p><a href="${href('/')}">${SITE_NAME}</a></p><nav aria-label="${esc(pt['nav.main'])}"><a href="${href('/games')}">${esc(pt['nav.games'])}: jogos de tabuleiro das comunidades</a> · <a href="${href('/lore')}">${esc(pt['nav.lore'])}: o universo Table Tale</a></nav></header>`;
const FOOTER = `<footer><p>${SITE_NAME} — ${esc(pt['footer.tagline'])}</p></footer>`;
const shell = (main: string) => `<div class="seo-shell" style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap">${NAV}<main>${main}</main>${FOOTER}</div>`;

const gameLi = (g: (typeof games)[number]) =>
  `<li><h3><a href="${href(`/games/${g.slug}`)}">${esc(g.title)}</a></h3><p>${esc(g.categories.join(', '))} · ${players(g.min_players, g.max_players)} jogadores · ${g.duration_minutes} min</p><p>${esc(g.description)}</p></li>`;

const CARD_IDS = ['magician', 'high-priestess', 'star', 'world', 'temperance', 'earth', 'water', 'fire', 'air'] as const;
const FACTIONS = [
  { slug: 'arcanos', cards: CARD_IDS.slice(0, 5) },
  { slug: 'elementais', cards: CARD_IDS.slice(5) },
] as const;

function homePage(seo: (typeof PAGES)[number]): Page {
  const body = shell(
    `<h1>${esc(pt['home.title'])}</h1><p>${esc(pt['home.lead'])}</p>` +
    `<h2>${esc(pt['home.highlights'])}</h2><ul>${games.slice(0, 3).map(gameLi).join('')}</ul>` +
    `<p><a href="${href('/games')}">${esc(pt['home.ctaExplore'])}</a> · <a href="${href('/lore')}">${esc(pt['home.ctaLore'])}</a></p>`,
  );
  return { path: '/', title: seo.title.pt, description: seo.description.pt, index: true, ogType: 'website', jsonLd: [organization, website], body };
}

function gamesPage(seo: (typeof PAGES)[number]): Page {
  const body = shell(`<h1>${esc(pt['games.title'])}</h1><p>${esc(pt['games.eyebrow'])}.</p><ul>${games.map(gameLi).join('')}</ul>`);
  return {
    path: '/games', title: seo.title.pt, description: seo.description.pt, index: true, ogType: 'website', body,
    jsonLd: [
      crumbs([[pt['nav.home'], '/'], [pt['games.title'], '/games']]),
      { '@type': 'CollectionPage', '@id': `${url('/games')}#page`, url: url('/games'), name: seo.title.pt, isPartOf: { '@id': SITE_ID }, inLanguage: 'pt-PT',
        mainEntity: { '@type': 'ItemList', numberOfItems: games.length, itemListElement: games.map((g, i) => ({ '@type': 'ListItem', position: i + 1, url: url(`/games/${g.slug}`), name: g.title })) } },
    ],
  };
}

function lorePage(seo: (typeof PAGES)[number]): Page {
  const L = contentPt.lore;
  const factions = FACTIONS.map((f) => {
    const name = pt[`faction.${f.slug}`];
    return `<section><h2>${esc(pt['lore.factionTitle'].replace('{name}', name))}</h2><p><strong>${esc(pt[`faction.${f.slug}.motto`])}</strong> ${esc(pt[`faction.${f.slug}.line`])}</p>` +
      `<h3>${esc(pt['lore.collectionTitle'])}: ${esc(pt[f.slug === 'arcanos' ? 'lore.arcanosCards' : 'lore.elementaisCards'])}</h3><ul>${f.cards.map((c) => `<li><h4>${esc(pt[`card.title.${c}`])}</h4><p>${esc(contentPt.cardLore[c])}</p></li>`).join('')}</ul></section>`;
  }).join('');
  const body = shell(
    `<h1>${esc(pt['nav.lore'])}</h1><p>${esc(L.intro.title)}</p><p>${esc(L.intro.text)}</p><p>${esc(L.intro.note)}</p>` +
    `<h2>${esc(pt['lore.identityTitle'])}</h2><p>${esc(L.choice.intro)}</p><p>${esc(L.choice.question)}</p>${L.choice.destiny.map((p) => `<p>${esc(p)}</p>`).join('')}<p>${esc(L.choice.express)}</p><p>${esc(L.choice.answer)}</p>` +
    `<h2>${esc(pt['lore.premiseTitle'])}</h2>${L.premise.map((p) => `<p>${esc(p)}</p>`).join('')}` +
    factions +
    `<h2>${esc(pt['lore.tensionTitle'])}</h2>${L.tension.intro.map((p) => `<p>${esc(p)}</p>`).join('')}<p>${esc(L.tension.outro)}</p>` +
    `<p>${esc(L.balance.lead)} ${esc(L.balance.closing)}</p>`,
  );
  return {
    path: '/lore', title: seo.title.pt, description: seo.description.pt, index: true, ogType: 'website', body,
    jsonLd: [
      crumbs([[pt['nav.home'], '/'], [pt['nav.lore'], '/lore']]),
      { '@type': 'WebPage', '@id': `${url('/lore')}#page`, url: url('/lore'), name: seo.title.pt, description: seo.description.pt, isPartOf: { '@id': SITE_ID }, inLanguage: 'pt-PT' },
    ],
  };
}

function gamePage(g: (typeof games)[number]): Page {
  const seo = gameSeo(gameSeoInput(g), 'pt');
  const path = `/games/${g.slug}`;
  const body = shell(
    `<h1>${esc(g.title)}</h1><p>${esc(g.categories.join(', '))}</p>` +
    `<dl><dt>${esc(pt['game.players'])}</dt><dd>${players(g.min_players, g.max_players)}</dd><dt>${esc(pt['game.avgDuration'])}</dt><dd>${g.duration_minutes} min</dd></dl>` +
    `<p>${esc(g.description)}</p><p><a href="${href('/games')}">${esc(pt['common.backToGames'])}</a></p>`,
  );
  return {
    path, title: seo.title, description: seo.description, index: true, ogType: 'article', body,
    jsonLd: [
      crumbs([[pt['nav.home'], '/'], [pt['games.title'], '/games'], [g.title, path]]),
      { '@type': 'WebPage', '@id': `${url(path)}#page`, url: url(path), name: seo.title, description: seo.description, isPartOf: { '@id': SITE_ID }, inLanguage: 'pt-PT',
        mainEntity: { '@type': 'Game', name: g.title, description: g.description, numberOfPlayers: { '@type': 'QuantitativeValue', minValue: g.min_players, maxValue: g.max_players } } },
    ],
  };
}

function privatePage(seo: (typeof PAGES)[number]): Page {
  const body = shell(`<h1>${esc(seo.title.pt.replace(/ \| Table Tale$/, ''))}</h1><p>${esc(seo.description.pt)}</p>`);
  return { path: seo.path, title: seo.title.pt, description: seo.description.pt, index: false, ogType: 'website', jsonLd: [], body };
}

function render(template: string, page: Page): string {
  const canonical = url(page.path);
  const head = [
    `<meta name="description" content="${esc(page.description)}" />`,
    `<meta name="robots" content="${page.index ? 'index, follow, max-image-preview:large' : 'noindex, follow'}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:type" content="${page.ogType}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="pt_PT" />`,
    `<meta property="og:title" content="${esc(page.title)}" />`,
    `<meta property="og:description" content="${esc(page.description)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${IMAGE}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${SITE_NAME} — ${esc(pt['footer.tagline'])}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(page.title)}" />`,
    `<meta name="twitter:description" content="${esc(page.description)}" />`,
    `<meta name="twitter:image" content="${IMAGE}" />`,
    ...(page.jsonLd.length ? [ld({ '@context': 'https://schema.org', '@graph': page.jsonLd })] : []),
  ].join('\n    ');
  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(page.title)}</title>`)
    .replace(/\s*<meta name="description"[^>]*>/, '')
    .replace('<!--seo-head-->', head)
    .replace('<!--seo-body-->', page.body);
}

function write(file: string, content: string) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content, 'utf8');
}

const template = readFileSync(join(OUT, 'index.html'), 'utf8');
if (!template.includes('<!--seo-head-->') || !template.includes('<!--seo-body-->')) throw new Error('index.html perdeu os marcadores de prerender.');

const byPath = (p: string) => {
  const found = PAGES.find((x) => x.path === p);
  if (!found) throw new Error(`Página SEO em falta: ${p}`);
  return found;
};

const pages: Page[] = [
  homePage(byPath('/')),
  gamesPage(byPath('/games')),
  lorePage(byPath('/lore')),
  ...games.map(gamePage),
  ...PAGES.filter((p) => !p.index).map(privatePage),
];

for (const page of pages) {
  const html = render(template, page);
  write(page.path === '/' ? join(OUT, 'index.html') : join(OUT, page.path, 'index.html'), html);
}

const indexable = pages.filter((p) => p.index);
write(join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexable
    .map((p) => `  <url><loc>${url(p.path)}</loc><lastmod>${BUILD_DATE}</lastmod></url>`).join('\n')}\n</urlset>\n`);

// Crawlers only honour robots.txt at the domain root; this copy is the exact block to merge into it.
const privatePaths = pages.filter((p) => !p.index).map((p) => `Disallow: ${BASE_PATH}${p.path}`);
const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot', 'Claude-SearchBot', 'Google-Extended', 'Applebot-Extended', 'CCBot'];
write(join(OUT, 'robots.txt'),
  `# Table Tale — bloco para juntar ao robots.txt da raiz do domínio (só aí é respeitado).\n` +
  `User-agent: *\nAllow: ${BASE_PATH}/\n${privatePaths.join('\n')}\n\n` +
  `${AI_BOTS.map((b) => `User-agent: ${b}\nAllow: ${BASE_PATH}/\n${privatePaths.join('\n')}`).join('\n\n')}\n\n` +
  `Sitemap: ${SITE}/sitemap.xml\n`);

write(join(OUT, 'llms.txt'),
  `# ${SITE_NAME}\n\n` +
  `> ${truncate(pt['home.lead'], 400)}\n\n` +
  `${SITE_NAME} junta comunidades de jogos de tabuleiro e de cartas, com diário de sessões, conquistas e um universo narrativo dividido em duas facções, Arcanos e Elementais. A página está em português (Portugal) com versão em inglês na própria aplicação.\n\n` +
  `## Páginas principais\n\n` +
  `- [Início](${url('/')}): ${byPath('/').description.pt}\n` +
  `- [Jogos](${url('/games')}): ${byPath('/games').description.pt}\n` +
  `- [Lore: Arcanos e Elementais](${url('/lore')}): ${byPath('/lore').description.pt}\n\n` +
  `## Jogos nas estantes\n\n${games.map((g) => `- [${g.title}](${url(`/games/${g.slug}`)}): ${g.categories.join(', ')}, ${players(g.min_players, g.max_players)} jogadores, ${g.duration_minutes} min.`).join('\n')}\n\n` +
  `## Universo\n\n` +
  `- Arcanos: "${pt['faction.arcanos.motto']}" ${pt['faction.arcanos.line']}\n` +
  `- Elementais: "${pt['faction.elementais.motto']}" ${pt['faction.elementais.line']}\n` +
  `- Ninguém escolhe a sua facção: a carta recebida no Sorteio do Destino revela onde cada jogador pertence. Nenhuma facção é superior à outra.\n`);

console.log(`✓ prerender: ${pages.length} páginas (${indexable.length} indexáveis), sitemap.xml, robots.txt, llms.txt → ${OUT}`);
