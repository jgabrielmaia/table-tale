import { GamesPage } from '../pages/GamesPage';
import { expect, test, PLAYER } from '../fixtures';

const PORTO = '00000000-0000-4000-a000-000000000002';

test.describe('Importar do BoardGameGeek', () => {
  test('exige sessão', async ({ page }) => {
    await page.goto('games/import');
    await expect(page).toHaveURL(/\/login/);
  });

  test.describe('jogador com sessão', () => {
    test.beforeEach(async ({ signIn }) => {
      await signIn();
    });

    test('pesquisa, vê os dados completos e importa para os meus jogos @smoke', async ({ page, backend }) => {
      backend.joinCommunity('table-tale'); // so the games list shows Lisboa's shelf without a location
      // The Games page has no import button: importing starts from a community's Games tab or this address.
      const games = new GamesPage(page);
      await games.goto();
      await expect(page.getByRole('link', { name: 'Importar do BoardGameGeek' })).toHaveCount(0);
      await page.goto('games/import');
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

      await result.getByRole('button', { name: 'Importar CATAN para Os meus jogos' }).click();
      await expect(page.getByText('CATAN foi adicionado a Os meus jogos')).toBeVisible();
      const game = backend.db.games.find((g) => g.bgg_id === 13)!;
      expect(game).toMatchObject({ title: 'CATAN', slug: 'catan', categories: ['Economic', 'Negotiation'], bgg_rank: 450, min_players: 3, duration_minutes: 120 });
      expect(game.genre).toBeUndefined();
      expect(backend.db.ownerships.filter((o) => o.user_id === PLAYER.id && o.game_id === game.id)).toHaveLength(1);

      // Importing again does not add a second copy; the result now points at the catalogue game.
      await result.getByRole('button', { name: 'Importar CATAN para Os meus jogos' }).click();
      await expect(page.getByText('CATAN já está em Os meus jogos')).toBeVisible();
      expect(backend.db.ownerships.filter((o) => o.user_id === PLAYER.id && o.game_id === game.id)).toHaveLength(1);
      await expect(result.getByRole('link', { name: 'Já no catálogo' })).toHaveAttribute('href', /\/games\/catan$/);

      // A game that is only in "my games" sits on no community shelf, so the games list does not show it;
      // it is on the profile, and its detail page (BGG data and credit) still opens by direct link.
      await games.goto();
      await expect(games.count()).toHaveText('9 jogos encontrados');
      await expect(games.card('CATAN')).toHaveCount(0);
      await page.goto('profile');
      await expect(page.getByRole('region', { name: 'Os meus jogos' }).getByRole('link', { name: 'CATAN' })).toBeVisible();
      await page.goto('games/catan');
      const bgg = page.getByRole('region', { name: 'Dados do BoardGameGeek' });
      await expect(bgg).toContainText('Klaus Teuber');
      await expect(bgg.getByRole('link', { name: 'Ver no BoardGameGeek' })).toHaveAttribute('href', 'https://boardgamegeek.com/boardgame/13');
      await expect(bgg.getByRole('link', { name: /Powered by BGG/ })).toBeVisible();
    });

    test('mostra um traço quando o BGG não conhece jogadores nem duração e não os confunde com filtros', async ({ page, backend }) => {
      // Imported into a community the player owns, so it shows up in the games list.
      backend.db.memberships.push({ id: 'm-porto-owner', user_id: PLAYER.id, community_id: PORTO, role: 'owner', status: 'active', joined_at: '2026-01-03T10:00:00.000Z' });
      await page.goto('games/import?community=tabuleiros-do-porto');
      await expect(page.getByLabel('Adicionar a')).toHaveValue(PORTO);
      await page.getByRole('searchbox', { name: 'Nome do jogo' }).fill('obscuro');
      await page.getByRole('button', { name: 'Pesquisar' }).click();
      await page.getByRole('button', { name: /^Importar Jogo Obscuro/ }).click();
      await expect(page.getByText(/Jogo Obscuro: A Vingança foi adicionado/)).toBeVisible();

      const games = new GamesPage(page);
      await games.goto();
      const card = games.card('Jogo Obscuro: A Vingança');
      await expect(card).toContainText('—');
      await games.players().selectOption({ label: '2 jogadores' });
      await expect(card).toHaveCount(0);
    });

    test('importa para a estante de uma comunidade que o jogador gere e o jogo aparece em Jogos', async ({ page, backend }) => {
      backend.db.memberships.push({ id: 'm-porto-owner', user_id: PLAYER.id, community_id: PORTO, role: 'owner', status: 'active', joined_at: '2026-01-03T10:00:00.000Z' });
      await page.goto('communities/tabuleiros-do-porto');
      await page.getByRole('tab', { name: 'Jogos' }).click();
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

      // The player belongs to Porto, so the game is in their games list even without a location.
      const games = new GamesPage(page);
      await games.goto();
      await expect(games.shelves('CATAN')).toHaveText(['Tabuleiros do Porto']);
    });

    test('um membro sem gestão só vê os seus jogos como destino', async ({ page }) => {
      await page.goto('games/import');
      await expect(page.getByLabel('Adicionar a').locator('option')).toHaveText(['Os meus jogos']);
    });

    test('explica falhas do BoardGameGeek sem expor detalhes', async ({ page, backend }) => {
      backend.fail(/POST \/functions\/v1\/bgg/, { status: 429, body: { error: { code: 'rate_limited', message: 'x' } } }, 1);
      await page.goto('games/import');
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
