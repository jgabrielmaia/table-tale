import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { AppShell } from '../pages/AppShell';
import { GamePage } from '../pages/GamePage';
import { LoginPage } from '../pages/LoginPage';
import { ProfilePage } from '../pages/ProfilePage';
import { expect, test, PLAYER } from '../fixtures';

/**
 * Regras axe que dependem só da estrutura (nomes, labels, ARIA, idiomas, landmarks).
 * `color-contrast` fica de fora de propósito: o tema usa gradientes e transparências que o axe não consegue avaliar
 * de forma fiável, e um falso positivo aqui seria ruído. Ver README.
 */
const RULES = [
  'button-name', 'link-name', 'label', 'image-alt', 'input-image-alt', 'select-name', 'form-field-multiple-labels',
  'aria-allowed-attr', 'aria-required-attr', 'aria-required-children', 'aria-required-parent', 'aria-roles',
  'aria-valid-attr', 'aria-valid-attr-value', 'aria-hidden-focus', 'aria-dialog-name', 'aria-input-field-name',
  'html-has-lang', 'html-lang-valid', 'document-title', 'duplicate-id', 'duplicate-id-aria', 'landmark-one-main',
  'page-has-heading-one', 'tabindex', 'th-has-data-cells', 'scope-attr-valid', 'list', 'listitem', 'definition-list', 'dlitem',
];

const LOADING = /A carregar|A verificar a sessão|A abrir/;

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withRules(RULES).analyze();
  const summary = violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
  expect(summary, 'violações de acessibilidade').toEqual([]);
}

test.describe('Acessibilidade', () => {
  test.describe('regras estruturais (axe) @a11y', () => {
    const publicPages: [string, string][] = [
      ['página inicial', ''],
      ['biblioteca', 'library'],
      ['detalhe do jogo', 'games/dixit'],
      ['lore', 'lore'],
      ['eventos', 'events'],
      ['comunidades', 'communities'],
      ['detalhe da comunidade', 'communities/table-tale'],
      ['entrar', 'login'],
      ['criar conta', 'register'],
      ['página não encontrada', 'nao-existe'],
    ];
    for (const [name, path] of publicPages) {
      test(`${name} não tem violações`, async ({ page }) => {
        await page.goto(path);
        await expect(page.getByRole('main')).toBeVisible();
        await expect(page.getByText(LOADING)).toHaveCount(0);
        await expectNoViolations(page);
      });
    }

    test('perfil, diálogo de edição e detalhe com sessão não têm violações', async ({ page, signIn, backend }) => {
      await signIn();
      backend.addSession(PLAYER.id, 'dixit', { notes: 'Nota', rating: 4, players_count: 3 });
      backend.giveCard();
      const profile = new ProfilePage(page);
      await profile.goto();
      await expect(profile.name()).toBeVisible();
      await expect(page.getByText(LOADING)).toHaveCount(0);
      await expectNoViolations(page);

      await profile.edit().click();
      await expect(profile.dialog()).toBeVisible();
      await expectNoViolations(page);
      await page.keyboard.press('Escape');

      await new GamePage(page).goto('dixit');
      await expect(page.getByRole('heading', { name: 'Dixit', level: 1 })).toBeVisible();
      await expect(new GamePage(page).sessions()).toHaveCount(1);
      await expectNoViolations(page);
    });
  });

  test('cada página pública tem exatamente um título principal', async ({ page }) => {
    for (const path of ['', 'library', 'lore', 'events', 'communities', 'communities/table-tale', 'login', 'games/uno']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    }
  });

  test('o foco por teclado é visível e percorre os métodos de entrada por ordem', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await expect(login.heading()).toBeVisible();
    const order: string[] = [];
    for (let i = 0; i < 25 && !order.includes('Continuar'); i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el) return null;
        const style = getComputedStyle(el);
        const label = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().replace(/\s+/g, ' ');
        return { label, visible: style.outlineStyle !== 'none' || style.boxShadow !== 'none' };
      });
      if (!info?.label) continue;
      if (/Continuar com Google|Continuar com GitHub|^E-mail|^Continuar$/.test(info.label) || info.label === '') {
        expect(info.visible, `foco invisível em "${info.label}"`).toBe(true);
      }
      if (/Google/.test(info.label)) order.push('Google');
      else if (/GitHub/.test(info.label)) order.push('GitHub');
      else if (info.label === 'Continuar') order.push('Continuar');
    }
    expect(order).toEqual(['Google', 'GitHub', 'Continuar']);
  });

  test('o diálogo de edição prende o foco e devolve-o ao fechar', async ({ page, signIn }) => {
    await signIn();
    const profile = new ProfilePage(page);
    await profile.goto();
    await profile.edit().click();
    await expect(profile.dialog()).toBeVisible();
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      // Ao sair do último controlo o foco pode passar pela interface do navegador (body), mas nunca para a página por trás.
      expect(await page.evaluate(() => {
        const el = document.activeElement;
        return !el || el === document.body || Boolean(el.closest('dialog'));
      }), `Tab ${i + 1} saiu do diálogo`).toBe(true);
    }
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(() => {
      const el = document.activeElement;
      return !el || el === document.body || Boolean(el.closest('dialog'));
    })).toBe(true);
    await page.keyboard.press('Escape');
    await expect(profile.edit()).toBeFocused();
  });

  test('os erros do formulário estão associados ao campo (descrição acessível)', async ({ page, signIn }) => {
    await signIn();
    const game = new GamePage(page);
    await game.goto('dixit');
    await game.players().fill('0');
    await game.submit().click();
    await expect(game.players()).toHaveAttribute('aria-invalid', 'true');
    await expect(game.players()).toHaveAccessibleDescription('Jogadores: mínimo 1.');
  });

  test('botões e ligações principais têm nome acessível', async ({ page, signIn }) => {
    await signIn();
    await page.goto('library');
    await expect(page.getByRole('button', { name: 'Adicionar Dixit aos favoritos' })).toBeVisible();
    await expect(page.getByLabel('Estado de Dixit')).toBeVisible();
    const shell = new AppShell(page);
    await expect(shell.profileLink()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Table Tale — página inicial' })).toBeVisible();
  });

  test('a navegação principal tem marcos semânticos', async ({ page }) => {
    await page.goto('library');
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Principal' })).toHaveCount(1);
  });
});
