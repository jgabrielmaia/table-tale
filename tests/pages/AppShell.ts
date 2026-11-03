import { expect, type Locator, type Page } from '@playwright/test';

/** Header, menu, footer and the toast region shared by every page. */
export class AppShell {
  constructor(readonly page: Page) {}

  readonly nav = () => this.page.getByRole('navigation', { name: 'Principal' });
  readonly menuToggle = () => this.page.getByRole('button', { name: /Abrir menu|Fechar menu/ });
  readonly signOut = () => this.page.getByRole('button', { name: 'Sair' });
  readonly signIn = () => this.nav().getByRole('link', { name: 'Entrar' });
  readonly profileLink = () => this.page.getByRole('link', { name: /^O teu perfil \(/ });
  readonly main = () => this.page.getByRole('main');

  async navLabels() {
    return this.nav().getByRole('list').first().getByRole('link').allInnerTexts().then((all) => all.map((t) => t.trim()).filter(Boolean));
  }

  /** Opens the hamburger menu when it is collapsed (small screens). */
  async openMenuIfCollapsed() {
    const toggle = this.page.getByRole('button', { name: 'Abrir menu' });
    if (await toggle.isVisible()) await toggle.click();
  }

  async expectSignedIn() {
    await this.openMenuIfCollapsed();
    await expect(this.profileLink()).toBeVisible();
  }

  async expectSignedOut() {
    await this.openMenuIfCollapsed();
    await expect(this.signIn()).toBeVisible();
  }

  toast(text: string | RegExp): Locator {
    return this.page.getByRole('status').filter({ hasText: text }).first();
  }

  async switchLanguage(code: 'PT' | 'EN') {
    await this.page.getByRole('group', { name: /Idioma|Language/ }).first().getByRole('button', { name: code, exact: true }).click();
  }
}
