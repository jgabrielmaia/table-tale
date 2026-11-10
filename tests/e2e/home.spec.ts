import { expect, test } from '../fixtures';

test.describe('Página inicial', () => {
  test('mostra destaques das estantes e leva aos jogos, sem o bloco de números @smoke', async ({ page }) => {
    await page.goto('');
    await expect(page.getByRole('term').filter({ hasText: 'Jogos na estante' })).toHaveCount(0);
    await expect(page.getByLabel('A biblioteca em números')).toHaveCount(0);

    const highlights = page.getByRole('region', { name: 'Destaques' });
    await expect(highlights.getByRole('heading', { level: 3 })).toHaveCount(3);
    await page.getByRole('link', { name: 'Ver todos os jogos →' }).click();
    await expect(page).toHaveURL(/\/games$/);
  });

  test('os destaques só incluem jogos que estão na estante de alguma comunidade', async ({ page, backend }) => {
    const onShelf = backend.db.games.find((g) => g.slug === 'coup')!.id;
    backend.db.communityGames = backend.db.communityGames.filter((g) => g.game_id === onShelf);
    await page.goto('');
    const highlights = page.getByRole('region', { name: 'Destaques' });
    await expect(highlights.getByRole('heading', { level: 3 })).toHaveText(['Coup']);
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
});
