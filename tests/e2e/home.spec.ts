import { expect, test } from '../fixtures';

test.describe('Página inicial', () => {
  test('mostra a biblioteca em números e os destaques da estante @smoke', async ({ page }) => {
    await page.goto('');
    const stats = page.getByRole('term').filter({ hasText: 'Jogos na estante' });
    await expect(stats).toBeVisible();
    await expect(page.getByText('Jogos na estante').locator('xpath=following-sibling::dd')).toHaveText('9');
    await expect(page.getByText('Categorias').locator('xpath=following-sibling::dd')).toHaveText('6');
    await expect(page.getByText('Facções').locator('xpath=following-sibling::dd')).toHaveText('2');

    const highlights = page.getByRole('region', { name: 'Destaques' });
    await expect(highlights.getByRole('heading', { level: 3 })).toHaveCount(3);
    await page.getByRole('link', { name: 'Ver todos os jogos →' }).click();
    await expect(page).toHaveURL(/\/library$/);
  });

  test('um visitante vê o botão Entrar e um jogador com sessão não', async ({ page, signIn }) => {
    await page.goto('');
    await expect(page.getByRole('main').getByRole('link', { name: 'Entrar' })).toBeVisible();
    await signIn();
    await page.goto('');
    await expect(page.getByRole('main').getByRole('link', { name: 'Entrar' })).toHaveCount(0);
    await expect(page.getByText('Os teus favoritos')).toBeVisible();
  });

  test('o contador de favoritos acompanha os favoritos do jogador', async ({ page, signIn }) => {
    await signIn();
    await page.goto('library');
    await page.getByRole('button', { name: 'Adicionar Dixit aos favoritos' }).click();
    await expect(page.getByRole('button', { name: 'Remover Dixit dos favoritos' })).toBeVisible();
    await page.getByRole('link', { name: 'Table Tale — página inicial' }).click();
    await expect(page.getByText('Os teus favoritos').locator('xpath=following-sibling::dd')).toHaveText('1');
  });

  test('mostra erro quando a coleção não carrega, sem partir a página', async ({ page, backend }) => {
    backend.fail(/GET \/rest\/v1\/games/, { status: 500, body: { code: 'XX000', message: 'falha simulada' } });
    await page.goto('');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/falha simulada/)).toBeVisible({ timeout: 15_000 });
  });
});
