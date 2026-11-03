import type { Page } from '@playwright/test';

export class GamePage {
  constructor(readonly page: Page) {}

  readonly title = () => this.page.getByRole('heading', { level: 1 });
  readonly form = () => this.page.getByRole('form', { name: 'Registar sessão' });
  readonly submit = () => this.form().getByRole('button', { name: /Registar sessão|A registar/ });
  readonly date = () => this.form().getByLabel('Data');
  readonly players = () => this.form().getByLabel('Jogadores');
  readonly duration = () => this.form().getByLabel('Duração (min)');
  readonly notes = () => this.form().getByLabel('Notas');
  readonly sessions = () => this.page.getByRole('list').filter({ has: this.page.getByRole('button', { name: /Remover sessão de/ }) }).getByRole('listitem');
  readonly markToday = () => this.page.getByRole('button', { name: /Marcar como jogado hoje/ });
  readonly favorite = () => this.page.getByRole('button', { name: /^(Adicionar aos favoritos|Nos favoritos)$/ });
  readonly statusGroup = () => this.page.getByRole('group', { name: 'Estado de jogo' });

  async goto(slug: string) {
    await this.page.goto(`games/${slug}`);
  }

  star(n: number) {
    return this.form().getByRole('radio', { name: n === 1 ? '1 estrela' : `${n} estrelas` });
  }
}
