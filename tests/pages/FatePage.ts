import type { Page } from '@playwright/test';

export class FatePage {
  constructor(readonly page: Page) {}

  readonly start = () => this.page.getByRole('button', { name: 'Descobre o teu destino' });
  readonly skip = () => this.page.getByRole('button', { name: 'Saltar por agora' });
  readonly deck = () => this.page.getByRole('group', { name: 'Nove cartas viradas para baixo' });
  readonly cards = () => this.deck().getByRole('button');
  readonly continue = () => this.page.getByRole('button', { name: 'Continuar' });
  readonly enter = () => this.page.getByRole('button', { name: 'Entrar na mesa' });
  readonly share = () => this.page.getByRole('button', { name: 'Partilhar o teu destino' });
  readonly posterDialog = () => this.page.getByRole('dialog', { name: 'O teu poster' });

  async goto() {
    await this.page.goto('fate');
  }

  async draw(index = 0) {
    await this.start().click();
    await this.cards().nth(index).click();
  }
}
