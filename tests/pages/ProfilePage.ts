import type { Page } from '@playwright/test';

export class ProfilePage {
  constructor(readonly page: Page) {}

  readonly name = () => this.page.getByRole('heading', { level: 1 });
  readonly edit = () => this.page.getByRole('button', { name: 'Editar perfil' });
  readonly dialog = () => this.page.getByRole('dialog', { name: 'Editar perfil' });
  readonly nameField = () => this.dialog().getByLabel('Nome');
  readonly bioField = () => this.dialog().getByLabel('Sobre ti');
  readonly avatarField = () => this.dialog().getByLabel(/\(PNG, JPEG ou WebP/);
  readonly save = () => this.dialog().getByRole('button', { name: /Guardar alterações|A guardar/ });
  readonly cancel = () => this.dialog().getByRole('button', { name: 'Cancelar' });
  readonly progress = () => this.page.getByRole('progressbar');
  readonly identity = () => this.page.getByRole('region', { name: 'A minha identidade Table Tale' });

  async goto() {
    await this.page.goto('profile');
  }
}
