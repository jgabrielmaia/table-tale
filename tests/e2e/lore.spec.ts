import { LoginPage } from '../pages/LoginPage';
import { AppShell } from '../pages/AppShell';
import { expect, test, PLAYER } from '../fixtures';
import { SEASON } from '../data/seed';

test.describe('Lore: Arcanos & Elementais', () => {
  test.describe('visitante', () => {
    test('explica o princípio central, as duas facções e que nenhuma é superior @smoke', async ({ page }) => {
      await page.goto('lore');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Arcanos & Elementais');
      await expect(page.getByText('Não escolhes a tua facção. A tua carta revela onde pertences.')).toBeVisible();
      await expect(page.getByText('As cartas decidem o teu destino.')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Os Arcanos', level: 2 })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Os Elementais', level: 2 })).toBeVisible();
      await expect(page.getByText('Nenhuma facção é superior, boa ou má por natureza')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Os Arcanos acreditam que:' })).toBeVisible();
      await expect(page.getByRole('img', { name: 'Duas filosofias, um mundo' })).toBeVisible();
    });

    test('não revela cartas antes do sorteio e encaminha para O Sorteio do Destino', async ({ page }) => {
      await page.goto('lore');
      await expect(page.getByRole('heading', { name: 'A tua carta ainda está por revelar' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'A coleção completa' })).toHaveCount(0);
      await expect(page.getByRole('heading', { level: 4, name: 'A Temperança' })).toHaveCount(0);
      await page.getByRole('link', { name: 'Descobre o teu destino' }).click();
      await expect(page).toHaveURL(/\/login$/);
      await new LoginPage(page).google().click();
      await expect(page).toHaveURL(/\/fate$/);
    });

    test('a navegação por capítulos leva ao capítulo e move o foco', async ({ page }) => {
      await page.goto('lore');
      await page.getByRole('navigation', { name: 'Capítulos' }).getByRole('link', { name: 'Ponto de tensão' }).click();
      await expect(page.locator('#tensao')).toBeFocused();
      await expect(page.getByRole('table')).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /Perspetiva Arcana/ })).toBeVisible();
    });

    test('a tabela de tensão tem cabeçalhos e uma linha por questão', async ({ page }) => {
      await page.goto('lore');
      const rows = page.getByRole('table').getByRole('row');
      await expect(rows).toHaveCount(7);
      await expect(page.getByRole('rowheader', { name: 'Onde nasce o poder?' })).toBeVisible();
    });

    test('mostra erro e recupera quando as facções não carregam', async ({ page, backend }) => {
      const unfail = backend.fail(/GET \/rest\/v1\/factions/, { status: 500, body: { code: 'XX000', message: 'falha simulada' } });
      await page.goto('lore');
      await expect(page.getByText(/falha simulada/)).toBeVisible({ timeout: 15_000 });
      unfail();
      await page.getByRole('button', { name: 'Tentar novamente' }).click();
      await expect(page.getByRole('heading', { name: 'Os Arcanos', level: 2 })).toBeVisible();
    });

    test('em inglês o conteúdo editorial é traduzido', async ({ page }) => {
      await page.goto('lore');
      await new AppShell(page).openMenuIfCollapsed();
      await new AppShell(page).switchLanguage('EN');
      await expect(page.getByText('You do not choose your faction. Your card reveals where you belong.')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'The Arcanos believe that:' })).toBeVisible();
      await expect(page.getByText('Knowledge is power.').first()).toBeVisible();
    });
  });

  test.describe('jogador com sessão', () => {
    test.beforeEach(async ({ signIn }) => {
      await signIn();
    });

    test('sem carta continua bloqueado', async ({ page }) => {
      await page.goto('lore');
      await expect(page.getByRole('heading', { name: 'A tua carta ainda está por revelar' })).toBeVisible();
    });

    test('depois do sorteio abre as nove cartas e destaca a sua sem esconder as outras @smoke', async ({ page, backend }) => {
      backend.giveCard(PLAYER.id, { id: 'star', faction: 'arcanos' });
      await page.goto('lore');
      await expect(page.getByRole('heading', { name: 'A coleção completa' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Cartas dos Arcanos' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Cartas dos Elementais' })).toBeVisible();
      for (const title of ['O Mago', 'A Sacerdotisa', 'A Estrela', 'O Mundo', 'A Temperança', 'Terra', 'Água', 'Fogo', 'Ar']) {
        await expect(page.getByRole('heading', { level: 4, name: title, exact: true }).first()).toBeVisible();
      }
      // A carta aparece em destaque no topo e, outra vez, no seu grupo da coleção.
      const mine = page.getByRole('listitem').filter({ hasText: 'A tua identidade sazonal' });
      await expect(mine).toHaveCount(2);
      await expect(mine.first()).toContainText('A Estrela');
      await expect(page.getByRole('heading', { name: 'A tua carta ainda está por revelar' })).toHaveCount(0);
    });

    test('mostra o histórico de temporadas anteriores', async ({ page, backend }) => {
      backend.db.seasons.push({ id: 'old-season', slug: 'season-0', name: 'Season 0', starts_at: '2025-01-01T00:00:00Z', ends_at: SEASON.starts_at, is_active: false });
      backend.db.identities.push({ id: 'old-identity', player_id: PLAYER.id, season_id: 'old-season', card_id: 'water', faction: 'elementais', selected_at: '2025-06-01T10:00:00.000Z', is_active: false });
      backend.giveCard(PLAYER.id, { id: 'star', faction: 'arcanos' });
      await page.goto('lore');
      await expect(page.getByRole('heading', { name: 'Histórico de temporadas' })).toBeVisible();
      await expect(page.getByText('Água').first()).toBeVisible();
      await expect(page.getByText(/Season 0/)).toBeVisible();
    });

    test('só com cartas antigas continua bloqueado mas lembra do histórico', async ({ page, backend }) => {
      backend.db.seasons.push({ id: 'old-season', slug: 'season-0', name: 'Season 0', starts_at: '2025-01-01T00:00:00Z', ends_at: SEASON.starts_at, is_active: false });
      backend.db.identities.push({ id: 'old-identity', player_id: PLAYER.id, season_id: 'old-season', card_id: 'water', faction: 'elementais', selected_at: '2025-06-01T10:00:00.000Z', is_active: false });
      await page.goto('lore');
      await expect(page.getByRole('heading', { name: 'A tua carta ainda está por revelar' })).toBeVisible();
      await expect(page.getByText('As tuas identidades de temporadas anteriores continuam guardadas no teu histórico.')).toBeVisible();
    });
  });
});
