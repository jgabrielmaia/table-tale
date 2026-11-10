import { AppShell } from '../pages/AppShell';
import { expect, test } from '../fixtures';

test.describe('Navigation e estrutura', () => {
  test('a página inicial apresenta a marca, o título e os atalhos @smoke', async ({ page }) => {
    await page.goto('');
    await expect(page).toHaveTitle(/Table Tale/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cada jogo guarda uma história. Cada partida escreve outra.');
    await expect(page.getByRole('link', { name: 'Table Tale — página inicial' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Explorar os jogos' })).toHaveAttribute('href', /\/games$/);
    await expect(page.getByRole('link', { name: 'Conhecer o universo' })).toHaveAttribute('href', /\/lore$/);
  });

  test('o logótipo oficial é uma imagem e o favicon aponta para o ícone da marca', async ({ page }) => {
    await page.goto('');
    const logo = page.getByRole('link', { name: 'Table Tale — página inicial' }).locator('img');
    await expect(logo).toBeVisible();
    expect(await logo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', /favicon\.png$/);
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', /apple-touch-icon\.png$/);
  });

  test('o menu segue a ordem Perfil, Jogos, História, Eventos, Comunidades', async ({ page, isMobile }) => {
    test.skip(isMobile, 'O menu colapsado é coberto pelo teste responsivo.');
    await page.goto('');
    expect(await new AppShell(page).navLabels()).toEqual(['Perfil', 'Jogos', 'História', 'Eventos', 'Comunidades']);
  });

  test('cada entrada do menu leva à página certa e marca-se como atual', async ({ page, signIn, isMobile }) => {
    test.skip(isMobile, 'O menu colapsado é coberto pelo teste responsivo.');
    await signIn();
    await page.goto('');
    const shell = new AppShell(page);
    for (const [label, path, heading] of [
      ['Jogos', /\/games$/, 'Jogos'],
      ['História', /\/lore$/, 'História'],
      ['Eventos', /\/events$/, 'Eventos'],
      ['Perfil', /\/profile$/, 'Ana Teste'],
    ] as const) {
      await test.step(label, async () => {
        await shell.nav().getByRole('link', { name: label, exact: true }).click();
        await expect(page).toHaveURL(path);
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
        await expect(shell.nav().getByRole('link', { name: label, exact: true })).toHaveAttribute('aria-current', 'page');
      });
    }
  });

  test('o menu hambúrguer abre, navega e fecha com Esc @responsive', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Só existe menu colapsado em ecrãs pequenos.');
    await page.goto('');
    const toggle = page.getByRole('button', { name: 'Abrir menu' });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(page.getByRole('button', { name: 'Fechar menu' })).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-expanded', 'false');

    await page.getByRole('button', { name: 'Abrir menu' }).click();
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Jogos' }).click();
    await expect(page).toHaveURL(/\/games$/);
    await expect(page.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-expanded', 'false');
  });

  test('no telemóvel a página não tem scroll horizontal @responsive', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Verificação específica de ecrã pequeno.');
    for (const path of ['', 'games', 'lore', 'login']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `scroll horizontal em /${path}`).toBeLessThanOrEqual(1);
    }
  });

  test('o link de saltar para o conteúdo move o foco para a área principal', async ({ page }) => {
    await page.goto('');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // O foco é colocado no link diretamente: em desenvolvimento o StrictMode já move o foco inicial para o título.
    const skip = page.getByRole('link', { name: 'Saltar para o conteúdo' });
    await skip.focus();
    await expect(skip).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
  });

  test('uma rota inexistente mostra a página 404 e não é indexável', async ({ page }) => {
    await page.goto('esta-rota-nao-existe');
    await expect(page.getByRole('heading', { name: 'Esta página não consta do mapa' })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await page.getByRole('link', { name: 'Voltar aos jogos' }).click();
    await expect(page).toHaveURL(/\/games$/);
  });

  test('os endereços antigos /library e /biblioteca já não existem', async ({ page }) => {
    for (const path of ['library', 'biblioteca', 'library/import']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: 'Esta página não consta do mapa' })).toBeVisible();
    }
  });

  test('a língua alterna entre PT e EN, atualiza o texto e persiste após recarregar', async ({ page }) => {
    await page.goto('games');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT');
    const shell = new AppShell(page);
    await shell.openMenuIfCollapsed();
    await shell.switchLanguage('EN');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Games');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB');
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Games');
    await expect(page).toHaveTitle(/Games/);
  });

  test('os metadados de SEO acompanham a navegação sem recarregar', async ({ page }) => {
    await page.goto('');
    await expect(page).toHaveTitle('Table Tale – Jogos de tabuleiro, histórias e comunidades');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/table-tale\/$/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');

    await page.getByRole('link', { name: 'Conhecer o universo' }).click();
    await expect(page).toHaveTitle(/^Lore – Arcanos e Elementais/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/lore\/$/);

    await page.goto('login');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  });

  test('o rodapé liga ao Lore', async ({ page }) => {
    await page.goto('');
    await page.getByRole('contentinfo').getByRole('link', { name: 'História' }).click();
    await expect(page).toHaveURL(/\/lore$/);
  });
});
