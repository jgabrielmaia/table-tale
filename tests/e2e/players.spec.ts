import { expect, test, PLAYER } from '../fixtures';
import { OWNER } from '../data/seed';

const memberCard = (page: import('@playwright/test').Page, name: string) =>
  page.getByRole('tabpanel').getByRole('listitem').filter({ hasText: name });

test.describe('Jogadores', () => {
  test.describe('a partir de uma comunidade', () => {
    test.beforeEach(async ({ signIn, backend }) => {
      backend.joinCommunity('table-tale'); // the player is a member alongside the owner
      await signIn();
    });

    test('clicar em qualquer parte do cartão de um membro abre a página pública do jogador @smoke', async ({ page, backend }) => {
      backend.giveCard(OWNER.id);
      backend.profile(OWNER.id).bio = 'Guardião da estante.';
      await page.goto('communities/table-tale');
      // Clicking the card itself (not the name) opens the player: the whole card is the link.
      await memberCard(page, 'Dono da Estante').click({ position: { x: 20, y: 20 } });
      await expect(page).toHaveURL(new RegExp(`/players/${OWNER.id}$`));

      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dono da Estante');
      await expect(page.getByText('Guardião da estante.')).toBeVisible();
      await expect(page.getByText(/Nível \d+/).first()).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Identidade Table Tale' })).toBeVisible();
      await expect(page.getByRole('img', { name: /—|.+/ }).first()).toBeVisible();
      // Only public data: no achievements, no session diary, no call to draw a card, and not indexed.
      await expect(page.getByRole('heading', { name: 'Conquistas' })).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'Descobre o teu destino' })).toHaveCount(0);
      await expect(page.getByText(/Ganha XP ao registar sessões/)).toHaveCount(0);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    });

    test('o próprio cartão abre o meu perfil', async ({ page }) => {
      await page.goto('communities/table-tale');
      await memberCard(page, 'Ana Teste').click({ position: { x: 20, y: 20 } });
      await expect(page).toHaveURL(/\/profile$/);
    });

    test('o cartão tem um nome acessível e abre com o teclado', async ({ page }) => {
      await page.goto('communities/table-tale');
      const link = page.getByRole('link', { name: 'Ver o perfil de Dono da Estante' });
      await link.focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(new RegExp(`/players/${OWNER.id}$`));
    });
  });

  test.describe('página do jogador', () => {
    test('um visitante vê a página; sem carta não há convite para o sorteio', async ({ page }) => {
      await page.goto(`players/${OWNER.id}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dono da Estante');
      await expect(page.getByText('O destino deste jogador ainda não foi revelado nesta temporada.')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Descobre o teu destino' })).toHaveCount(0);
    });

    test('o meu próprio endereço leva ao meu perfil', async ({ page, signIn }) => {
      await signIn();
      await page.goto(`players/${PLAYER.id}`);
      await expect(page).toHaveURL(/\/profile$/);
    });

    test('um jogador que não existe ou um endereço inválido mostram "Jogador não encontrado"', async ({ page }) => {
      for (const id of ['00000000-0000-4000-8000-999999999999', 'nao-e-um-id']) {
        await page.goto(`players/${id}`);
        await expect(page.getByRole('heading', { name: 'Jogador não encontrado' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Ver comunidades' })).toHaveAttribute('href', /\/communities$/);
      }
    });

    test('mostra erro com opção de tentar novamente quando o perfil não carrega', async ({ page, backend }) => {
      backend.fail(/GET \/rest\/v1\/profiles/, { status: 500, body: { code: 'XX000', message: 'falha simulada' } }, 3);
      await page.goto(`players/${OWNER.id}`);
      await page.getByRole('button', { name: 'Tentar novamente' }).click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dono da Estante');
    });
  });
});
