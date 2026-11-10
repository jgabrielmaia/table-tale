import { AppShell } from '../pages/AppShell';
import { GamePage } from '../pages/GamePage';
import { expect, test, PLAYER } from '../fixtures';

test.describe('Detalhe do jogo', () => {
  test.describe('visitante', () => {
    test('mostra a ficha completa do jogo @smoke', async ({ page }) => {
      const game = new GamePage(page);
      await game.goto('dixit');
      await expect(game.title()).toHaveText('Dixit');
      await expect(page.getByText('Escolhe uma carta ilustrada')).toBeVisible();
      const facts = page.getByRole('definition');
      await expect(facts.filter({ hasText: /3.6 jogadores/ })).toBeVisible();
      await expect(facts.filter({ hasText: '~30 min' })).toBeVisible();
      await expect(page.getByRole('term').filter({ hasText: 'Proprietário' })).toBeVisible();
      await expect(page.getByRole('definition').filter({ hasText: 'Dono da Estante' })).toBeVisible();
      await expect(page).toHaveTitle(/^Dixit – /);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/games\/dixit\/$/);
    });

    test('convida a entrar e esconde o diário pessoal', async ({ page }) => {
      const game = new GamePage(page);
      await game.goto('dixit');
      await expect(page.getByRole('note').filter({ hasText: 'Entra para alterar o estado' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'O diário é pessoal' })).toBeVisible();
      await expect(game.form()).toHaveCount(0);
      await page.getByRole('main').getByRole('link', { name: 'Entrar' }).last().click();
      await expect(page).toHaveURL(/\/login$/);
    });

    test('sugere jogos relacionados e navega até eles', async ({ page }) => {
      const game = new GamePage(page);
      await game.goto('dixit');
      const related = page.getByRole('region', { name: 'Jogos relacionados' });
      await expect(related.getByRole('heading', { level: 3 }).first()).toBeVisible();
      await related.getByRole('link').first().click();
      await expect(page).toHaveURL(/\/games\/(?!dixit$)[a-z-]+$/);
    });

    test('um jogo inexistente mostra a mensagem e não é indexável', async ({ page }) => {
      await page.goto('games/nao-existe');
      await expect(page.getByRole('heading', { name: 'Este jogo não consta da estante' })).toBeVisible();
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      await page.getByRole('link', { name: 'Voltar aos jogos' }).first().click();
      await expect(page).toHaveURL(/\/games$/);
    });

    test('falha ao carregar o jogo mostra erro', async ({ page, backend }) => {
      backend.fail(/GET \/rest\/v1\/games/, { status: 500, body: { code: 'XX000', message: 'falha simulada' } });
      await new GamePage(page).goto('dixit');
      await expect(page.getByText(/falha simulada/)).toBeVisible({ timeout: 15_000 });
    });
  });

  test.describe('jogador com sessão', () => {
    test.beforeEach(async ({ signIn }) => {
      await signIn();
    });

    test('altera o estado e mantém-no após recarregar', async ({ page, backend }) => {
      const game = new GamePage(page);
      await game.goto('dixit');
      await game.statusGroup().getByLabel('A jogar').click();
      await expect(game.statusGroup().getByLabel('A jogar')).toBeChecked();
      await expect(new AppShell(page).toast('Estado atualizado: A jogar')).toBeVisible();
      expect(backend.db.gameStatus[0]).toMatchObject({ status: 'in_progress', user_id: PLAYER.id });
      await page.reload();
      await expect(game.statusGroup().getByLabel('A jogar')).toBeChecked();
    });

    test('adiciona e remove dos favoritos', async ({ page }) => {
      const game = new GamePage(page);
      await game.goto('dixit');
      await game.favorite().click();
      await expect(game.favorite()).toHaveText('Nos favoritos');
      await expect(game.favorite()).toHaveAttribute('aria-pressed', 'true');
      await page.reload();
      await expect(game.favorite()).toHaveAttribute('aria-pressed', 'true');
      await game.favorite().click();
      await expect(game.favorite()).toHaveText('Adicionar aos favoritos');
    });

    test('"Marcar como jogado hoje" cria uma sessão e passa o jogo para «A jogar» @smoke', async ({ page, backend }) => {
      const game = new GamePage(page);
      await game.goto('dixit');
      await expect(page.getByRole('heading', { name: 'Ainda não há sessões registadas' })).toBeVisible();
      await game.markToday().click();
      await expect(new AppShell(page).toast('Sessão de hoje registada')).toBeVisible();
      await expect(game.sessions()).toHaveCount(1);
      await expect(game.statusGroup().getByLabel('A jogar')).toBeChecked();
      expect(backend.db.sessions[0]).toMatchObject({ duration_minutes: 30, user_id: PLAYER.id });
    });

    test('regista uma sessão completa, limpa o formulário e persiste @smoke', async ({ page, backend }) => {
      const game = new GamePage(page);
      await game.goto('dixit');
      await game.players().fill('4');
      await game.star(4).click();
      await expect(game.star(4)).toBeChecked();
      await game.notes().fill('Ganhou a Ana com uma dica perfeita.');
      await game.submit().click();

      await expect(new AppShell(page).toast('Sessão registada no diário')).toBeVisible();
      await expect(game.sessions()).toHaveCount(1);
      const item = game.sessions().first();
      await expect(item).toContainText('4 jogadores');
      await expect(item).toContainText('30 min');
      await expect(item).toContainText('Ganhou a Ana com uma dica perfeita.');
      await expect(item.getByLabel('Avaliação: 4 de 5')).toBeVisible();
      await expect(game.notes()).toHaveValue('');
      expect(backend.db.sessions[0]).toMatchObject({ players_count: 4, duration_minutes: 30, rating: 4 });

      await page.reload();
      await expect(game.sessions()).toHaveCount(1);
      await expect(game.sessions().first()).toContainText('Ganhou a Ana');
    });

    test('cronómetro continua após navegar e recarregar e regista os horários ao encerrar @responsive', async ({ page, backend }) => {
      const game = new GamePage(page);
      await game.goto('dixit');
      await page.getByRole('button', { name: 'Iniciar' }).click();
      await expect(page.getByRole('button', { name: 'Pausar' })).toBeVisible();

      await page.goto('games');
      await game.goto('dixit');
      await page.reload();
      await page.getByRole('button', { name: 'Pausar' }).click();
      await expect(page.getByRole('button', { name: 'Retomar' })).toBeVisible();
      await page.reload();
      await page.getByRole('button', { name: 'Retomar' }).click();
      await page.getByRole('button', { name: 'Encerrar' }).click();

      await expect(game.sessions()).toHaveCount(1);
      const session = backend.db.sessions[0]!;
      expect(session).toMatchObject({ game_id: expect.any(String), user_id: PLAYER.id, duration_minutes: 1 });
      expect(Date.parse(session.started_at)).toBeLessThanOrEqual(Date.parse(session.ended_at));
      await expect(game.sessions().first()).toContainText('Início:');
      await expect(game.sessions().first()).toContainText('Fim:');
    });

    test('valida os campos do formulário com mensagens claras associadas ao campo', async ({ page, backend }) => {
      const game = new GamePage(page);
      await game.goto('dixit');
      const cases: [() => Promise<void>, string][] = [
        [() => game.date().fill('2099-01-01'), 'A data não pode ser no futuro.'],
        [() => game.date().fill(''), 'Indica a data da sessão.'],
      ];
      for (const [fill, message] of cases) {
        await fill();
        await game.submit().click();
        await expect(game.form().getByRole('alert').filter({ hasText: message })).toBeVisible();
      }
      await game.date().fill(new Date().toLocaleDateString('sv-SE'));

      const fields: [() => Promise<void>, string][] = [
        [() => game.players().fill('0'), 'Jogadores: mínimo 1.'],
        [() => game.players().fill('100'), 'Jogadores: máximo 99.'],
        [() => game.players().fill('2.5'), 'Jogadores tem de ser um número inteiro.'],
      ];
      for (const [fill, message] of fields) {
        await fill();
        await game.submit().click();
        await expect(game.form().getByRole('alert').filter({ hasText: message })).toBeVisible();
        await expect(game.players()).toHaveAttribute('aria-invalid', 'true');
      }
      await game.players().fill('');
      await game.duration().fill('1441');
      await game.submit().click();
      await expect(game.form().getByRole('alert').filter({ hasText: 'Duração: máximo 1440.' })).toBeVisible();
      await game.duration().fill('');
      // O campo limita a 1000 caracteres: o excesso nem chega a ser aceite.
      await game.notes().fill('n'.repeat(1001));
      await expect(game.notes()).toHaveValue('n'.repeat(1000));
      expect(backend.db.sessions).toHaveLength(0);
    });

    test('a avaliação pode ser limpa', async ({ page }) => {
      const game = new GamePage(page);
      await game.goto('dixit');
      await game.star(3).click();
      await expect(game.star(3)).toBeChecked();
      await game.form().getByRole('button', { name: 'Limpar' }).click();
      await expect(game.star(3)).not.toBeChecked();
    });

    test('remove uma sessão do diário', async ({ page, backend }) => {
      backend.addSession(PLAYER.id, 'dixit', { players_count: 3, notes: 'Para apagar' });
      const game = new GamePage(page);
      await game.goto('dixit');
      await expect(game.sessions()).toHaveCount(1);
      await page.getByRole('button', { name: /Remover sessão de/ }).click();
      await expect(new AppShell(page).toast('Sessão removida')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Ainda não há sessões registadas' })).toBeVisible();
      expect(backend.db.sessions).toHaveLength(0);
    });

    test('mantém o que foi escrito quando o servidor falha', async ({ page, backend }) => {
      backend.fail(/POST \/rest\/v1\/game_sessions/, { status: 500, body: { code: 'XX000', message: 'falha simulada' } });
      const game = new GamePage(page);
      await game.goto('dixit');
      await game.notes().fill('Não perder isto');
      await game.submit().click();
      await expect(new AppShell(page).toast(/Não foi possível registar a sessão: falha simulada/)).toBeVisible();
      await expect(game.notes()).toHaveValue('Não perder isto');
      await expect(game.sessions()).toHaveCount(0);
    });

    test('traduz o erro de registo duplicado e o de falta de permissão', async ({ page, backend }) => {
      const unfail = backend.fail(/POST \/rest\/v1\/game_sessions/, { status: 409, body: { code: '23505', message: 'duplicate key value' } }, 1);
      const game = new GamePage(page);
      await game.goto('dixit');
      await game.submit().click();
      await expect(new AppShell(page).toast(/Este registo já existe\./)).toBeVisible();
      unfail();
      backend.fail(/POST \/rest\/v1\/game_sessions/, { status: 403, body: { code: '42501', message: 'rls' } }, 1);
      await game.submit().click();
      await expect(new AppShell(page).toast(/Não tens permissão para esta ação\./)).toBeVisible();
    });

    test('desativa o envio enquanto grava e não regista a sessão duas vezes', async ({ page, backend }) => {
      const release = backend.hold(/POST \/rest\/v1\/game_sessions/);
      const game = new GamePage(page);
      await game.goto('dixit');
      await game.submit().click();
      await expect(page.getByRole('button', { name: 'A registar…' })).toBeDisabled();
      await game.date().press('Enter');
      release();
      await expect(game.sessions()).toHaveCount(1);
      expect(backend.db.sessions).toHaveLength(1);
    });

    test('mostra notas longas e texto com HTML sem partir o layout nem executar código', async ({ page, backend }) => {
      backend.addSession(PLAYER.id, 'dixit', { notes: `${'a'.repeat(900)} <img src=x onerror="window.__pwned=1"><b>negrito</b>` });
      const game = new GamePage(page);
      await game.goto('dixit');
      await expect(game.sessions()).toHaveCount(1);
      await expect(game.sessions().first().locator('img')).toHaveCount(0);
      await expect(game.sessions().first()).toContainText('<b>negrito</b>');
      expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });

    test('a navegação por teclado percorre o formulário e envia com Enter', async ({ page }) => {
      const game = new GamePage(page);
      await game.goto('dixit');
      await game.players().focus();
      await page.keyboard.press('Tab');
      await expect(game.duration()).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(game.sessions()).toHaveCount(1);
    });
  });
});
