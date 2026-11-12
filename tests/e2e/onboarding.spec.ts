import type { Page } from '@playwright/test';
import { FatePage } from '../pages/FatePage';
import { expect, test, PLAYER } from '../fixtures';

const REVEAL_TIMEOUT = 30_000;

const list = (page: Page) => page.getByRole('list', { name: 'Comunidades sugeridas' });
const card = (page: Page, name: string) => list(page).getByRole('listitem').filter({ has: page.getByRole('heading', { name, exact: true }) });
const myMemberships = (backend: { db: { memberships: Record<string, unknown>[] } }) => backend.db.memberships.filter((m) => m.user_id === PLAYER.id);

test.describe('Escolher comunidade (depois do Sorteio do Destino)', () => {
  test('exige sessão', async ({ page }) => {
    await page.goto('find-community');
    await expect(page).toHaveURL(/\/login$/);
  });

  test.describe('jogador novo, sem comunidade', () => {
    test.beforeEach(async ({ signIn }) => {
      await signIn();
    });

    test('sorteio → encontrar comunidade perto → entrar → continuar para os jogos @smoke', async ({ page, backend, locateAt }) => {
      await locateAt('lisboa');
      expect(myMemberships(backend)).toHaveLength(0);

      const fate = new FatePage(page);
      await fate.goto();
      await fate.draw(0);
      await fate.continue().click({ timeout: REVEAL_TIMEOUT });
      await fate.enter().click();

      await expect(page).toHaveURL(/\/find-community$/);
      await expect(page.getByRole('heading', { level: 1, name: 'Encontra a tua comunidade' })).toBeVisible();
      // Only the community within the radius, with its distance and member count.
      await expect(page.getByText('1 comunidade a menos de 20 km')).toBeVisible();
      await expect(list(page).getByRole('listitem')).toHaveCount(1);
      await expect(card(page, 'Table Tale Lisboa')).toContainText(/a [23]\.\d km/);
      await expect(card(page, 'Table Tale Lisboa')).toContainText('1 membro');

      await card(page, 'Table Tale Lisboa').getByRole('button', { name: 'Entrar em Table Tale Lisboa' }).click();
      await expect(page.getByText('Entraste na comunidade.')).toBeVisible();
      expect(myMemberships(backend)).toMatchObject([{ role: 'member', status: 'active' }]);
      await expect(card(page, 'Table Tale Lisboa')).toContainText('2 membros');
      await expect(card(page, 'Table Tale Lisboa').getByRole('button')).toHaveCount(0);
      await expect(card(page, 'Table Tale Lisboa').getByText('Membro', { exact: true })).toBeVisible();

      await expect(page.getByText('Já tens comunidade. Podes entrar noutras ou continuar.')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Saltar por agora' })).toHaveCount(0);
      await page.getByRole('link', { name: 'Continuar para os jogos' }).click();
      await expect(page).toHaveURL(/\/games$/);
      await expect(page.getByRole('heading', { name: 'Ainda não tens comunidade' })).toHaveCount(0);
    });

    test('alargar o raio junta comunidades mais longe e fica guardado', async ({ page, locateAt }) => {
      // In Braga the only community close by is private (invisible); Porto is ~47 km away.
      await locateAt('braga');
      await page.goto('find-community');
      await expect(page.getByRole('heading', { name: 'Ainda não há comunidades a menos de 20 km' })).toBeVisible();
      await page.getByLabel('Raio').selectOption({ label: '50 km' });
      await expect(page.getByText('1 comunidade a menos de 50 km')).toBeVisible();
      await expect(card(page, 'Tabuleiros do Porto')).toContainText(/a 4\d km/);
      await page.reload();
      await expect(page.getByLabel('Raio')).toHaveValue('50');
    });

    test('sem localização lista todas as comunidades públicas e deixa escolher uma cidade', async ({ page }) => {
      await page.goto('find-community');
      await expect(page.getByText('Sem localização: vês todas as comunidades.', { exact: false })).toBeVisible();
      await expect(page.getByText('2 comunidades encontradas')).toBeVisible();
      await expect(list(page).getByRole('heading', { level: 2 })).toHaveText(['Table Tale Lisboa', 'Tabuleiros do Porto']);
      // The private club is invisible to outsiders, here as everywhere else.
      await expect(page.getByText('Clube Secreto de Braga')).toHaveCount(0);

      await page.getByLabel('Cidade').selectOption({ label: 'Porto' });
      await expect(page.getByText('1 comunidade a menos de 20 km')).toBeVisible();
      await expect(list(page).getByRole('heading', { level: 2 })).toHaveText(['Tabuleiros do Porto']);
    });

    test('longe de tudo, sugere ver todas as comunidades ou criar uma', async ({ page, locateAt }) => {
      await locateAt('braga');
      await page.goto('find-community');
      await expect(page.getByRole('heading', { name: 'Ainda não há comunidades a menos de 20 km' })).toBeVisible();
      await page.getByRole('main').getByRole('link', { name: 'Ver todas as comunidades' }).first().click();
      await expect(page).toHaveURL(/\/communities$/);
    });

    test('pode criar uma comunidade em vez de entrar numa', async ({ page }) => {
      await page.goto('find-community');
      await page.getByRole('link', { name: 'Criar comunidade' }).click();
      await expect(page).toHaveURL(/\/communities\/new$/);
    });

    test('saltar leva ao perfil, que convida a encontrar uma comunidade', async ({ page, backend }) => {
      await page.goto('find-community');
      await page.getByRole('link', { name: 'Saltar por agora' }).click();
      await expect(page).toHaveURL(/\/profile$/);
      const mine = page.getByRole('region', { name: 'As minhas comunidades' });
      await expect(mine.getByText('Ainda não pertences a nenhuma comunidade.')).toBeVisible();
      await mine.getByRole('link', { name: 'Encontrar a minha comunidade' }).click();
      await expect(page).toHaveURL(/\/find-community$/);
      expect(myMemberships(backend)).toHaveLength(0);
    });

    test('a página de Jogos avisa que ainda não tem comunidade e leva a encontrar uma', async ({ page }) => {
      await page.goto('games');
      const notice = page.getByRole('region', { name: 'Ainda não tens comunidade' });
      await expect(notice).toContainText('Entra numa para jogares com quem lá está.');
      await notice.getByRole('link', { name: 'Encontrar a minha comunidade' }).click();
      await expect(page).toHaveURL(/\/find-community$/);
    });

    test('um pedido pendente para uma comunidade privada fica à espera e não conta como comunidade', async ({ page, backend }) => {
      backend.joinCommunity('clube-secreto-braga', PLAYER.id, { status: 'pending' });
      await page.goto('find-community');
      await expect(page.getByText('O teu pedido aguarda aprovação.', { exact: false })).toBeVisible();
      await expect(list(page).getByRole('heading', { name: 'Clube Secreto de Braga' })).toBeVisible();
      await expect(card(page, 'Clube Secreto de Braga').getByText('Pedido pendente')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Saltar por agora' })).toBeVisible();

      await page.goto('games');
      await expect(page.getByRole('region', { name: 'Ainda não tens comunidade' })).toContainText('O teu pedido para entrar numa comunidade aguarda aprovação.');
    });

    test('pedir para entrar numa comunidade privada que consegue ver cria um pedido pendente', async ({ page, backend }) => {
      // Private communities are hidden from outsiders; one the player created (and later left) is still visible to them.
      backend.db.communities.find((c) => c.slug === 'clube-secreto-braga')!.created_by = PLAYER.id;
      await page.goto('find-community');
      await card(page, 'Clube Secreto de Braga').getByRole('button', { name: 'Pedir para entrar em Clube Secreto de Braga' }).click();
      await expect(page.getByText('Pedido enviado. Aguarda aprovação.')).toBeVisible();
      expect(myMemberships(backend)).toMatchObject([{ status: 'pending', role: 'member' }]);
      await expect(card(page, 'Clube Secreto de Braga').getByText('Pedido pendente')).toBeVisible();
    });
  });

  test.describe('jogador que já tem comunidade', () => {
    test.beforeEach(async ({ signIn, backend }) => {
      // Existing members (e.g. joined automatically before this change) keep their community.
      backend.joinCommunity('table-tale');
      await signIn();
    });

    test('depois do sorteio vai direto ao perfil', async ({ page }) => {
      const fate = new FatePage(page);
      await fate.goto();
      await fate.draw(0);
      await fate.continue().click({ timeout: REVEAL_TIMEOUT });
      await fate.enter().click();
      await expect(page).toHaveURL(/\/profile$/);
    });

    test('nem os Jogos nem o perfil mostram o aviso de "sem comunidade"', async ({ page }) => {
      await page.goto('games');
      await expect(page.getByText(/\d+ jogos? encontrados?/)).toBeVisible();
      await expect(page.getByRole('region', { name: 'Ainda não tens comunidade' })).toHaveCount(0);
      await page.goto('profile');
      await expect(page.getByRole('region', { name: 'As minhas comunidades' }).getByRole('link', { name: 'Table Tale Lisboa' })).toBeVisible();
      await expect(page.getByText('Ainda não pertences a nenhuma comunidade.')).toHaveCount(0);
    });
  });
});
