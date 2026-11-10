import type { Page } from '@playwright/test';
import { ProfilePage } from '../pages/ProfilePage';
import { expect, test } from '../fixtures';

const VIEWPORTS = [
  { name: 'telemóvel pequeno', width: 360, height: 640 },
  { name: 'telemóvel', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'portátil', width: 1280, height: 800 },
  { name: 'ecrã largo', width: 1920, height: 1080 },
];

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('Responsividade @responsive', () => {
  // From 1100px (below it the menu collapses) the header shows every link. Signed in it is at its tightest: the avatar
  // carries the card badge and the name is long. Every link stays on one line, everything shares one vertical centre,
  // and nothing spills past the screen, in both languages. Real fonts are let through: Cinzel is wider than the fallback.
  for (const lang of ['pt', 'en'] as const) {
    test(`o cabeçalho com sessão cabe numa linha e fica alinhado em ecrãs de portátil (${lang})`, async ({ page, signIn, backend }) => {
      backend.giveCard();
      backend.profile().display_name = 'Jonas Gabriel Maia';
      await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/, (route) => route.continue());
      await page.addInitScript((l) => localStorage.setItem('table-tale-lang', l), lang);
      await signIn();
      for (const width of [1100, 1231, 1270, 1365, 1366, 1440]) {
        await page.setViewportSize({ width, height: 400 });
        await page.goto('');
        await expect(page.getByRole('button', { name: lang === 'pt' ? 'Sair' : 'Sign out' })).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        const header = await page.evaluate(() => {
          const mid = (el: Element) => { const r = el.getBoundingClientRect(); return Math.round((r.top + r.bottom) / 2); };
          const inner = document.querySelector('.header-inner')!;
          const links = [...document.querySelectorAll('.site-nav ul a')];
          const parts = [document.querySelector('.brand-logo')!, ...links, ...document.querySelectorAll('.auth-slot > *')];
          return {
            overflow: inner.scrollWidth - inner.clientWidth,
            heights: new Set(links.map((a) => Math.round(a.getBoundingClientRect().height))).size,
            centres: [...new Set(parts.map(mid))],
          };
        });
        expect(header.overflow, `header spills past the screen at ${width}px`).toBeLessThanOrEqual(0);
        expect(header.heights, `a link wraps at ${width}px`).toBe(1);
        expect(Math.max(...header.centres) - Math.min(...header.centres), `header parts are misaligned at ${width}px`).toBeLessThanOrEqual(1);
      }
    });
  }

  for (const vp of VIEWPORTS) {
    test(`sem scroll horizontal nas páginas principais (${vp.name}, ${vp.width}px)`, async ({ page, signIn }) => {
      await signIn();
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const path of ['', 'games', 'games/cartas-classico', 'lore', 'events', 'profile']) {
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expect(page.getByText(/A carregar|A verificar a sessão|A abrir/)).toHaveCount(0);
        expect(await overflow(page), `/${path} a ${vp.width}px`).toBeLessThanOrEqual(1);
      }
    });
  }

  test('em ecrãs pequenos aparece a barra inferior com os cinco atalhos, pela ordem certa', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('');
    const quick = page.getByRole('navigation', { name: 'Navegação rápida' });
    await expect(quick).toBeVisible();
    expect((await quick.getByRole('link').allInnerTexts()).map((t) => t.trim())).toEqual(['Início', 'Perfil', 'Jogos', 'História', 'Eventos']);
    await quick.getByRole('link', { name: 'Jogos' }).click();
    await expect(page).toHaveURL(/\/games$/);
    await expect(quick.getByRole('link', { name: 'Jogos' })).toHaveAttribute('aria-current', 'page');
  });

  test('em ecrãs largos a barra inferior não aparece e o menu horizontal sim', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('');
    await expect(page.getByRole('navigation', { name: 'Navegação rápida' })).toBeHidden();
    await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Jogos' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Abrir menu' })).toBeHidden();
  });

  test('os filtros dos jogos continuam utilizáveis num telemóvel', async ({ page, locateAt }) => {
    await locateAt('lisboa');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('games');
    await page.getByRole('searchbox', { name: 'Pesquisar por nome' }).fill('dixit');
    await expect(page.getByText('1 jogo encontrado')).toBeVisible();
    await page.getByRole('combobox', { name: 'Duração' }).selectOption({ label: 'Mais de 2 h' });
    await expect(page.getByRole('heading', { name: 'Nenhum jogo encontrado' })).toBeVisible();
    await page.getByRole('main').getByRole('button', { name: 'Limpar filtros' }).last().click();
    await expect(page.getByText('9 jogos encontrados')).toBeVisible();
  });

  test('o diálogo de edição cabe no ecrã e o botão de guardar fica acessível', async ({ page, signIn }) => {
    await signIn();
    await page.setViewportSize({ width: 360, height: 640 });
    const profile = new ProfilePage(page);
    await profile.goto();
    await profile.edit().click();
    await expect(profile.dialog()).toBeVisible();
    const box = await profile.dialog().boundingBox();
    expect(box!.width).toBeLessThanOrEqual(360);
    await profile.save().scrollIntoViewIfNeeded();
    await expect(profile.save()).toBeInViewport();
  });

  test('o formulário de sessão é utilizável num telemóvel', async ({ page, signIn }) => {
    await signIn();
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('games/dixit');
    const form = page.getByRole('form', { name: 'Registar sessão' });
    await form.getByLabel('Jogadores').fill('3');
    await form.getByRole('button', { name: 'Registar sessão' }).click();
    await expect(page.getByRole('button', { name: /Remover sessão de/ })).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(1);
  });

  test('a página de entrada cabe num ecrã de 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('login');
    await expect(page.getByRole('button', { name: /Continuar com Google/ })).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(1);
  });
});
