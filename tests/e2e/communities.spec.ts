import { AppShell } from '../pages/AppShell';
import { expect, test, PLAYER } from '../fixtures';
import { OWNER } from '../data/seed';
import { makePng } from '../utils/images';
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

  test('um visitante vê quantos membros há sem acesso às inscrições (sem erro 401) @smoke', async ({ page, backend }) => {
    backend.joinCommunity('tabuleiros-do-porto');
    await page.goto('communities');
    await expect(card(page, 'Tabuleiros do Porto').getByText('2 membros')).toBeVisible();
    await expect(card(page, 'Table Tale Lisboa').getByText('1 membro', { exact: true })).toBeVisible();

    await page.goto('communities/tabuleiros-do-porto');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tabuleiros do Porto');
    await expect(page.getByRole('tabpanel').getByText('2 membros')).toBeVisible();
    await expect(page.getByText('Entra na tua conta para veres quem faz parte desta comunidade.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Entrar para ver os membros' })).toBeVisible();
    // Signed out, the app never asks for the memberships themselves: only the computed count.
    expect(backend.calls(/\/rest\/v1\/community_memberships/)).toHaveLength(0);
    expect(backend.calls(/\/rest\/v1\/communities\?.*member_count/).length).toBeGreaterThan(0);
  });

  test('a ordenação por nota do BGG na estante da comunidade só aparece com o BGG ligado', async ({ page }) => {
    await page.goto('communities/tabuleiros-do-porto');
    await page.getByRole('tab', { name: 'Jogos' }).click();
    const bggOn = (process.env.VITE_FEATURE_BGG ?? 'true').toLowerCase() === 'true';
    await expect(page.getByRole('tabpanel').getByLabel('Ordenar por').locator('option')).toHaveText(bggOn ? ['Nome', 'Nota do BGG'] : ['Nome']);
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

  test('o separador Jogos é a página de Jogos limitada à comunidade: pesquisa, filtros e exemplares, sem atalho redundante', async ({ page }) => {
    await page.goto('communities/tabuleiros-do-porto');
    await expect(page.getByRole('link', { name: 'Ver todos os jogos' })).toHaveCount(0);
    await page.getByRole('tab', { name: 'Jogos' }).click();
    const shelf = page.getByRole('tabpanel');
    await expect(shelf.getByText('3 jogos encontrados')).toBeVisible();
    await shelf.getByRole('searchbox', { name: 'Pesquisar por nome' }).fill('coup');
    await expect(shelf.getByText('1 jogo encontrado')).toBeVisible();
    await expect(shelf.getByRole('heading', { level: 3 })).toHaveText(['Coup']);
    await expect(shelf.getByRole('listitem').filter({ hasText: 'Coup' }).first()).toContainText('3 exemplares');
    await shelf.getByRole('searchbox', { name: 'Pesquisar por nome' }).fill('catan');
    await expect(shelf.getByText('Nenhum jogo encontrado')).toBeVisible();
  });

  test('numa comunidade pública com estante só para membros, o visitante vê a comunidade mas não os jogos', async ({ page, backend }) => {
    backend.db.communities.find((c) => c.slug === 'tabuleiros-do-porto')!.shelf_visibility = 'private';
    await page.goto('communities/tabuleiros-do-porto');
    await page.getByRole('tab', { name: 'Jogos' }).click();
    await expect(page.getByText('A estante desta comunidade só é visível para membros.')).toBeVisible();
    await expect(page.getByRole('tabpanel').getByRole('link', { name: 'Coup' })).toHaveCount(0);
    expect(backend.calls(/\/rest\/v1\/community_games/)).toHaveLength(0);
  });

  test('clicar em qualquer parte de um cartão de jogo da estante abre o jogo', async ({ page }) => {
    await page.goto('communities/tabuleiros-do-porto');
    await page.getByRole('tab', { name: 'Jogos' }).click();
    // Clicking the card itself, away from the title, opens the game.
    await page.getByRole('tabpanel').getByRole('listitem').filter({ hasText: 'Coup' }).click({ position: { x: 20, y: 60 } });
    await expect(page).toHaveURL(/\/games\/coup$/);
  });

  test.describe('jogador com sessão', () => {
    test.beforeEach(async ({ signIn }) => {
      await signIn();
    });

    test('ser dono de uma comunidade desbloqueia "Guardião da Estante", e o cartão do dono destaca-se', async ({ page }) => {
      await page.goto('profile');
      await expect(page.getByRole('region', { name: /Por descobrir/ }).getByRole('heading', { name: 'Guardião da Estante' })).toBeVisible();

      await page.goto('communities/new');
      await page.getByLabel('Nome', { exact: true }).fill('Mesa do Guardião');
      await page.getByLabel('Cidade').fill('Coimbra');
      await page.getByLabel('Bairro / distrito').fill('Baixa');
      await page.getByLabel('País').fill('Portugal');
      await page.getByLabel('Latitude').fill('40.2');
      await page.getByLabel('Longitude').fill('-8.4');
      await page.getByRole('button', { name: 'Criar' }).click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mesa do Guardião');

      // The owner's card looks like an unlocked achievement: warm glow and a gold-filled badge.
      const ownerCard = page.locator('.member-card[data-role="owner"]');
      await expect(ownerCard.locator('.chip.role-owner')).toHaveText('Dono');
      await expect(ownerCard.locator('.chip.role-owner')).toHaveCSS('background-image', /radial-gradient/);
      await expect(page.getByRole('button', { name: 'Editar capa' })).toBeVisible();

      await page.goto('profile');
      await expect(page.getByRole('region', { name: /Descobertas/ }).getByRole('heading', { name: 'Guardião da Estante' })).toBeVisible();
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

    test('pertence a várias comunidades e vê-as no perfil, separadas dos jogos pessoais', async ({ page, backend }) => {
      backend.joinCommunity('table-tale');
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
      await lib.getByLabel('Adicionar do catálogo').selectOption({ label: 'Dixit' });
      await lib.getByRole('button', { name: 'Adicionar aos meus jogos' }).click();
      await expect(lib.getByRole('link', { name: 'Dixit' })).toBeVisible();
      expect(backend.db.ownerships.filter((o) => o.user_id === PLAYER.id)).toHaveLength(1);
      await lib.getByRole('button', { name: 'Remover Dixit dos meus jogos' }).click();
      await expect(lib.getByText('Ainda não adicionaste nenhum jogo.')).toBeVisible();
      expect(backend.db.ownerships.filter((o) => o.user_id === PLAYER.id)).toHaveLength(0);
    });

    test('nos meus jogos, "Novo jogo" cria um jogo sem BGG e põe-no logo na coleção @responsive', async ({ page, backend }) => {
      await page.goto('profile');
      const lib = page.getByRole('region', { name: 'Os meus jogos' });
      await expect(lib.getByLabel('Adicionar do catálogo').locator('option').first()).toBeDisabled();
      await lib.getByRole('button', { name: 'Novo jogo' }).click();
      const dialog = page.getByRole('dialog', { name: 'Adicionar um jogo novo' });
      await dialog.getByLabel('Título').fill('Jogo do Café');
      await dialog.getByRole('button', { name: 'Adicionar jogo' }).click();
      await expect(dialog).toBeHidden();
      await expect(lib.getByRole('link', { name: 'Jogo do Café' })).toBeVisible();
      const game = backend.db.games.find((g) => g.slug === 'jogo-do-cafe')!;
      expect(game).toMatchObject({ owner_id: PLAYER.id, categories: [], min_players: null, duration_minutes: null });
      expect(backend.db.ownerships.filter((o) => o.user_id === PLAYER.id && o.game_id === game.id)).toHaveLength(1);
    });

    test('um membro vê membros e jogos, mas não tem gestão', async ({ page, backend }) => {
      backend.joinCommunity('table-tale');
      await page.goto('communities/table-tale');
      await expect(page.getByRole('tab', { name: 'Gestão' })).toHaveCount(0);
      await page.getByRole('tab', { name: 'Membros' }).click();
      await expect(page.getByRole('link', { name: 'Ver o perfil de Dono da Estante' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Suspender' })).toHaveCount(0);
      await page.getByRole('tab', { name: 'Jogos' }).click();
      await expect(page.getByRole('link', { name: /Hitster|Dixit|Catan/ }).first()).toBeVisible();
      await expect(page.getByLabel('Adicionar do catálogo')).toHaveCount(0);
      await expect(page.getByRole('button', { name: /^Editar .* nesta estante$/ })).toHaveCount(0);
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

    test('um dono pode adicionar um co-dono sem perder a propriedade', async ({ page, backend }) => {
      await page.goto('communities/clube-secreto-braga');
      await page.getByRole('tab', { name: 'Membros' }).click();
      page.once('dialog', (d) => void d.accept());
      await page.getByRole('button', { name: 'Adicionar co-dono' }).click();
      await expect(page.getByText('Co-dono adicionado.')).toBeVisible();
      expect(backend.db.memberships.find((m) => m.id === 'm-owner')?.role).toBe('owner');
      expect(backend.db.memberships.find((m) => m.id === 'm-other')?.role).toBe('owner');
      await expect(page.getByText('2 donos')).toBeVisible();
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
      // The controls sit above the card's link: using them never opens the player's page.
      await expect(page).toHaveURL(/\/communities\/clube-secreto-braga$/);
    });

    test('um jogo posto na estante aparece em Jogos com a comunidade e sai quando é removido', async ({ page, locateAt }) => {
      await locateAt('lisboa');
      const games = new GamesPage(page);
      await games.goto();
      // Antes: só a estante de Lisboa tem Hitster.
      await expect(games.shelves('Hitster')).toHaveText([/^Table Tale Lisboa/]);

      await page.goto('communities/clube-secreto-braga');
      await page.getByRole('tab', { name: 'Jogos' }).click();
      await page.getByLabel('Adicionar do catálogo').selectOption({ label: 'Hitster' });
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

    test('o dono acrescenta um jogo novo à estante, sem BGG, e fica a ser o dono do jogo @responsive', async ({ page, backend }) => {
      await page.goto('communities/clube-secreto-braga');
      await page.getByRole('tab', { name: 'Jogos' }).click();
      await page.getByRole('button', { name: 'Novo jogo' }).click();
      const dialog = page.getByRole('dialog', { name: 'Adicionar um jogo novo' });
      await dialog.getByLabel('Título').fill('  Jogo do Café ');
      await dialog.getByLabel('Descrição').fill('Um jogo de cartas para o fim de tarde.');
      await dialog.getByLabel('Jogadores (mín.)').fill('2');
      await dialog.getByLabel('Jogadores (máx.)').fill('4');
      await dialog.getByLabel('Duração (min)').fill('30');
      await dialog.getByLabel(/Idade recomendada/).fill('8');
      // A photo far larger than the bucket allows: previewed now, shrunk to 1600 px wide before upload.
      await dialog.getByLabel('Escolher imagem').setInputFiles({ name: 'caixa.png', mimeType: 'image/png', buffer: makePng(2400, 1600, { noise: true }) });
      await expect(dialog.getByRole('img', { name: 'Pré-visualização da imagem' })).toBeVisible();
      await dialog.getByLabel('Nova categoria').fill('Cartas');
      await dialog.getByLabel('Nova categoria').press('Enter');
      await dialog.getByLabel('Nova categoria').fill('Festa');
      await dialog.getByRole('button', { name: 'Adicionar', exact: true }).click();
      await expect(dialog.getByRole('listitem')).toHaveText(['Cartas', 'Festa']);
      await dialog.getByRole('button', { name: 'Adicionar jogo' }).click();

      await expect(new AppShell(page).toast('Jogo do Café adicionado.')).toBeVisible();
      await expect(dialog).toBeHidden();
      const link = page.getByRole('tabpanel').getByRole('link', { name: 'Jogo do Café' });
      await expect(link).toBeVisible();
      const game = backend.db.games.find((g) => g.slug === 'jogo-do-cafe')!;
      expect(game).toMatchObject({ title: 'Jogo do Café', description: 'Um jogo de cartas para o fim de tarde.', min_players: 2, max_players: 4, duration_minutes: 30, min_age: 8, categories: ['Cartas', 'Festa'], owner_id: PLAYER.id, bgg_id: null });
      expect(game.cover_url).toMatch(new RegExp(`/game-covers/${PLAYER.id}/game-\\d+\\.webp$`));
      expect(backend.uploads).toHaveLength(1);
      expect(backend.uploads[0]).toMatchObject({ type: 'image/webp', width: 1600, height: 1067 });
      expect(backend.uploads[0]!.bytes).toBeLessThanOrEqual(2 * 1024 * 1024);
      expect(backend.db.communityGames.some((g) => g.game_id === game.id && g.added_by === PLAYER.id)).toBe(true);

      // O jogador é o dono de um jogo feito à mão: na ficha pode editá-lo todo.
      await link.click();
      await expect(page).toHaveURL(/\/games\/jogo-do-cafe$/);
      await expect(page.getByText('Cartas · Festa')).toBeVisible();
      await expect(page.getByText('8+ anos')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Editar jogo' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Editar categorias' })).toHaveCount(0);
    });

    test('um título que já existe no catálogo oferece adicionar esse jogo em vez de o duplicar', async ({ page, backend }) => {
      const community = backend.db.communities.find((c) => c.slug === 'clube-secreto-braga')!;
      const before = backend.db.games.length;
      await page.goto('communities/clube-secreto-braga');
      await page.getByRole('tab', { name: 'Jogos' }).click();
      await page.getByRole('button', { name: 'Novo jogo' }).click();
      const dialog = page.getByRole('dialog', { name: 'Adicionar um jogo novo' });

      await dialog.getByLabel('Título').fill('  uno ');
      await expect(dialog.getByText('"Uno" já está aqui.')).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Adicionar esse' })).toHaveCount(0);
      await dialog.getByLabel('Título').fill('DIXIT');
      await expect(dialog.getByText('Já existe "Dixit" no catálogo.')).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Adicionar jogo' })).toBeDisabled();
      await dialog.getByRole('button', { name: 'Adicionar esse' }).click();

      await expect(new AppShell(page).toast('Dixit adicionado.')).toBeVisible();
      await expect(dialog).toBeHidden();
      await expect(page.getByRole('tabpanel').getByRole('link', { name: 'Dixit' })).toBeVisible();
      expect(backend.db.games).toHaveLength(before);
      const dixit = backend.db.games.find((g) => g.slug === 'dixit')!;
      expect(backend.db.communityGames.some((e) => e.community_id === community.id && e.game_id === dixit.id)).toBe(true);
      expect(backend.calls(/rpc\/create_game/)).toHaveLength(0);
    });

    test('quem adicionou um jogo à mão edita-o na ficha; um jogo do BGG continua só com as categorias @responsive', async ({ page, backend }) => {
      Object.assign(backend.db.games.find((g) => g.slug === 'vaalbara')!, { owner_id: PLAYER.id, bgg_id: null, categories: ['Prehistoric', 'Strategy'], min_age: null });
      await page.goto('games/vaalbara');
      await page.getByRole('button', { name: 'Editar jogo' }).click();
      // The page itself turns editable: no pop-up, the fields sit where the facts are.
      await expect(page.getByRole('dialog')).toHaveCount(0);
      const form = page.getByRole('form', { name: 'Editar jogo' });
      await expect(form.getByLabel('Título')).toHaveValue('Vaalbara');
      await expect(form.getByRole('listitem')).toHaveText(['Prehistoric', 'Strategy']);
      await expect(form.getByRole('region', { name: 'Guardar alterações' })).toBeVisible();

      await form.getByLabel('Título').fill('Vaalbara: Edição Caseira');
      await form.getByRole('button', { name: 'Remover Strategy' }).click();
      await form.getByLabel(/Idade recomendada/).fill('10');
      await form.getByLabel('Duração (min)').fill('50');
      await form.getByLabel('Imagem', { exact: true }).setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: makePng(800, 600) });
      await expect(form.getByText('Alterações por guardar')).toBeVisible();
      await form.getByRole('button', { name: 'Guardar' }).click();

      await expect(new AppShell(page).toast('Jogo atualizado.')).toBeVisible();
      await expect(page.getByRole('form', { name: 'Editar jogo' })).toHaveCount(0);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vaalbara: Edição Caseira');
      await expect(page.getByText('10+ anos')).toBeVisible();
      const game = backend.db.games.find((g) => g.slug === 'vaalbara')!;
      expect(game).toMatchObject({ categories: ['Prehistoric'], min_age: 10, duration_minutes: 50 });
      expect(game.cover_url).toMatch(new RegExp(`/game-covers/${PLAYER.id}/`));

      // Imported from BGG: the owner only edits its categories.
      Object.assign(backend.db.games.find((g) => g.slug === 'dixit')!, { owner_id: PLAYER.id, bgg_id: 39856 });
      await page.goto('games/dixit');
      await expect(page.getByRole('button', { name: 'Editar categorias' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Editar jogo' })).toHaveCount(0);
    });

    test('cancelar a edição pergunta antes de descartar, e Esc e Ctrl+Enter funcionam @responsive', async ({ page, backend }) => {
      Object.assign(backend.db.games.find((g) => g.slug === 'vaalbara')!, { owner_id: PLAYER.id, bgg_id: null });
      await page.goto('games/vaalbara');
      await page.getByRole('button', { name: 'Editar jogo' }).click();
      const form = page.getByRole('form', { name: 'Editar jogo' });

      // Nothing changed: Cancel closes without asking.
      await form.getByRole('button', { name: 'Cancelar' }).click();
      await expect(form).toHaveCount(0);

      // Changed: Esc asks; dismissing keeps the edit, accepting discards it.
      await page.getByRole('button', { name: 'Editar jogo' }).click();
      await form.getByLabel('Título').fill('Outro nome');
      page.once('dialog', (d) => void d.dismiss());
      await page.keyboard.press('Escape');
      await expect(form.getByLabel('Título')).toHaveValue('Outro nome');
      page.once('dialog', (d) => void d.accept());
      await page.keyboard.press('Escape');
      await expect(form).toHaveCount(0);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vaalbara');
      expect(backend.calls(/update_game/)).toHaveLength(0);

      // Ctrl+Enter saves from the keyboard.
      await page.getByRole('button', { name: 'Editar jogo' }).click();
      await form.getByLabel('Título').fill('Vaalbara 2');
      await page.keyboard.press('Control+Enter');
      await expect(new AppShell(page).toast('Jogo atualizado.')).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vaalbara 2');
    });

    test('na edição na ficha, um título de outro jogo bloqueia guardar e o jogo dos outros não tem Editar', async ({ page, backend }) => {
      Object.assign(backend.db.games.find((g) => g.slug === 'vaalbara')!, { owner_id: PLAYER.id, bgg_id: null });
      await page.goto('games/vaalbara');
      await page.getByRole('button', { name: 'Editar jogo' }).click();
      const form = page.getByRole('form', { name: 'Editar jogo' });
      await form.getByLabel('Título').fill('Dixit');
      await expect(form.getByText('Já existe "Dixit" no catálogo.')).toBeVisible();
      await expect(form.getByRole('button', { name: 'Guardar' })).toBeDisabled();
      await form.getByLabel('Título').fill('Vaalbara');
      await expect(form.getByRole('button', { name: 'Guardar' })).toBeEnabled();

      Object.assign(backend.db.games.find((g) => g.slug === 'vaalbara')!, { owner_id: '00000000-0000-0000-0000-00000000dead' });
      await page.goto('games/vaalbara');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Editar jogo' })).toHaveCount(0);
    });

    test('um jogo com capa de licença aberta mostra o autor e a licença', async ({ page, backend }) => {
      Object.assign(backend.db.games.find((g) => g.slug === 'dixit')!, {
        cover_url: 'https://e2e.supabase.test/storage/v1/object/public/game-covers/catalogue/dixit.jpg',
        cover_credit: 'yoppy · CC BY 2.0 · Wikimedia Commons',
        cover_credit_url: 'https://commons.wikimedia.org/wiki/File:Dixit_game_0001.jpg',
      });
      await page.goto('games/dixit');
      const credit = page.getByRole('link', { name: 'Imagem: yoppy · CC BY 2.0 · Wikimedia Commons' });
      await expect(credit).toHaveAttribute('href', 'https://commons.wikimedia.org/wiki/File:Dixit_game_0001.jpg');
    });

    test('o formulário de jogo novo valida o título, os jogadores e a duração antes de enviar', async ({ page, backend }) => {
      await page.goto('communities/clube-secreto-braga');
      await page.getByRole('tab', { name: 'Jogos' }).click();
      await page.getByRole('button', { name: 'Novo jogo' }).click();
      const dialog = page.getByRole('dialog', { name: 'Adicionar um jogo novo' });
      await dialog.getByRole('button', { name: 'Adicionar jogo' }).click();
      await expect(dialog.getByText('Indica o título.')).toBeVisible();

      await dialog.getByLabel('Título').fill('Jogo');
      await dialog.getByLabel('Jogadores (mín.)').fill('5');
      await dialog.getByLabel('Jogadores (máx.)').fill('3');
      await dialog.getByLabel('Duração (min)').fill('0');
      await dialog.getByRole('button', { name: 'Adicionar jogo' }).click();
      await expect(dialog.getByText(/mínimo 1/)).toBeVisible();
      await dialog.getByLabel('Duração (min)').fill('30');
      await dialog.getByRole('button', { name: 'Adicionar jogo' }).click();
      await expect(dialog.getByText('O máximo não pode ser inferior ao mínimo.')).toBeVisible();
      expect(backend.calls(/rpc\/create_game/)).toHaveLength(0);
    });

    test('se o servidor recusa o jogo novo, o formulário fica aberto com o que foi escrito', async ({ page, backend }) => {
      backend.fail(/POST \/rest\/v1\/rpc\/create_game/, { status: 400, body: { code: '54000', message: 'too many games added today' } });
      await page.goto('communities/clube-secreto-braga');
      await page.getByRole('tab', { name: 'Jogos' }).click();
      await page.getByRole('button', { name: 'Novo jogo' }).click();
      const dialog = page.getByRole('dialog', { name: 'Adicionar um jogo novo' });
      await dialog.getByLabel('Título').fill('Jogo do Café');
      await dialog.getByRole('button', { name: 'Adicionar jogo' }).click();
      await expect(new AppShell(page).toast(/demasiados jogos hoje/)).toBeVisible();
      await expect(dialog).toBeVisible();
      await expect(dialog.getByLabel('Título')).toHaveValue('Jogo do Café');
    });

    test('se o jogo é criado mas não entra na estante, avisa e o jogo fica no catálogo', async ({ page, backend }) => {
      backend.fail(/POST \/rest\/v1\/community_games/, { status: 500, body: { code: 'XX000', message: 'falha simulada' } });
      await page.goto('communities/clube-secreto-braga');
      await page.getByRole('tab', { name: 'Jogos' }).click();
      await page.getByRole('button', { name: 'Novo jogo' }).click();
      const dialog = page.getByRole('dialog', { name: 'Adicionar um jogo novo' });
      await dialog.getByLabel('Título').fill('Jogo do Café');
      await dialog.getByRole('button', { name: 'Adicionar jogo' }).click();
      await expect(new AppShell(page).toast(/Jogo do Café já está no catálogo/)).toBeVisible();
      await expect(dialog).toBeHidden();
      expect(backend.db.games.some((g) => g.slug === 'jogo-do-cafe')).toBe(true);
      await expect(page.getByLabel('Adicionar do catálogo').locator('option', { hasText: 'Jogo do Café' })).toHaveCount(1);
    });

    test('o dono edita a localização e gere os jogos da comunidade', async ({ page, backend }) => {
      await page.goto('communities/clube-secreto-braga');
      await page.getByRole('tab', { name: 'Jogos' }).click();
      await page.getByLabel('Adicionar do catálogo').selectOption({ label: 'Dixit' });
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

    test('o dono põe a estante só para membros, e os membros continuam a vê-la', async ({ page, backend }) => {
      const braga = backend.db.communities.find((c) => c.slug === 'clube-secreto-braga')!;
      braga.visibility = 'public';
      await page.goto('communities/clube-secreto-braga');
      await page.getByRole('tab', { name: 'Gestão' }).click();
      await expect(page.getByLabel('Estante')).toHaveValue('public');
      await page.getByLabel('Estante').selectOption({ label: 'Só membros' });
      await page.getByRole('button', { name: 'Guardar' }).click();
      await expect(page.getByText('Comunidade atualizada.')).toBeVisible();
      expect(braga.shelf_visibility).toBe('private');
      await page.getByRole('tab', { name: 'Jogos' }).click();
      await expect(page.getByRole('tabpanel').getByRole('link', { name: 'Uno' })).toBeVisible();
    });

    test('o dono gere os exemplares da estante, cada um com o seu dono, e a informação adicional', async ({ page, backend }) => {
      await page.goto('communities/clube-secreto-braga');
      await page.getByRole('tab', { name: 'Jogos' }).click();
      const uno = page.getByRole('tabpanel').getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Uno', exact: true }) });
      await expect(uno).toContainText('1 exemplar');
      await expect(uno).toContainText('Donos: Dono da Estante');

      await uno.getByRole('button', { name: 'Editar Uno nesta estante' }).click();
      const editor = page.getByRole('dialog', { name: 'Uno nesta estante' });
      await expect(editor.getByRole('button', { name: 'Remover exemplar 1' })).toBeDisabled();
      await expect(editor.getByText('Para o tirar da estante, remove o jogo.')).toBeVisible();

      // Um exemplar novo começa como da comunidade; depois escolhe-se o dono.
      await editor.getByRole('button', { name: 'Adicionar exemplar' }).click();
      const second = editor.getByRole('combobox', { name: 'Dono do exemplar 2' });
      await expect(second).toHaveValue('');
      await second.selectOption({ label: 'Ana Teste' });
      await expect(page.getByText('Estante atualizada.').first()).toBeVisible();
      await expect(second).toHaveValue(PLAYER.id);

      await editor.getByLabel('Informação adicional').fill('Inclui a expansão Flip');
      await editor.getByRole('button', { name: 'Guardar informação' }).click();
      await expect(editor.getByRole('button', { name: 'Guardar informação' })).toBeDisabled();
      await editor.getByRole('button', { name: 'Concluído' }).click();
      await expect(editor).toBeHidden();

      await expect(uno).toContainText('2 exemplares');
      await expect(uno).toContainText('Donos: Dono da Estante, Ana Teste');
      await expect(uno).toContainText('Inclui a expansão Flip');
      const entry = backend.db.communityGames.find((g) => g.community_id === backend.db.communities.find((c) => c.slug === 'clube-secreto-braga')!.id)!;
      expect(entry).toMatchObject({ copies: 2, notes: 'Inclui a expansão Flip' });
      expect(backend.db.communityGameCopies.filter((k) => k.community_game_id === entry.id).map((k) => k.owner_id)).toEqual([OWNER.id, PLAYER.id]);

      // Retirar o primeiro exemplar deixa só o da Ana.
      await uno.getByRole('button', { name: 'Editar Uno nesta estante' }).click();
      await editor.getByRole('button', { name: 'Remover exemplar 1' }).click();
      await expect(editor.getByRole('combobox', { name: 'Dono do exemplar 2' })).toHaveCount(0);
      await expect(editor.getByRole('combobox', { name: 'Dono do exemplar 1' })).toHaveValue(PLAYER.id);
      await editor.getByRole('button', { name: 'Concluído' }).click();
      await expect(uno).toContainText('1 exemplar');
      await expect(uno).toContainText('Donos: Ana Teste');
    });

    test('o dono põe e remove a foto de capa, que aparece na página e no cartão da comunidade', async ({ page, backend }) => {
      await page.goto('communities/clube-secreto-braga');
      await page.getByRole('tab', { name: 'Gestão' }).click();
      await expect(page.getByRole('heading', { name: 'Foto de capa' })).toBeVisible();

      await expect(page.getByText(/MB/)).toHaveCount(0);
      await page.getByLabel('Adicionar foto de capa').setInputFiles({ name: 'avariada.png', mimeType: 'image/png', buffer: Buffer.from('fake-png') });
      await expect(page.getByText('Não foi possível ler esta imagem. Experimenta outra foto.')).toBeVisible();
      expect(backend.uploads).toHaveLength(0);

      // A photo straight off a phone, well over the 2 MB the bucket takes: shrunk to 3000 px wide before it is sent.
      const photo = makePng(3200, 800, { noise: true });
      expect(photo.length).toBeGreaterThan(2 * 1024 * 1024);
      await page.getByLabel('Adicionar foto de capa').setInputFiles({ name: 'capa.png', mimeType: 'image/png', buffer: photo });
      await expect(page.getByText('Foto de capa atualizada.')).toBeVisible();
      const community = () => backend.db.communities.find((c) => c.slug === 'clube-secreto-braga')!;
      expect(community().cover_url).toMatch(new RegExp(`/community-covers/${community().id}/cover-\\d+\\.webp$`));
      expect(backend.uploads).toHaveLength(1);
      expect(backend.uploads[0]).toMatchObject({ type: 'image/webp', width: 3000, height: 750 });
      expect(backend.uploads[0]!.bytes).toBeLessThanOrEqual(2 * 1024 * 1024);
      await expect(page.getByRole('img', { name: 'Foto de capa de Clube Secreto de Braga' }).first()).toBeVisible();

      // Reposicionar: começa centrada; Escape cancela; as setas mudam a posição e "Guardar posição" grava-a.
      expect(community().cover_position).toBe(50);
      await page.getByRole('button', { name: 'Reposicionar' }).click();
      const slider = page.getByRole('slider', { name: 'Posição vertical da foto de capa' });
      await expect(slider).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Escape');
      await expect(slider).toHaveCount(0);
      await page.getByRole('button', { name: 'Reposicionar' }).click();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await expect(slider).toHaveAttribute('aria-valuenow', '60');
      await page.getByRole('button', { name: 'Guardar posição' }).click();
      await expect(page.getByText('Posição da capa guardada.')).toBeVisible();
      await expect(slider).toHaveCount(0);
      expect(community().cover_position).toBe(60);
      await expect(page.locator('.community-hero img')).toHaveCSS('object-position', '50% 60%');

      await page.goto('communities');
      await expect(page.locator('.community-card--cover')).toHaveCount(1);

      await page.goto('communities/clube-secreto-braga');
      await page.getByRole('tab', { name: 'Gestão' }).click();
      await page.getByRole('button', { name: 'Remover foto de capa' }).click();
      await expect(page.getByText('Foto de capa removida.')).toBeVisible();
      expect(community().cover_url).toBeNull();
      expect(community().cover_position).toBe(50);
    });

    test('"Editar capa" abre logo o seletor de ficheiros e, depois de enviar, deixa reposicionar a foto', async ({ page, backend }) => {
      const community = () => backend.db.communities.find((c) => c.slug === 'clube-secreto-braga')!;
      await page.goto('communities/clube-secreto-braga');
      const chooser = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: 'Editar capa' }).click();
      await (await chooser).setFiles({ name: 'capa.png', mimeType: 'image/png', buffer: makePng(1600, 400) });
      await expect(page.getByText('Foto de capa atualizada.')).toBeVisible();
      expect(community().cover_url).toContain(`/community-covers/${community().id}/cover-`);
      // Fica logo em modo de reposicionar, ainda na mesma aba.
      await expect(page.getByRole('tab', { name: 'Membros' })).toHaveAttribute('aria-selected', 'true');
      const slider = page.getByRole('slider', { name: 'Posição vertical da foto de capa' });
      await expect(slider).toBeFocused();
      await page.keyboard.press('ArrowUp');
      await page.getByRole('button', { name: 'Guardar posição' }).click();
      await expect(slider).toHaveCount(0);
      expect(community().cover_position).toBe(45);
    });
  });
});
