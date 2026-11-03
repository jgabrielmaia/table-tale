import { LibraryPage } from '../pages/LibraryPage';
import { AppShell } from '../pages/AppShell';
import { expect, test } from '../fixtures';

const ALL_TITLES = ['Cartas Clássico', 'Cores com Dicas', 'Coup', 'Dixit', 'Duelo por Cardia', 'Hitster', 'Tranquility', 'Uno', 'Vaalbara'];

test.describe('Biblioteca', () => {
  test.describe('visitante', () => {
    test('lista todos os jogos com a contagem certa @smoke', async ({ page }) => {
      const library = new LibraryPage(page);
      await library.goto();
      await expect(library.count()).toHaveText('9 jogos encontrados');
      expect((await library.titles()).sort()).toEqual([...ALL_TITLES].sort());
      await expect(library.card('Cartas Clássico')).toContainText('2 exemplares');
      await expect(library.card('Dixit')).toContainText('Dono da Estante');
    });

    test('convida a entrar e desativa os filtros pessoais', async ({ page }) => {
      const library = new LibraryPage(page);
      await library.goto();
      await expect(page.getByRole('note').filter({ hasText: 'Entra para marcar favoritos' })).toBeVisible();
      await expect(library.status()).toBeDisabled();
      await expect(library.favoritesOnly()).toBeDisabled();
      await expect(library.favoriteToggle('Dixit')).toHaveCount(0);
    });

    test('pesquisa por nome ignorando maiúsculas e acentos', async ({ page }) => {
      const library = new LibraryPage(page);
      await library.goto();
      await library.search().fill('CLASSICO');
      await expect(library.count()).toHaveText('1 jogo encontrado');
      await expect(library.card('Cartas Clássico')).toBeVisible();
      await library.search().fill('  dixit ');
      await expect(library.count()).toHaveText('1 jogo encontrado');
    });

    test('mostra o estado vazio da pesquisa e limpa os filtros', async ({ page }) => {
      const library = new LibraryPage(page);
      await library.goto();
      await library.search().fill('zzz');
      await expect(page.getByRole('heading', { name: 'Nenhum jogo encontrado nesta estante' })).toBeVisible();
      await expect(page.getByText('Não encontrámos nada para «zzz».')).toBeVisible();
      await page.getByRole('main').getByRole('button', { name: 'Limpar filtros' }).last().click();
      await expect(library.count()).toHaveText('9 jogos encontrados');
      await expect(library.search()).toHaveValue('');
    });

    test('filtra por género, número de jogadores e duração', async ({ page }) => {
      const library = new LibraryPage(page);
      await library.goto();

      await library.genre().selectOption({ label: 'Cooperativo' });
      await expect(library.count()).toHaveText('1 jogo encontrado');
      await expect(library.card('Tranquility')).toBeVisible();
      await library.genre().selectOption({ label: 'Todos' });

      await library.players().selectOption({ label: '2 jogadores' });
      await expect(library.count()).toHaveText('7 jogos encontrados');
      await expect(library.card('Dixit')).toHaveCount(0);
      await library.players().selectOption({ label: 'Qualquer número' });

      await library.duration().selectOption({ label: 'Até 30 min' });
      await expect(library.count()).toHaveText('8 jogos encontrados');
      await expect(library.card('Vaalbara')).toHaveCount(0);

      await library.duration().selectOption({ label: 'Mais de 2 h' });
      await expect(page.getByRole('heading', { name: 'Nenhum jogo encontrado nesta estante' })).toBeVisible();
    });

    test('combina filtros e o botão Limpar filtros repõe tudo', async ({ page }) => {
      const library = new LibraryPage(page);
      await library.goto();
      await library.players().selectOption({ label: '3–4 jogadores' });
      await library.duration().selectOption({ label: 'Até 30 min' });
      await library.search().fill('dix');
      await expect(library.count()).toHaveText('1 jogo encontrado');
      await library.filters().getByRole('button', { name: 'Limpar filtros' }).click();
      await expect(library.count()).toHaveText('9 jogos encontrados');
      await expect(library.players()).toHaveValue('');
    });

    test('a pesquisa fica no endereço e sobrevive ao recarregar', async ({ page }) => {
      const library = new LibraryPage(page);
      await library.goto();
      await library.search().fill('dixit');
      await expect(page).toHaveURL(/\?q=dixit$/);
      await page.reload();
      await expect(library.search()).toHaveValue('dixit');
      await expect(library.count()).toHaveText('1 jogo encontrado');
      await library.goto('?q=coup');
      await expect(library.card('Coup')).toBeVisible();
    });

    test('um texto de pesquisa muito longo não parte o layout', async ({ page }) => {
      const library = new LibraryPage(page);
      await library.goto();
      await library.search().fill('x'.repeat(400));
      await expect(page.getByRole('heading', { name: 'Nenhum jogo encontrado nesta estante' })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });

    test('abrir um cartão leva ao detalhe do jogo @smoke', async ({ page }) => {
      const library = new LibraryPage(page);
      await library.goto();
      await library.card('Dixit').getByRole('link').first().click();
      await expect(page).toHaveURL(/\/games\/dixit$/);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dixit');
    });
  });

  test.describe('estados da página', () => {
    test('mostra o estado de carregamento enquanto a coleção chega', async ({ page, backend }) => {
      const release = backend.hold(/GET \/rest\/v1\/games/);
      const library = new LibraryPage(page);
      await library.goto();
      await expect(page.getByRole('status').filter({ hasText: 'A carregar a coleção…' })).toBeAttached();
      release();
      await expect(library.count()).toHaveText('9 jogos encontrados');
    });

    test('mostra o erro e recupera com Tentar novamente', async ({ page, backend }) => {
      const unfail = backend.fail(/GET \/rest\/v1\/games/, { status: 500, body: { code: 'XX000', message: 'falha simulada' } });
      const library = new LibraryPage(page);
      await library.goto();
      await expect(page.getByText('Algo correu mal')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(/Não foi possível carregar a biblioteca: falha simulada/)).toBeVisible();
      unfail();
      await page.getByRole('button', { name: 'Tentar novamente' }).click();
      await expect(library.count()).toHaveText('9 jogos encontrados');
    });

    test('trata uma falha de rede como erro recuperável', async ({ page, backend }) => {
      // O cliente repete pedidos GET falhados (postgrest + react-query) antes de desistir, por isso o erro demora a aparecer.
      test.setTimeout(75_000);
      const unfail = backend.fail(/GET \/rest\/v1\/games/, 'network');
      await new LibraryPage(page).goto();
      await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible({ timeout: 60_000 });
      unfail();
      await page.getByRole('button', { name: 'Tentar novamente' }).click();
      await expect(page.getByRole('heading', { name: 'Dixit', level: 3 })).toBeVisible();
    });

    test('mostra o estado vazio quando a estante não tem jogos', async ({ page, backend }) => {
      backend.db.games = [];
      await new LibraryPage(page).goto();
      await expect(page.getByRole('heading', { name: 'A estante está vazia' })).toBeVisible();
    });
  });

  test.describe('jogador com sessão', () => {
    test.beforeEach(async ({ signIn }) => {
      await signIn();
    });

    test('marca e desmarca favoritos, avisa e persiste após recarregar @smoke', async ({ page, backend }) => {
      const library = new LibraryPage(page);
      const shell = new AppShell(page);
      await library.goto();

      await library.favoriteToggle('Dixit').click();
      await expect(library.favoriteToggle('Dixit')).toHaveAttribute('aria-pressed', 'true');
      await expect(shell.toast('Adicionado aos favoritos')).toBeVisible();
      await expect(library.card('Dixit').getByText('Favorito')).toBeAttached();
      expect(backend.db.gameStatus.filter((s) => s.is_favorite)).toHaveLength(1);

      await page.reload();
      await expect(library.favoriteToggle('Dixit')).toHaveAttribute('aria-pressed', 'true');
      await library.favoritesOnly().check();
      await expect(library.count()).toHaveText('1 jogo encontrado');

      await library.favoritesOnly().uncheck();
      await library.favoriteToggle('Dixit').click();
      await expect(shell.toast('Removido dos favoritos')).toBeVisible();
      await expect(library.favoriteToggle('Dixit')).toHaveAttribute('aria-pressed', 'false');
    });

    test('altera o estado de um jogo e filtra por esse estado', async ({ page }) => {
      const library = new LibraryPage(page);
      await library.goto();
      await library.statusSelect('Dixit').selectOption({ label: 'Concluído' });
      await expect(new AppShell(page).toast('Dixit: Concluído')).toBeVisible();
      await library.status().selectOption({ label: 'Concluído' });
      await expect(library.count()).toHaveText('1 jogo encontrado');
      await expect(library.card('Dixit')).toBeVisible();

      await page.reload();
      await library.status().selectOption({ label: 'Concluído' });
      await expect(library.card('Dixit')).toBeVisible();
    });

    test('desfaz a alteração e avisa quando a gravação falha', async ({ page, backend }) => {
      backend.fail(/POST \/rest\/v1\/user_game_status/, { status: 500, body: { code: 'XX000', message: 'falha simulada' } });
      const library = new LibraryPage(page);
      await library.goto();
      await library.favoriteToggle('Dixit').click();
      await expect(new AppShell(page).toast(/Não foi possível guardar o estado: falha simulada/)).toBeVisible();
      await expect(library.favoriteToggle('Dixit')).toHaveAttribute('aria-pressed', 'false');
    });

    test('explica a falta de permissão com uma mensagem compreensível', async ({ page, backend }) => {
      backend.fail(/POST \/rest\/v1\/user_game_status/, { status: 403, body: { code: '42501', message: 'new row violates row-level security policy' } });
      const library = new LibraryPage(page);
      await library.goto();
      await library.favoriteToggle('Uno').click();
      await expect(new AppShell(page).toast('Não tens permissão para esta ação.')).toBeVisible();
    });

    test('um token expirado a meio da utilização mostra erro e não altera o estado', async ({ page, backend }) => {
      backend.fail(/POST \/rest\/v1\/user_game_status/, { status: 401, body: { code: 'PGRST301', message: 'JWT expired' } });
      const library = new LibraryPage(page);
      await library.goto();
      await library.favoriteToggle('Uno').click();
      await expect(new AppShell(page).toast(/JWT expired/)).toBeVisible();
      await expect(library.favoriteToggle('Uno')).toHaveAttribute('aria-pressed', 'false');
    });

    test('bloqueia o botão enquanto grava e não duplica o pedido', async ({ page, backend }) => {
      const release = backend.hold(/POST \/rest\/v1\/user_game_status/);
      const library = new LibraryPage(page);
      await library.goto();
      await library.favoriteToggle('Coup').click();
      await expect(library.favoriteToggle('Coup')).toBeDisabled();
      release();
      await expect(library.favoriteToggle('Coup')).toBeEnabled();
      expect(backend.calls(/POST \/rest\/v1\/user_game_status/)).toHaveLength(1);
    });

    test('os filtros pessoais ficam disponíveis', async ({ page }) => {
      const library = new LibraryPage(page);
      await library.goto();
      await expect(library.status()).toBeEnabled();
      await expect(library.favoritesOnly()).toBeEnabled();
      await expect(page.getByRole('note').filter({ hasText: 'Entra para marcar favoritos' })).toHaveCount(0);
    });
  });
});
