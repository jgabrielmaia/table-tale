import { GamesPage } from '../pages/GamesPage';
import { AppShell } from '../pages/AppShell';
import { expect, test, PLAYER } from '../fixtures';

const ALL_TITLES = ['Baralho Clássico', 'Cores com Dicas', 'Coup', 'Dixit', 'Duelo por Cardia', 'Hitster', 'Tranquility', 'Uno', 'Vaalbara'];
/** What the Porto shelf holds (see tests/data/seed.ts). */
const PORTO_TITLES = ['Coup', 'Dixit', 'Vaalbara'];
const LISBOA = '00000000-0000-4000-a000-000000000001';
const BRAGA = '00000000-0000-4000-a000-000000000003';

test.describe('Jogos', () => {
  test.describe('visitante em Lisboa', () => {
    // Table Tale Lisboa (~3 km) holds the whole catalogue; Porto and Braga are far outside the default 20 km.
    test.beforeEach(async ({ locateAt }) => {
      await locateAt('lisboa');
    });

    test('lista os jogos das comunidades perto, com a comunidade, exemplares e distância @smoke', async ({ page }) => {
      const games = new GamesPage(page);
      await games.goto();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Jogos');
      await expect(games.where()).toHaveText('Perto da tua localização atual');
      await expect(games.count()).toHaveText('9 jogos encontrados');
      expect((await games.titles()).sort()).toEqual([...ALL_TITLES].sort());
      await expect(games.shelves('Baralho Clássico')).toHaveText([/^Table Tale Lisboa\s*×2\s*\d\.\d km$/]);
      await expect(games.shelves('Dixit')).toHaveText([/^Table Tale Lisboa\s*\d\.\d km$/]);
    });

    test('os filtros pessoais ficam desativados e não há favoritos', async ({ page }) => {
      const games = new GamesPage(page);
      await games.goto();
      await expect(games.status()).toBeDisabled();
      await expect(games.favoritesOnly()).toBeDisabled();
      await expect(games.favoriteToggle('Dixit')).toHaveCount(0);
    });

    test('pesquisa por nome ignorando maiúsculas e acentos', async ({ page }) => {
      const games = new GamesPage(page);
      await games.goto();
      await games.search().fill('CLASSICO');
      await expect(games.count()).toHaveText('1 jogo encontrado');
      await expect(games.card('Baralho Clássico')).toBeVisible();
      await games.search().fill('  dixit ');
      await expect(games.count()).toHaveText('1 jogo encontrado');
    });

    test('mostra o estado vazio da pesquisa e limpa os filtros', async ({ page }) => {
      const games = new GamesPage(page);
      await games.goto();
      await games.search().fill('zzz');
      await expect(page.getByRole('heading', { name: 'Nenhum jogo encontrado' })).toBeVisible();
      await expect(page.getByText('Não encontrámos nada para «zzz».')).toBeVisible();
      await page.getByRole('main').getByRole('button', { name: 'Limpar filtros' }).last().click();
      await expect(games.count()).toHaveText('9 jogos encontrados');
      await expect(games.search()).toHaveValue('');
    });

    test('filtra por categoria e mecânica do BGG, número de jogadores e duração', async ({ page }) => {
      const games = new GamesPage(page);
      await games.goto();

      await games.category().selectOption({ label: 'Music' });
      await expect(games.count()).toHaveText('1 jogo encontrado');
      await expect(games.card('Hitster')).toBeVisible();
      await games.category().selectOption({ label: 'Todos' });

      await games.mechanic().selectOption({ label: 'Cooperative Game' });
      await expect(games.count()).toHaveText('1 jogo encontrado');
      await expect(games.card('Tranquility')).toBeVisible();
      await games.mechanic().selectOption({ label: 'Todos' });

      await games.players().selectOption({ label: '2 jogadores' });
      await expect(games.count()).toHaveText('7 jogos encontrados');
      await expect(games.card('Dixit')).toHaveCount(0);
      await games.players().selectOption({ label: 'Qualquer número' });

      await games.duration().selectOption({ label: 'Até 30 min' });
      await expect(games.count()).toHaveText('8 jogos encontrados');
      await expect(games.card('Vaalbara')).toHaveCount(0);

      await games.duration().selectOption({ label: 'Mais de 2 h' });
      await expect(page.getByRole('heading', { name: 'Nenhum jogo encontrado' })).toBeVisible();
    });

    test('combina filtros e o botão Limpar filtros repõe tudo', async ({ page }) => {
      const games = new GamesPage(page);
      await games.goto();
      await games.players().selectOption({ label: '3–4 jogadores' });
      await games.duration().selectOption({ label: 'Até 30 min' });
      await games.search().fill('dix');
      await expect(games.count()).toHaveText('1 jogo encontrado');
      await games.filters().getByRole('button', { name: 'Limpar filtros' }).click();
      await expect(games.count()).toHaveText('9 jogos encontrados');
      await expect(games.players()).toHaveValue('');
    });

    test('a pesquisa fica no endereço e sobrevive ao recarregar', async ({ page }) => {
      const games = new GamesPage(page);
      await games.goto();
      await games.search().fill('dixit');
      await expect(page).toHaveURL(/\?q=dixit$/);
      await page.reload();
      await expect(games.search()).toHaveValue('dixit');
      await expect(games.count()).toHaveText('1 jogo encontrado');
      await games.goto('?q=coup');
      await expect(games.card('Coup')).toBeVisible();
    });

    test('um texto de pesquisa muito longo não parte o layout', async ({ page }) => {
      const games = new GamesPage(page);
      await games.goto();
      await games.search().fill('x'.repeat(400));
      await expect(page.getByRole('heading', { name: 'Nenhum jogo encontrado' })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });

    test('abrir um cartão leva ao detalhe do jogo @smoke', async ({ page }) => {
      const games = new GamesPage(page);
      await games.goto();
      await games.card('Dixit').getByRole('link').first().click();
      await expect(page).toHaveURL(/\/games\/dixit$/);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dixit');
    });

    test('jogos do catálogo que não estão em nenhuma estante não aparecem', async ({ page, backend }) => {
      backend.db.communityGames = backend.db.communityGames.filter((g) => g.game_id !== backend.db.games.find((x) => x.slug === 'hitster')!.id);
      const games = new GamesPage(page);
      await games.goto();
      await expect(games.count()).toHaveText('8 jogos encontrados');
      await expect(games.card('Hitster')).toHaveCount(0);
      // O detalhe continua acessível por ligação direta.
      await page.goto('games/hitster');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hitster');
    });
  });

  test.describe('localização e raio', () => {
    test('sem localização: pede uma cidade, só com comunidades públicas, e lembra a escolha @smoke', async ({ page }) => {
      const games = new GamesPage(page);
      await games.goto();
      await expect(games.where()).toHaveText(/Sem localização/);
      await expect(page.getByRole('heading', { name: 'Ainda não há jogos ao teu alcance' })).toBeVisible();
      await expect(page.getByText('Define a tua localização para ver os jogos das comunidades perto de ti.')).toBeVisible();
      // Braga é privada: a sua cidade não é oferecida a quem não pertence.
      await expect(games.city().locator('option')).toHaveText(['Escolhe uma cidade', 'Lisboa', 'Porto']);

      await games.city().selectOption({ label: 'Porto' });
      await expect(games.where()).toHaveText('Perto de Porto');
      await expect(games.count()).toHaveText('3 jogos encontrados');
      expect((await games.titles()).sort()).toEqual(PORTO_TITLES);

      await page.reload();
      await expect(games.city()).toHaveValue('porto');
      await expect(games.count()).toHaveText('3 jogos encontrados');
    });

    test('o estado vazio leva à descoberta de comunidades', async ({ page }) => {
      await new GamesPage(page).goto();
      await page.getByRole('main').getByRole('link', { name: 'Procurar uma comunidade' }).click();
      await expect(page).toHaveURL(/\/communities$/);
    });

    test('Usar a minha localização substitui a cidade escolhida', async ({ page }) => {
      const games = new GamesPage(page);
      await games.goto();
      await games.city().selectOption({ label: 'Porto' });
      await expect(games.count()).toHaveText('3 jogos encontrados');

      // A partir de agora o browser devolve uma posição em Lisboa.
      await page.evaluate(() => localStorage.setItem('e2e-geo', JSON.stringify({ latitude: 38.7223, longitude: -9.1393 })));
      await games.useMyLocation().click();
      await expect(games.where()).toHaveText('Perto da tua localização atual');
      await expect(games.count()).toHaveText('9 jogos encontrados');
      await expect(games.useMyLocation()).toHaveCount(0);
    });

    test('no Porto vê só a estante do Porto, com exemplares e distância', async ({ page, locateAt }) => {
      await locateAt('porto');
      const games = new GamesPage(page);
      await games.goto();
      await expect(games.count()).toHaveText('3 jogos encontrados');
      expect((await games.titles()).sort()).toEqual(PORTO_TITLES);
      await expect(games.shelves('Coup')).toHaveText([/^Tabuleiros do Porto\s*×3\s*1\.\d km$/]);
    });

    test('alargar o raio junta comunidades mais longe e fica guardado', async ({ page, backend, locateAt }) => {
      // Braga (~41 km do Porto) passa a pública só neste teste.
      backend.db.communities.find((c) => c.id === BRAGA)!.visibility = 'public';
      await locateAt('porto');
      const games = new GamesPage(page);
      await games.goto();
      await expect(games.radius()).toHaveValue('20');
      await expect(games.count()).toHaveText('3 jogos encontrados');

      await games.radius().selectOption({ label: '50 km' });
      await expect(games.count()).toHaveText('4 jogos encontrados');
      await expect(games.shelves('Uno')).toHaveText([/^Clube Secreto de Braga\s*4[0-9] km$/]);

      await page.reload();
      await expect(games.radius()).toHaveValue('50');
      await expect(games.count()).toHaveText('4 jogos encontrados');

      await games.radius().selectOption({ label: '5 km' });
      await expect(games.count()).toHaveText('3 jogos encontrados');
    });

    test('uma comunidade privada perto não mostra os jogos a quem não pertence', async ({ page, locateAt }) => {
      await locateAt('braga');
      await new GamesPage(page).goto();
      await expect(page.getByRole('heading', { name: 'Ainda não há jogos ao teu alcance' })).toBeVisible();
      await expect(page.getByText('Nenhuma comunidade a menos de 20 km tem jogos na estante.', { exact: false })).toBeVisible();
    });
  });

  test.describe('jogador com comunidades', () => {
    // O jogador é membro ativo de Table Tale Lisboa (seed).
    test.beforeEach(async ({ signIn }) => {
      await signIn();
    });

    test('sem localização vê os jogos das suas comunidades', async ({ page }) => {
      const games = new GamesPage(page);
      await games.goto();
      await expect(games.where()).toHaveText(/só vês as tuas comunidades/);
      await expect(games.count()).toHaveText('9 jogos encontrados');
      await expect(games.shelves('Dixit')).toHaveText(['Table Tale Lisboa']);
    });

    test('no Porto junta a estante perto às suas comunidades, a mais perto primeiro', async ({ page, locateAt }) => {
      await locateAt('porto');
      const games = new GamesPage(page);
      await games.goto();
      await expect(games.count()).toHaveText('9 jogos encontrados');
      await expect(games.shelves('Dixit')).toHaveText([/^Tabuleiros do Porto\s*1\.\d km$/, /^Table Tale Lisboa\s*27[0-9] km$/]);
      await expect(games.shelves('Hitster')).toHaveText([/^Table Tale Lisboa\s*27[0-9] km$/]);
    });

    test('filtra por comunidade e ordena por distância', async ({ page, locateAt }) => {
      await locateAt('porto');
      const games = new GamesPage(page);
      await games.goto();
      await expect(games.community().locator('option')).toHaveText(['Todos', 'Table Tale Lisboa', 'Tabuleiros do Porto']);

      await games.community().selectOption({ label: 'Tabuleiros do Porto' });
      await expect(games.count()).toHaveText('3 jogos encontrados');
      await games.community().selectOption({ label: 'Todos' });

      await games.sort().selectOption({ label: 'Mais perto' });
      expect((await games.titles()).slice(0, 3)).toEqual(PORTO_TITLES);
      await games.sort().selectOption({ label: 'Nome' });
      expect(await games.titles()).toEqual([...ALL_TITLES].sort((a, b) => a.localeCompare(b, 'pt')));
    });

    test('uma comunidade privada a que pertence aparece mesmo longe; um pedido pendente não conta', async ({ page, backend, locateAt }) => {
      await locateAt('lisboa');
      backend.db.memberships.push({ id: 'm-braga-pending', user_id: PLAYER.id, community_id: BRAGA, role: 'member', status: 'pending', joined_at: '2026-01-03T10:00:00.000Z' });
      const games = new GamesPage(page);
      await games.goto();
      await expect(games.shelves('Uno')).toHaveText([/^Table Tale Lisboa/]);

      backend.db.memberships.find((m) => m.id === 'm-braga-pending')!.status = 'active';
      await page.reload();
      await expect(games.shelves('Uno')).toHaveText([/^Table Tale Lisboa/, /^Clube Secreto de Braga\s*\d{3} km$/]);
    });

    test('quem não tem comunidades nem localização é convidado a procurar uma', async ({ page, backend }) => {
      backend.db.memberships = backend.db.memberships.filter((m) => !(m.user_id === PLAYER.id && m.community_id === LISBOA));
      await new GamesPage(page).goto();
      await expect(page.getByRole('heading', { name: 'Ainda não há jogos ao teu alcance' })).toBeVisible();
      await expect(page.getByRole('main').getByRole('link', { name: 'Procurar uma comunidade' })).toBeVisible();
    });
  });

  test.describe('estados da página', () => {
    test.beforeEach(async ({ locateAt }) => {
      await locateAt('lisboa');
    });

    test('mostra o estado de carregamento enquanto as estantes chegam', async ({ page, backend }) => {
      const release = backend.hold(/GET \/rest\/v1\/community_games/);
      const games = new GamesPage(page);
      await games.goto();
      await expect(page.getByRole('status').filter({ hasText: 'A carregar os jogos…' })).toBeAttached();
      release();
      await expect(games.count()).toHaveText('9 jogos encontrados');
    });

    test('mostra o erro e recupera com Tentar novamente', async ({ page, backend }) => {
      const unfail = backend.fail(/GET \/rest\/v1\/community_games/, { status: 500, body: { code: 'XX000', message: 'falha simulada' } });
      const games = new GamesPage(page);
      await games.goto();
      await expect(page.getByText('Algo correu mal')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(/Não foi possível carregar os jogos: falha simulada/)).toBeVisible();
      unfail();
      await page.getByRole('button', { name: 'Tentar novamente' }).click();
      await expect(games.count()).toHaveText('9 jogos encontrados');
    });

    test('trata uma falha de rede como erro recuperável', async ({ page, backend }) => {
      // O cliente repete pedidos GET falhados (postgrest + react-query) antes de desistir, por isso o erro demora a aparecer.
      test.setTimeout(75_000);
      const unfail = backend.fail(/GET \/rest\/v1\/games/, 'network');
      await new GamesPage(page).goto();
      await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible({ timeout: 60_000 });
      unfail();
      await page.getByRole('button', { name: 'Tentar novamente' }).click();
      await expect(page.getByRole('heading', { name: 'Dixit', level: 3 })).toBeVisible();
    });

    test('mostra o estado vazio quando nenhuma estante perto tem jogos', async ({ page, backend }) => {
      backend.db.communityGames = [];
      await new GamesPage(page).goto();
      await expect(page.getByRole('heading', { name: 'Ainda não há jogos ao teu alcance' })).toBeVisible();
    });
  });

  test.describe('jogador com sessão', () => {
    test.beforeEach(async ({ signIn, locateAt }) => {
      await signIn();
      await locateAt('lisboa');
    });

    test('o favorito e o estado ficam visíveis dentro do cartão', async ({ page }) => {
      // Regression: the card clips what overflows, and these controls used to sit below its bottom edge.
      const games = new GamesPage(page);
      await games.goto();
      const card = await games.card('Dixit').boundingBox();
      for (const control of [games.favoriteToggle('Dixit'), games.statusSelect('Dixit')]) {
        const box = (await control.boundingBox())!;
        expect(box.y + box.height).toBeLessThanOrEqual(card!.y + card!.height);
        expect(box.y).toBeGreaterThanOrEqual(card!.y);
      }
    });

    test('marca e desmarca favoritos, avisa e persiste após recarregar @smoke', async ({ page, backend }) => {
      const games = new GamesPage(page);
      const shell = new AppShell(page);
      await games.goto();

      await games.favoriteToggle('Dixit').click();
      await expect(games.favoriteToggle('Dixit')).toHaveAttribute('aria-pressed', 'true');
      await expect(shell.toast('Adicionado aos favoritos')).toBeVisible();
      await expect(games.card('Dixit').getByText('Favorito')).toBeAttached();
      expect(backend.db.gameStatus.filter((s) => s.is_favorite)).toHaveLength(1);

      await page.reload();
      await expect(games.favoriteToggle('Dixit')).toHaveAttribute('aria-pressed', 'true');
      await games.favoritesOnly().check();
      await expect(games.count()).toHaveText('1 jogo encontrado');

      await games.favoritesOnly().uncheck();
      await games.favoriteToggle('Dixit').click();
      await expect(shell.toast('Removido dos favoritos')).toBeVisible();
      await expect(games.favoriteToggle('Dixit')).toHaveAttribute('aria-pressed', 'false');
    });

    test('altera o estado de um jogo e filtra por esse estado', async ({ page }) => {
      const games = new GamesPage(page);
      await games.goto();
      await games.statusSelect('Dixit').selectOption({ label: 'Concluído' });
      await expect(new AppShell(page).toast('Dixit: Concluído')).toBeVisible();
      await games.status().selectOption({ label: 'Concluído' });
      await expect(games.count()).toHaveText('1 jogo encontrado');
      await expect(games.card('Dixit')).toBeVisible();

      await page.reload();
      await games.status().selectOption({ label: 'Concluído' });
      await expect(games.card('Dixit')).toBeVisible();
    });

    test('desfaz a alteração e avisa quando a gravação falha', async ({ page, backend }) => {
      backend.fail(/POST \/rest\/v1\/user_game_status/, { status: 500, body: { code: 'XX000', message: 'falha simulada' } });
      const games = new GamesPage(page);
      await games.goto();
      await games.favoriteToggle('Dixit').click();
      await expect(new AppShell(page).toast(/Não foi possível guardar o estado: falha simulada/)).toBeVisible();
      await expect(games.favoriteToggle('Dixit')).toHaveAttribute('aria-pressed', 'false');
    });

    test('explica a falta de permissão com uma mensagem compreensível', async ({ page, backend }) => {
      backend.fail(/POST \/rest\/v1\/user_game_status/, { status: 403, body: { code: '42501', message: 'new row violates row-level security policy' } });
      const games = new GamesPage(page);
      await games.goto();
      await games.favoriteToggle('Uno').click();
      await expect(new AppShell(page).toast('Não tens permissão para esta ação.')).toBeVisible();
    });

    test('um token expirado a meio da utilização mostra erro e não altera o estado', async ({ page, backend }) => {
      backend.fail(/POST \/rest\/v1\/user_game_status/, { status: 401, body: { code: 'PGRST301', message: 'JWT expired' } });
      const games = new GamesPage(page);
      await games.goto();
      await games.favoriteToggle('Uno').click();
      await expect(new AppShell(page).toast(/JWT expired/)).toBeVisible();
      await expect(games.favoriteToggle('Uno')).toHaveAttribute('aria-pressed', 'false');
    });

    test('bloqueia o botão enquanto grava e não duplica o pedido', async ({ page, backend }) => {
      const release = backend.hold(/POST \/rest\/v1\/user_game_status/);
      const games = new GamesPage(page);
      await games.goto();
      await games.favoriteToggle('Coup').click();
      await expect(games.favoriteToggle('Coup')).toBeDisabled();
      release();
      await expect(games.favoriteToggle('Coup')).toBeEnabled();
      expect(backend.calls(/POST \/rest\/v1\/user_game_status/)).toHaveLength(1);
    });

    test('os filtros pessoais ficam disponíveis', async ({ page }) => {
      const games = new GamesPage(page);
      await games.goto();
      await expect(games.status()).toBeEnabled();
      await expect(games.favoritesOnly()).toBeEnabled();
    });
  });
});
