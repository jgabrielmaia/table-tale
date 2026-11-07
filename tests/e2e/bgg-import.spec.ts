import { LibraryPage } from '../pages/LibraryPage';
import { expect, test, PLAYER } from '../fixtures';

const PORTO = '00000000-0000-4000-a000-000000000002';

test.describe('Importar do BoardGameGeek', () => {
  test('exige sessão', async ({ page }) => {
    await page.goto('library/import');
    await expect(page).toHaveURL(/\/login/);
  });

  test.describe('jogador com sessão', () => {
    test.beforeEach(async ({ signIn }) => {
      await signIn();
    });

    test('pesquisa, vê os dados completos e importa para a coleção pessoal @smoke', async ({ page, backend }) => {
      const library = new LibraryPage(page);
      await library.goto();
      await page.getByRole('link', { name: 'Importar do BoardGameGeek' }).click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Importar do BoardGameGeek');

      await page.getByRole('searchbox', { name: 'Nome do jogo' }).fill('catan');
      await page.getByRole('button', { name: 'Pesquisar' }).click();
      const result = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'CATAN' }) });
      await expect(result).toContainText('1995');

      await result.getByRole('button', { name: 'Ver dados de CATAN' }).click();
      const preview = page.getByRole('region', { name: 'Dados do jogo' });
      await expect(preview).toContainText('Klaus Teuber');
      await expect(preview).toContainText('KOSMOS');
      await expect(preview).toContainText('Economic');
      await expect(preview).toContainText('Dice Rolling');
      await expect(preview).toContainText('2.30 / 5');
      await expect(preview).toContainText('#450');
      await expect(preview).toContainText('Trade & build "settlements"');
      expect(backend.calls(/POST \/functions\/v1\/bgg/).map((r) => (r.body as { action: string }).action)).toEqual(['search', 'preview']);

      // BGG's required attribution is on the page and links to BoardGameGeek.
      const credits = page.getByRole('link', { name: /Powered by BGG/ });
      await expect(credits.first()).toHaveAttribute('href', 'https://boardgamegeek.com');

      await result.getByRole('button', { name: 'Importar CATAN para A minha coleção' }).click();
      await expect(page.getByText('CATAN foi adicionado a A minha coleção')).toBeVisible();
      const game = backend.db.games.find((g) => g.bgg_id === 13)!;
      expect(game).toMatchObject({ title: 'CATAN', slug: 'catan', categories: ['Economic', 'Negotiation'], bgg_rank: 450, min_players: 3, duration_minutes: 120 });
      expect(game.genre).toBeUndefined();
      expect(backend.db.ownerships.filter((o) => o.user_id === PLAYER.id && o.game_id === game.id)).toHaveLength(1);

      // Importing again does not add a second copy; the result now points at the catalogue game.
      await result.getByRole('button', { name: 'Importar CATAN para A minha coleção' }).click();
      await expect(page.getByText('CATAN já está em A minha coleção')).toBeVisible();
      expect(backend.db.ownerships.filter((o) => o.user_id === PLAYER.id && o.game_id === game.id)).toHaveLength(1);
      await expect(result.getByRole('link', { name: 'Já no catálogo' })).toHaveAttribute('href', /\/games\/catan$/);

      // It shows up in the library with BGG categories, and the detail page has the BGG data and credit.
      await library.goto();
      await expect(library.count()).toHaveText('10 jogos encontrados');
      await expect(library.card('CATAN')).toContainText('Economic · Negotiation');
      await library.category().selectOption({ label: 'Economic' });
      await expect(library.count()).toHaveText('1 jogo encontrado');
      await library.card('CATAN').getByRole('link').first().click();
      await expect(page).toHaveURL(/\/games\/catan$/);
      const bgg = page.getByRole('region', { name: 'Dados do BoardGameGeek' });
      await expect(bgg).toContainText('Klaus Teuber');
      await expect(bgg.getByRole('link', { name: 'Ver no BoardGameGeek' })).toHaveAttribute('href', 'https://boardgamegeek.com/boardgame/13');
      await expect(bgg.getByRole('link', { name: /Powered by BGG/ })).toBeVisible();
    });

    test('mostra um traço quando o BGG não conhece jogadores nem duração e não os confunde com filtros', async ({ page }) => {
      await page.goto('library/import');
      await page.getByRole('searchbox', { name: 'Nome do jogo' }).fill('obscuro');
      await page.getByRole('button', { name: 'Pesquisar' }).click();
      await page.getByRole('button', { name: /^Importar Jogo Obscuro/ }).click();
      await expect(page.getByText(/Jogo Obscuro: A Vingança foi adicionado/)).toBeVisible();

      const library = new LibraryPage(page);
      await library.goto();
      const card = library.card('Jogo Obscuro: A Vingança');
      await expect(card).toContainText('—');
      await library.players().selectOption({ label: '2 jogadores' });
      await expect(card).toHaveCount(0);
    });

    test('importa para a biblioteca de uma comunidade que o jogador gere', async ({ page, backend }) => {
      backend.db.memberships.push({ id: 'm-porto-owner', user_id: PLAYER.id, community_id: PORTO, role: 'owner', status: 'active', joined_at: '2026-01-03T10:00:00.000Z' });
      await page.goto('communities/tabuleiros-do-porto');
      await page.getByRole('tab', { name: 'Biblioteca' }).click();
      await page.getByRole('link', { name: 'Importar do BoardGameGeek' }).click();
      await expect(page.getByLabel('Adicionar a')).toHaveValue(PORTO);

      await page.getByRole('searchbox', { name: 'Nome do jogo' }).fill('catan');
      await page.getByRole('button', { name: 'Pesquisar' }).click();
      await page.getByRole('button', { name: 'Importar CATAN para Tabuleiros do Porto' }).click();
      await expect(page.getByText('CATAN foi adicionado a Tabuleiros do Porto')).toBeVisible();
      const game = backend.db.games.find((g) => g.bgg_id === 13)!;
      expect(backend.db.communityGames.filter((g) => g.community_id === PORTO && g.game_id === game.id)).toHaveLength(1);
      expect(backend.db.ownerships.filter((o) => o.game_id === game.id)).toHaveLength(0);

      await page.getByRole('button', { name: 'Importar CATAN para Tabuleiros do Porto' }).click();
      await expect(page.getByText('CATAN já está em Tabuleiros do Porto')).toBeVisible();
    });

    test('um membro sem gestão só vê a coleção pessoal como destino', async ({ page }) => {
      await page.goto('library/import');
      await expect(page.getByLabel('Adicionar a').locator('option')).toHaveText(['A minha coleção']);
    });

    test('explica falhas do BoardGameGeek sem expor detalhes', async ({ page, backend }) => {
      backend.fail(/POST \/functions\/v1\/bgg/, { status: 429, body: { error: { code: 'rate_limited', message: 'x' } } }, 1);
      await page.goto('library/import');
      await page.getByRole('searchbox', { name: 'Nome do jogo' }).fill('catan');
      await page.getByRole('button', { name: 'Pesquisar' }).click();
      await expect(page.getByText('O BoardGameGeek está a limitar os pedidos. Espera um pouco e tenta de novo.')).toBeVisible();

      backend.fail(/POST \/functions\/v1\/bgg/, { status: 502, body: { error: { code: 'bgg_unauthorized', message: 'x' } } }, 1);
      await page.getByRole('searchbox', { name: 'Nome do jogo' }).fill('azul');
      await page.getByRole('button', { name: 'Pesquisar' }).click();
      await expect(page.getByText('A ligação ao BoardGameGeek ainda não está autorizada. Tenta mais tarde.')).toBeVisible();
    });
  });
});
