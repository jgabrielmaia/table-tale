import type { Page } from '@playwright/test';

export class LoginPage {
  constructor(readonly page: Page) {}

  readonly heading = () => this.page.getByRole('heading', { level: 1 });
  readonly google = () => this.page.getByRole('button', { name: /Continuar com Google/ });
  readonly github = () => this.page.getByRole('button', { name: /Continuar com GitHub/ });
  readonly email = () => this.page.getByLabel('E-mail');
  readonly submit = () => this.page.getByRole('button', { name: /^Continuar$|A enviar link/ });
  readonly error = () => this.page.getByRole('alert');

  async goto(path: 'login' | 'register' = 'login') {
    await this.page.goto(path);
  }

  async requestMagicLink(email: string) {
    await this.email().fill(email);
    await this.submit().click();
  }
}
