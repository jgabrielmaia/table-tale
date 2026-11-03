import { AppShell } from '../pages/AppShell';
import { LoginPage } from '../pages/LoginPage';
import { expect, test, PLAYER } from '../fixtures';

const eventItem = (page: import('@playwright/test').Page, name: string) =>
  page.getByRole('listitem').filter({ has: page.getByRole('heading', { name, exact: true }) });

test.describe('Eventos', () => {
  test('lista os eventos do mais recente para o mais antigo com data, local e descrição @smoke', async ({ page }) => {
    await page.goto('events');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Eventos');
    const names = await page.getByRole('heading', { level: 2 }).allInnerTexts();
    expect(names).toEqual(['Noite Cooperativa', 'Torneio Futuro', 'Noite Passada']);
    const future = eventItem(page, 'Torneio Futuro');
    await expect(future).toContainText('Porto · Sala B');
    await expect(future).toContainText('Torneio amigável marcado para o futuro.');
    await expect(future.locator('time')).toHaveAttribute('datetime', '2099-10-12T15:00:00.000Z');
  });

  test('um visitante vê "Entrar para participar" e regressa aos eventos depois de entrar', async ({ page }) => {
    await page.goto('events');
    const join = page.getByRole('link', { name: 'Entrar para participar' });
    await expect(join).toHaveCount(3);
    await join.first().click();
    await expect(page).toHaveURL(/\/login$/);
    await new LoginPage(page).google().click();
    await expect(page).toHaveURL(/\/events$/);
    await expect(page.getByRole('button', { name: 'Vou participar' })).toHaveCount(2);
  });

  test.describe('jogador com sessão', () => {
    test.beforeEach(async ({ signIn }) => {
      await signIn();
    });

    test('inscreve-se e cancela a inscrição num evento futuro, com persistência @smoke', async ({ page, backend }) => {
      const shell = new AppShell(page);
      await page.goto('events');
      const future = eventItem(page, 'Torneio Futuro');

      await future.getByRole('button', { name: 'Vou participar' }).click();
      await expect(shell.toast('Presença registada')).toBeVisible();
      await expect(future.getByRole('button', { name: 'Inscrito' })).toHaveAttribute('aria-pressed', 'true');
      expect(backend.db.participants).toHaveLength(1);
      expect(backend.db.participants[0]).toMatchObject({ user_id: PLAYER.id });

      await page.reload();
      await expect(eventItem(page, 'Torneio Futuro').getByRole('button', { name: 'Inscrito' })).toBeVisible();

      await eventItem(page, 'Torneio Futuro').getByRole('button', { name: 'Inscrito' }).click();
      await expect(shell.toast('Presença removida')).toBeVisible();
      await expect(eventItem(page, 'Torneio Futuro').getByRole('button', { name: 'Vou participar' })).toHaveAttribute('aria-pressed', 'false');
      expect(backend.db.participants).toHaveLength(0);
    });

    test('num evento passado oferece "Marcar presença" e depois "Participei"', async ({ page }) => {
      await page.goto('events');
      const past = eventItem(page, 'Noite Passada');
      await past.getByRole('button', { name: 'Marcar presença' }).click();
      await expect(past.getByRole('button', { name: 'Participei' })).toHaveAttribute('aria-pressed', 'true');
    });

    test('a participação aparece no perfil e dá experiência', async ({ page }) => {
      await page.goto('events');
      await eventItem(page, 'Torneio Futuro').getByRole('button', { name: 'Vou participar' }).click();
      await expect(eventItem(page, 'Torneio Futuro').getByRole('button', { name: 'Inscrito' })).toBeVisible();

      await page.goto('profile');
      await expect(page.getByRole('tab', { name: 'Eventos (1)' })).toBeVisible();
      await page.getByRole('tab', { name: 'Eventos (1)' }).click();
      await expect(page.getByRole('tabpanel')).toContainText('Torneio Futuro');
      await expect(page.getByText('50 / 300 XP')).toBeVisible();
    });

    test('mostra erro e mantém o estado quando a inscrição falha', async ({ page, backend }) => {
      backend.fail(/POST \/rest\/v1\/event_participants/, { status: 500, body: { code: 'XX000', message: 'falha simulada' } });
      await page.goto('events');
      const future = eventItem(page, 'Torneio Futuro');
      await future.getByRole('button', { name: 'Vou participar' }).click();
      await expect(new AppShell(page).toast(/Não foi possível registar a participação: falha simulada/)).toBeVisible();
      await expect(future.getByRole('button', { name: 'Vou participar' })).toHaveAttribute('aria-pressed', 'false');
    });

    test('bloqueia o botão enquanto regista e não duplica o pedido', async ({ page, backend }) => {
      const release = backend.hold(/POST \/rest\/v1\/event_participants/);
      await page.goto('events');
      const future = eventItem(page, 'Torneio Futuro');
      await future.getByRole('button', { name: 'Vou participar' }).click();
      await expect(future.getByRole('button')).toBeDisabled();
      release();
      await expect(future.getByRole('button', { name: 'Inscrito' })).toBeEnabled();
      expect(backend.calls(/POST \/rest\/v1\/event_participants/)).toHaveLength(1);
    });
  });

  test.describe('estados da página', () => {
    test('mostra o carregamento e depois a lista', async ({ page, backend }) => {
      const release = backend.hold(/GET \/rest\/v1\/events/);
      await page.goto('events');
      await expect(page.getByRole('status').filter({ hasText: 'A carregar eventos…' })).toBeAttached();
      release();
      await expect(page.getByRole('heading', { name: 'Torneio Futuro' })).toBeVisible();
    });

    test('mostra o estado vazio quando não há eventos', async ({ page, backend }) => {
      backend.db.events = [];
      await page.goto('events');
      await expect(page.getByRole('heading', { name: 'Sem eventos agendados' })).toBeVisible();
      await expect(page.getByText('Volta em breve')).toBeVisible();
    });

    test('mostra o erro e recupera com Tentar novamente', async ({ page, backend }) => {
      const unfail = backend.fail(/GET \/rest\/v1\/events/, { status: 500, body: { code: 'XX000', message: 'falha simulada' } });
      await page.goto('events');
      await expect(page.getByText(/Não foi possível carregar os eventos: falha simulada/)).toBeVisible({ timeout: 15_000 });
      unfail();
      await page.getByRole('button', { name: 'Tentar novamente' }).click();
      await expect(page.getByRole('heading', { name: 'Torneio Futuro' })).toBeVisible();
    });

    test('um nome de evento muito longo não parte o layout', async ({ page, backend }) => {
      backend.db.events[1]!.name = 'E'.repeat(300);
      backend.db.events[1]!.description = 'D'.repeat(600);
      await page.goto('events');
      await expect(page.getByRole('heading', { level: 2 }).nth(1)).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  });
});
