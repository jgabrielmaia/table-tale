import { GamePage } from '../pages/GamePage';
import { OWNER } from '../data/seed';
import { expect, test, PLAYER } from '../fixtures';

/** A day N days back, as the browser (Europe/Lisbon) sees it. */
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Lisbon' });

test.describe('Página inicial', () => {
  test('mostra os jogos populares das comunidades e leva aos jogos, sem o bloco de números @smoke', async ({ page }) => {
    await page.goto('');
    await expect(page.getByRole('term').filter({ hasText: 'Jogos na estante' })).toHaveCount(0);
    await expect(page.getByLabel('A biblioteca em números')).toHaveCount(0);

    const highlights = page.getByRole('region', { name: 'Populares nas comunidades' });
    await expect(highlights.getByRole('list', { name: 'Destaques' }).getByRole('heading', { level: 3 })).toHaveCount(3);
    await page.getByRole('link', { name: 'Ver todos os jogos →' }).click();
    await expect(page).toHaveURL(/\/games$/);
  });

  test('para visitantes, os destaques só incluem jogos que estão numa estante pública', async ({ page, backend }) => {
    const onShelf = backend.db.games.find((g) => g.slug === 'coup')!.id;
    backend.db.communityGames = backend.db.communityGames.filter((g) => g.game_id === onShelf);
    await page.goto('');
    const highlights = page.getByRole('list', { name: 'Destaques' });
    await expect(highlights.getByRole('heading', { level: 3 })).toHaveText(['Coup']);
  });

  test('os jogos mais jogados nas comunidades públicas vêm primeiro, com quantos os jogaram', async ({ page, backend }) => {
    backend.addSession(OWNER.id, 'vaalbara', { played_at: daysAgo(2) });
    await page.goto('');
    const first = page.getByRole('list', { name: 'Destaques' }).getByRole('listitem').first();
    await expect(first.getByRole('heading', { level: 3 })).toHaveText('Vaalbara');
    await expect(first).toContainText('1 jogador jogou-o nos últimos tempos');
  });

  test('um jogador sem sessões vê os jogos populares da sua comunidade', async ({ page, backend, signIn }) => {
    backend.joinCommunity('tabuleiros-do-porto');
    backend.addSession(OWNER.id, 'dixit', { played_at: daysAgo(1) });
    backend.addSession(OWNER.id, 'uno', { played_at: daysAgo(1) }); // not on the Porto shelf, but played by a member
    await signIn();
    await page.goto('');

    const highlights = page.getByRole('region', { name: 'Populares na tua comunidade' });
    const cards = highlights.getByRole('listitem');
    await expect(cards.getByRole('heading', { level: 3 })).toHaveText(['Dixit', 'Uno', 'Coup']);
    await expect(cards.first()).toContainText('1 membro jogou-o nos últimos tempos');
  });

  test('um jogador vê os jogos que jogou por último, e os populares preenchem o resto', async ({ page, backend, signIn }) => {
    backend.joinCommunity('tabuleiros-do-porto');
    backend.addSession(PLAYER.id, 'hitster', { played_at: daysAgo(3) });
    await signIn();
    await page.goto('');

    const highlights = page.getByRole('region', { name: 'Jogados recentemente' });
    await expect(page.getByText('De volta à mesa')).toBeVisible();
    const cards = highlights.getByRole('listitem');
    await expect(cards.getByRole('heading', { level: 3 })).toHaveText(['Hitster', 'Coup', 'Dixit']);
    await expect(cards.first()).toContainText('Jogado há 3 dias');
  });

  test('depois de registar uma sessão, esse jogo passa para o início dos destaques @responsive', async ({ page, backend, signIn }) => {
    backend.addSession(PLAYER.id, 'hitster', { played_at: daysAgo(3) });
    await signIn();
    await page.goto('');
    const list = page.getByRole('list', { name: 'Destaques' });
    const titles = list.getByRole('heading', { level: 3 });
    await expect(titles).toHaveText(['Hitster', 'Coup', /.+/]);

    // In-app navigation keeps the cached highlights, so this checks that logging a session refreshes them.
    await list.getByRole('link').filter({ has: page.getByRole('heading', { name: 'Coup', exact: true }) }).click();
    const game = new GamePage(page);
    await game.markToday().click();
    await expect(game.sessions()).toHaveCount(1);
    await page.getByRole('link', { name: 'Table Tale — página inicial' }).click();

    await expect(titles.first()).toHaveText('Coup');
    await expect(titles.nth(1)).toHaveText('Hitster');
    await expect(list.getByRole('listitem').first()).toContainText('Jogado hoje');
  });

  test('um visitante vê o botão Entrar e um jogador com sessão não', async ({ page, signIn }) => {
    await page.goto('');
    await expect(page.getByRole('main').getByRole('link', { name: 'Entrar' })).toBeVisible();
    await signIn();
    await page.goto('');
    await expect(page.getByRole('main').getByRole('link', { name: 'Entrar' })).toHaveCount(0);
  });

  test('mostra erro quando os jogos não carregam, sem partir a página', async ({ page, backend }) => {
    backend.fail(/GET \/rest\/v1\/games/, { status: 500, body: { code: 'XX000', message: 'falha simulada' } });
    await page.goto('');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/falha simulada/)).toBeVisible({ timeout: 15_000 });
  });

  test('mostra erro quando os destaques não carregam', async ({ page, backend }) => {
    backend.fail(/POST \/rest\/v1\/rpc\/shelf_highlights/, { status: 500, body: { code: 'XX000', message: 'destaques em baixo' } });
    await page.goto('');
    await expect(page.getByText(/destaques em baixo/)).toBeVisible({ timeout: 15_000 });
  });
});
