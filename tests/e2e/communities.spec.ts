import { expect, test, PLAYER } from '../fixtures';
import { OWNER } from '../data/seed';
import { GamesPage } from '../pages/GamesPage';

const card = (page: import('@playwright/test').Page, name: string) =>
  page.getByRole('listitem').filter({ has: page.getByRole('heading', { name, exact: true }) });

const results = (page: import('@playwright/test').Page) => page.getByRole('listbox', { name: 'Resultados da pesquisa' });

test.describe('Comunidades', () => {
  test('descoberta: lista, pesquisa por texto e filtra por cidade e bairro @smoke', async ({ page }) => {
    await page.goto('communities');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Comunidades');
    await expect(page.getByText('2 comunidades encontradas')).toBeVisible();
    await expect(card(page, 'Table Tale Lisboa')).toContainText('Alvalade, Lisboa · Portugal');
    // A comunidade privada não é visível a quem não pertence.
    await expect(card(page, 'Clube Secreto de Braga')).toHaveCount(0);

    await page.getByRole('searchbox', { name: 'Pesquisar' }).fill('boavista');
    await expect(page.getByText('1 comunidade encontrada')).toBeVisible();
    await expect(card(page, 'Tabuleiros do Porto')).toBeVisible();

    await page.getByRole('button', { name: 'Limpar filtros' }).first().click();
    await page.getByLabel('Cidade').selectOption('Lisboa');
    await expect(page.getByText('1 comunidade encontrada')).toBeVisible();
    await expect(page.getByLabel('Bairro / distrito').locator('option')).toHaveText(['Todos os bairros', 'Alvalade']);
    await page.getByLabel('Bairro / distrito').selectOption('Alvalade');
    await expect(card(page, 'Table Tale Lisboa')).toBeVisible();
  });

  test('um visitante vê a comunidade pública mas é convidado a entrar para participar', async ({ page }) => {
    await page.goto('communities/tabuleiros-do-porto');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tabuleiros do Porto');
    await expect(page.getByRole('link', { name: 'Entrar para participar' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Membros' })).toBeVisible();
  });

  test('o separador Jogos mostra a estante da comunidade com exemplares e ligação ao jogo', async ({ page }) => {
    await page.goto('communities/tabuleiros-do-porto');
    await page.getByRole('tab', { name: 'Jogos' }).click();
    const shelf = page.getByRole('tabpanel');
    await expect(shelf.getByRole('heading', { level: 3 })).toHaveText(['Coup', 'Dixit', 'Vaalbara']);
    await expect(shelf.getByRole('listitem').filter({ hasText: 'Coup' })).toContainText('3 exemplares');
    // Quem não gere a comunidade não pode adicionar jogos.
    await expect(page.getByRole('button', { name: 'Adicionar jogo' })).toHaveCount(0);
    await shelf.getByRole('link', { name: 'Dixit' }).click();
    await expect(page).toHaveURL(/\/games\/dixit$/);
  });

  test.describe('jogador com sessão', () => {
    test.beforeEach(async ({ signIn }) => {
      await signIn();
    });

    test('cria uma comunidade com localização obrigatória e fica como dono', async ({ page, backend }) => {
      await page.goto('communities/new');
      await page.getByLabel('Nome', { exact: true }).fill('Dados e Tabuleiros');
      await page.getByRole('button', { name: 'Criar' }).click();
      await expect(page.getByText('Indica a cidade.')).toBeVisible();
      await expect(page.getByText('Indica o bairro ou distrito.')).toBeVisible();
      await expect(page.getByText('Indica o país.')).toBeVisible();

      await page.getByLabel('Cidade').fill('Coimbra');
      await page.getByLabel('Bairro / distrito').fill('Baixa');
      await page.getByLabel('País').fill('Portugal');
      await page.getByLabel('Latitude').fill('40.2');
      await page.getByRole('button', { name: 'Criar' }).click();
      await expect(page.getByText('Indica latitude e longitude em conjunto.')).toBeVisible();
      await page.getByLabel('Longitude').fill('-8.4');
      await page.getByRole('button', { name: 'Criar' }).click();

      await expect(page).toHaveURL(/\/communities\/dados-e-tabuleiros-/);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dados e Tabuleiros');
      await expect(page.getByText('Dono', { exact: true }).first()).toBeVisible();
      const created = backend.db.communities.find((c) => c.name === 'Dados e Tabuleiros')!;
      expect(created).toMatchObject({ city: 'Coimbra', district: 'Baixa', country: 'Portugal', latitude: 40.2, longitude: -8.4, created_by: PLAYER.id });
      expect(backend.db.memberships.find((m) => m.community_id === created.id)).toMatchObject({ user_id: PLAYER.id, role: 'owner', status: 'active' });
    });

    test.describe('pesquisa de cidade', () => {
      test('escolher uma cidade preenche cidade, país e coordenadas; o bairro fica por preencher e tudo é editável @responsive', async ({ page, backend }) => {
        await page.goto('communities/new');
        await page.getByLabel('Nome', { exact: true }).fill('Dados e Tabuleiros');
        await page.getByLabel('Cidade').fill('Coim');
        const option = results(page).getByRole('option', { name: /Coimbra/ });
        await expect(option).toBeVisible();
        await expect(option).toContainText('Portugal · 40.2111, -8.4292');
        await option.click();

        await expect(page.getByLabel('Cidade')).toHaveValue('Coimbra');
        await expect(page.getByLabel('País')).toHaveValue('Portugal');
        await expect(page.getByLabel('Latitude')).toHaveValue('40.2111');
        await expect(page.getByLabel('Longitude')).toHaveValue('-8.4292');
        await expect(page.getByLabel('Bairro / distrito')).toHaveValue('');
        await expect(page.getByLabel('Bairro / distrito')).toBeFocused();
        await expect(results(page)).toBeHidden();
        // Sem scroll horizontal, em qualquer largura.
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

        // Continua tudo editável depois da escolha.
        await page.getByLabel('País').fill('Portugal (continental)');
        await page.getByLabel('Bairro / distrito').fill('Baixa');
        await page.getByRole('button', { name: 'Criar' }).click();
        await expect(page).toHaveURL(/\/communities\/dados-e-tabuleiros-/);
        expect(backend.db.communities.find((c) => c.name === 'Dados e Tabuleiros')).toMatchObject({
          city: 'Coimbra', district: 'Baixa', country: 'Portugal (continental)', latitude: 40.2111, longitude: -8.4292,
        });
        expect(backend.requests.filter((r) => r.path === '/functions/v1/city-search').length).toBeGreaterThan(0);
        // A chave nunca viaja no browser: o pedido só leva o texto escrito.
        expect(backend.requests.filter((r) => r.path === '/functions/v1/city-search').every((r) => JSON.stringify(r.body) === '{"query":"Coim"}')).toBe(true);
      });

      test('teclado: setas escolhem, Enter confirma sem submeter, Escape fecha', async ({ page }) => {
        await page.goto('communities/new');
        const city = page.getByLabel('Cidade');
        await city.fill('Port');
        await expect(results(page).getByRole('option')).toHaveCount(2);
        await expect(city).toHaveAttribute('aria-expanded', 'true');
        await city.press('ArrowDown');
        await city.press('ArrowDown');
        await expect(results(page).getByRole('option', { name: /Portimão/ })).toHaveAttribute('aria-selected', 'true');
        await city.press('Enter');
        await expect(city).toHaveValue('Portimão');
        await expect(page.getByLabel('Latitude')).toHaveValue('37.1386');
        // Enter na escolha não submeteu o formulário.
        await expect(page.getByText('Indica o bairro ou distrito.')).toHaveCount(0);

        await city.fill('Por');
        await expect(results(page).getByRole('option')).toHaveCount(2);
        await city.press('Escape');
        await expect(results(page)).toBeHidden();
        await expect(city).toHaveValue('Por');
      });

      test('sem resultados avisa e deixa preencher à mão', async ({ page }) => {
        await page.goto('communities/new');
        await page.getByLabel('Cidade').fill('Xyzzy');
        await expect(page.getByText('Nenhuma cidade encontrada. Preenche os campos à mão.')).toBeVisible();
      });

      test('se a pesquisa falha, avisa sem bloquear e o formulário funciona à mão', async ({ page, backend }) => {
        backend.fail(/POST \/functions\/v1\/city-search/, { status: 503, body: { error: { code: 'unavailable', message: 'x' } } });
        await page.goto('communities/new');
        await page.getByLabel('Nome', { exact: true }).fill('Dados e Tabuleiros');
        await page.getByLabel('Cidade').fill('Coimbra');
        await expect(page.getByText(/A pesquisa de cidades não está disponível neste momento\. Podes preencher os campos à mão\./)).toBeVisible();
        await page.getByLabel('Bairro / distrito').fill('Baixa');
        await page.getByLabel('País').fill('Portugal');
        await page.getByRole('button', { name: 'Criar' }).click();
        await expect(page).toHaveURL(/\/communities\/dados-e-tabuleiros-/);
      });

      test('limite de pedidos mostra uma mensagem própria', async ({ page, backend }) => {
        backend.fail(/POST \/functions\/v1\/city-search/, { status: 429, body: { error: { code: 'rate_limited', message: 'x' } } });
        await page.goto('communities/new');
        await page.getByLabel('Cidade').fill('Coimbra');
        await expect(page.getByText('Demasiadas pesquisas, tenta daqui a pouco.', { exact: false })).toBeVisible();
      });
    });

    test('entra numa comunidade pública de imediato e pode sair', async ({ page, backend }) => {
      await page.goto('communities/tabuleiros-do-porto');
      await page.getByRole('button', { name: 'Entrar', exact: true }).click();
      await expect(page.getByText('Entraste na comunidade.')).toBeVisible();
      expect(backend.db.memberships.find((m) => m.user_id === PLAYER.id && m.community_id.endsWith('a000-000000000002'))).toMatchObject({ role: 'member', status: 'active' });
      await page.getByRole('button', { name: 'Sair da comunidade' }).click();
      await expect(page.getByText('Saíste da comunidade.')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
    });

    test('pertence a várias comunidades e vê-as no perfil, separadas dos jogos pessoais', async ({ page }) => {
      await page.goto('communities/tabuleiros-do-porto');
      await page.getByRole('button', { name: 'Entrar', exact: true }).click();
      await expect(page.getByText('Entraste na comunidade.')).toBeVisible();
      await page.goto('profile');
      const mine = page.getByRole('region', { name: 'As minhas comunidades' });
      await expect(mine.getByRole('link', { name: 'Table Tale Lisboa' })).toBeVisible();
      await expect(mine.getByRole('link', { name: 'Tabuleiros do Porto' })).toBeVisible();
      // Os jogos pessoais não dependem das comunidades.
      await expect(page.getByText('Ainda não adicionaste nenhum jogo.')).toBeVisible();
    });

    test('os meus jogos permitem adicionar e remover jogos', async ({ page, backend }) => {
      await page.goto('profile');
      const lib = page.getByRole('region', { name: 'Os meus jogos' });
      await lib.getByLabel('Jogo', { exact: true }).selectOption({ label: 'Dixit' });
      await lib.getByRole('button', { name: 'Adicionar aos meus jogos' }).click();
      await expect(lib.getByRole('link', { name: 'Dixit' })).toBeVisible();
      expect(backend.db.ownerships.filter((o) => o.user_id === PLAYER.id)).toHaveLength(1);
      await lib.getByRole('button', { name: 'Remover Dixit dos meus jogos' }).click();
      await expect(lib.getByText('Ainda não adicionaste nenhum jogo.')).toBeVisible();
      expect(backend.db.ownerships.filter((o) => o.user_id === PLAYER.id)).toHaveLength(0);
    });

    test('um membro vê membros e jogos, mas não tem gestão', async ({ page }) => {
      await page.goto('communities/table-tale');
      await expect(page.getByRole('tab', { name: 'Gestão' })).toHaveCount(0);
      await page.getByRole('tab', { name: 'Membros' }).click();
      await expect(page.getByText('Dono da Estante')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Suspender' })).toHaveCount(0);
      await page.getByRole('tab', { name: 'Jogos' }).click();
      await expect(page.getByRole('link', { name: /Hitster|Dixit|Catan/ }).first()).toBeVisible();
      await expect(page.getByLabel('Jogo', { exact: true })).toHaveCount(0);
    });

    test('comunidade privada: sem pertencer não existe; com pedido pendente só se vê o aviso', async ({ page, backend }) => {
      await page.goto('communities/clube-secreto-braga');
      await expect(page.getByText('Comunidade não encontrada.')).toBeVisible();

      const community = backend.db.communities.find((c) => c.slug === 'clube-secreto-braga')!;
      backend.db.memberships.push({ id: 'm-pending-me', user_id: PLAYER.id, community_id: community.id, role: 'member', status: 'pending', joined_at: '2026-01-03T10:00:00.000Z' });
      await page.goto('communities/clube-secreto-braga');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Clube Secreto de Braga');
      await expect(page.getByText('Pedido pendente')).toBeVisible();
      await expect(page.getByText('Esta comunidade é privada. Pede para entrar para ver os membros e os jogos.')).toBeVisible();
      await expect(page.getByRole('tab')).toHaveCount(0);
    });
  });

  test.describe('dono da comunidade', () => {
    test.beforeEach(async ({ signIn, backend }) => {
      // O jogador passa a ser dono de uma comunidade privada, com o dono original como membro.
      const community = backend.db.communities.find((c) => c.slug === 'clube-secreto-braga')!;
      backend.db.memberships = backend.db.memberships.filter((m) => m.community_id !== community.id);
      backend.db.memberships.push(
        { id: 'm-owner', user_id: PLAYER.id, community_id: community.id, role: 'owner', status: 'active', joined_at: '2026-01-01T10:00:00.000Z' },
        { id: 'm-other', user_id: OWNER.id, community_id: community.id, role: 'member', status: 'active', joined_at: '2026-01-02T10:00:00.000Z' },
      );
      await signIn();
    });

    test('o último dono não pode sair; depois de transferir a propriedade pode', async ({ page, backend }) => {
      await page.goto('communities/clube-secreto-braga');
      await expect(page.getByRole('button', { name: 'Sair da comunidade' })).toBeDisabled();

      await page.getByRole('tab', { name: 'Membros' }).click();
      page.once('dialog', (d) => void d.accept());
      await page.getByRole('button', { name: 'Transferir propriedade' }).click();
      await expect(page.getByText('Propriedade transferida.')).toBeVisible();
      expect(backend.db.memberships.find((m) => m.id === 'm-owner')?.role).toBe('admin');
      expect(backend.db.memberships.find((m) => m.id === 'm-other')?.role).toBe('owner');

      await expect(page.getByRole('button', { name: 'Sair da comunidade' })).toBeEnabled();
      await page.getByRole('button', { name: 'Sair da comunidade' }).click();
      await expect(page.getByText('Saíste da comunidade.')).toBeVisible();
    });

    test('aprova pedidos pendentes, altera papéis e suspende membros', async ({ page, backend }) => {
      const cid = backend.db.communities.find((c) => c.slug === 'clube-secreto-braga')!.id;
      backend.db.profiles.push({ id: 'p-new', display_name: 'Rita Nova', avatar_url: null, level: 1, experience_points: 0, faction_id: null, bio: null, created_at: '2026-01-01T10:00:00.000Z', updated_at: '2026-01-01T10:00:00.000Z' });
      backend.db.memberships.push({ id: 'm-pending', user_id: 'p-new', community_id: cid, role: 'member', status: 'pending', joined_at: '2026-01-03T10:00:00.000Z' });

      await page.goto('communities/clube-secreto-braga');
      await page.getByRole('tab', { name: 'Membros' }).click();
      const pending = page.getByRole('region', { name: 'Pendente' });
      await pending.getByRole('button', { name: 'Aprovar' }).click();
      await expect(page.getByText('Membro atualizado.').first()).toBeVisible();
      expect(backend.db.memberships.find((m) => m.id === 'm-pending')?.status).toBe('active');

      await page.getByLabel('Papel de Rita Nova').selectOption('moderator');
      await expect.poll(() => backend.db.memberships.find((m) => m.id === 'm-pending')?.role).toBe('moderator');

      await page.getByRole('listitem').filter({ hasText: 'Dono da Estante' }).getByRole('button', { name: 'Suspender' }).click();
      await expect.poll(() => backend.db.memberships.find((m) => m.id === 'm-other')?.status).toBe('suspended');
    });

    test('um jogo posto na estante aparece em Jogos com a comunidade e sai quando é removido', async ({ page, locateAt }) => {
      await locateAt('lisboa');
      const games = new GamesPage(page);
      await games.goto();
      // Antes: só a estante de Lisboa tem Hitster.
      await expect(games.shelves('Hitster')).toHaveText([/^Table Tale Lisboa/]);

      await page.goto('communities/clube-secreto-braga');
      await page.getByRole('tab', { name: 'Jogos' }).click();
      await page.getByLabel('Jogo', { exact: true }).selectOption({ label: 'Hitster' });
      await page.getByRole('button', { name: 'Adicionar jogo' }).click();
      await expect(page.getByRole('tabpanel').getByRole('link', { name: 'Hitster' })).toBeVisible();

      // A comunidade privada é do jogador, por isso conta mesmo a centenas de km.
      await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Jogos' }).click();
      await expect(games.shelves('Hitster')).toHaveText([/^Table Tale Lisboa/, /^Clube Secreto de Braga\s*\d{3} km$/]);
      await games.community().selectOption({ label: 'Clube Secreto de Braga' });
      expect(await games.titles()).toEqual(['Hitster', 'Uno']);

      await page.goto('communities/clube-secreto-braga');
      await page.getByRole('tab', { name: 'Jogos' }).click();
      await page.getByRole('button', { name: 'Remover Hitster' }).click();
      await expect(page.getByRole('tabpanel').getByRole('link', { name: 'Hitster' })).toHaveCount(0);
      await games.goto();
      await expect(games.shelves('Hitster')).toHaveText([/^Table Tale Lisboa/]);
    });

    test('o dono edita a localização e gere os jogos da comunidade', async ({ page, backend }) => {
      await page.goto('communities/clube-secreto-braga');
      await page.getByRole('tab', { name: 'Jogos' }).click();
      await page.getByLabel('Jogo', { exact: true }).selectOption({ label: 'Dixit' });
      await page.getByRole('button', { name: 'Adicionar jogo' }).click();
      await expect(page.getByRole('link', { name: 'Dixit' })).toBeVisible();
      expect(backend.db.communityGames.some((g) => g.added_by === PLAYER.id)).toBe(true);
      await page.getByRole('button', { name: 'Remover Dixit' }).click();
      await expect(page.getByRole('link', { name: 'Dixit' })).toHaveCount(0);

      await page.getByRole('tab', { name: 'Gestão' }).click();
      await page.getByLabel('Cidade').fill('Guimarães');
      await page.getByRole('button', { name: 'Guardar' }).click();
      await expect(page.getByText('Comunidade atualizada.')).toBeVisible();
      expect(backend.db.communities.find((c) => c.slug === 'clube-secreto-braga')?.city).toBe('Guimarães');
    });
  });
});
