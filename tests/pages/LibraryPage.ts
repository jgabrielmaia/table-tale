import type { Locator, Page } from '@playwright/test';

export class LibraryPage {
  constructor(readonly page: Page) {}

  readonly filters = () => this.page.getByRole('search', { name: 'Pesquisar e filtrar jogos' });
  readonly search = () => this.filters().getByRole('searchbox', { name: 'Pesquisar por nome' });
  readonly category = () => this.filters().getByLabel('Categoria');
  readonly mechanic = () => this.filters().getByLabel('Mecânica');
  readonly players = () => this.filters().getByLabel('Jogadores');
  readonly duration = () => this.filters().getByLabel('Duração');
  readonly status = () => this.filters().getByLabel('Estado', { exact: true });
  readonly favoritesOnly = () => this.filters().getByLabel('Só favoritos');
  readonly count = () => this.page.getByText(/\d+ jogos? encontrados?/);
  readonly grid = () => this.page.getByRole('list', { name: 'Jogos' });

  async goto(query = '') {
    await this.page.goto(`library${query}`);
  }

  card(title: string): Locator {
    return this.grid().getByRole('listitem').filter({ has: this.page.getByRole('heading', { name: title, exact: true }) });
  }

  async titles() {
    return this.grid().getByRole('heading', { level: 3 }).allInnerTexts();
  }

  favoriteToggle(title: string) {
    return this.page.getByRole('button', { name: new RegExp(`^(Adicionar|Remover) ${title} (aos|dos) favoritos$`) });
  }

  statusSelect(title: string) {
    return this.page.getByLabel(`Estado de ${title}`);
  }
}
