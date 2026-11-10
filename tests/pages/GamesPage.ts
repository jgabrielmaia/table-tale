import type { Locator, Page } from '@playwright/test';

export class GamesPage {
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

  // Where to look: location, radius, community and sort.
  readonly reach = () => this.page.getByRole('region', { name: 'Onde procurar' });
  readonly where = () => this.reach().locator('p').first();
  readonly useMyLocation = () => this.reach().getByRole('button', { name: 'Usar a minha localização' });
  readonly city = () => this.reach().getByLabel('Cidade');
  readonly radius = () => this.reach().getByLabel('Raio');
  readonly community = () => this.reach().getByLabel('Comunidade');
  readonly sort = () => this.reach().getByLabel('Ordenar por');

  async goto(query = '') {
    await this.page.goto(`games${query}`);
  }

  card(title: string): Locator {
    return this.grid().getByRole('listitem').filter({ has: this.page.getByRole('heading', { name: title, exact: true }) });
  }

  /** The community chips on a card, in display order (closest first). */
  shelves(title: string): Locator {
    return this.card(title).getByRole('list', { name: 'Comunidades com este jogo' }).getByRole('listitem');
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
