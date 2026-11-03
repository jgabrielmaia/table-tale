import { AppShell } from '../pages/AppShell';
import { ProfilePage } from '../pages/ProfilePage';
import { AVATAR_URL, AUTH_STORAGE_KEY } from '../utils/constants';
import { expect, test, PLAYER } from '../fixtures';

const png = (bytes = 70) => Buffer.alloc(bytes, 1);

test.describe('Perfil', () => {
  test.beforeEach(async ({ signIn }) => {
    await signIn();
  });

  test.describe('visualização', () => {
    test('mostra identidade, nível, progresso e estatísticas iniciais @smoke', async ({ page }) => {
      const profile = new ProfilePage(page);
      await profile.goto();
      await expect(profile.name()).toHaveText('Ana Teste');
      await expect(page.getByText('Membro desde janeiro de 2026')).toBeVisible();
      await expect(page.getByText('Nível 1')).toBeVisible();
      await expect(page.getByText('Aprendiz de Mesa')).toBeVisible();
      await expect(page.getByText('Progresso para o nível 2 — Leitor de Runas')).toBeVisible();
      await expect(profile.progress().first()).toHaveAttribute('aria-valuenow', '0');
      await expect(page.getByText('0 / 300 XP')).toBeVisible();
      await expect(page.getByRole('list', { name: 'Estatísticas' })).toContainText('Jogos jogados');
      await expect(page.getByText('Destino por revelar')).toBeVisible();
      await expect(page.getByText('Ainda sem atividade')).toBeVisible();
    });

    test('a experiência, as estatísticas e a atividade acompanham o diário', async ({ page, backend }) => {
      backend.addSession(PLAYER.id, 'dixit', { players_count: 4, rating: 5, notes: 'Boa noite' });
      const profile = new ProfilePage(page);
      await profile.goto();
      // 1 sessão (+40) e a conquista "Primeira Expedição" (+25).
      await expect(page.getByText('65 / 300 XP')).toBeVisible();
      await expect(profile.progress().first()).toHaveAttribute('aria-valuenow', '65');
      await expect(page.getByRole('list', { name: 'Estatísticas' }).getByRole('listitem').filter({ hasText: 'Jogos jogados' })).toContainText('1');
      await expect(page.getByRole('tabpanel')).toContainText('Jogou Dixit');
      await expect(page.getByRole('tabpanel')).toContainText('4 jogadores');
      await expect(page.getByRole('tabpanel').getByRole('link', { name: /Jogou Dixit/ })).toHaveAttribute('href', /\/games\/dixit$/);
    });

    test('mostra a facção e a carta do Sorteio do Destino (e nenhuma escolha de facção)', async ({ page, backend }) => {
      backend.giveCard(PLAYER.id, { id: 'earth', faction: 'elementais' });
      const profile = new ProfilePage(page);
      await profile.goto();
      await expect(page.getByText('Elementais', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Radices Tenent Mundum')).toBeVisible();
      await expect(profile.identity().getByRole('heading', { name: 'Terra' })).toBeVisible();
      await expect(profile.identity().getByRole('img', { name: 'Terra' })).toBeVisible();
    });

    test('o separador de atividade navega com as setas do teclado', async ({ page }) => {
      await new ProfilePage(page).goto();
      const activity = page.getByRole('tab', { name: 'Atividade recente' });
      await activity.focus();
      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('tab', { name: /^Eventos/ })).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByRole('tabpanel')).toContainText('Ainda não participaste em eventos');
    });

    test('mostra erro com opção de tentar novamente quando o perfil não carrega', async ({ page, backend }) => {
      const unfail = backend.fail(/GET \/rest\/v1\/profiles\?select=id/, { status: 500, body: { code: 'XX000', message: 'falha simulada' } });
      await new ProfilePage(page).goto();
      await expect(page.getByText(/Não foi possível carregar o perfil: falha simulada/)).toBeVisible({ timeout: 15_000 });
      unfail();
      await page.getByRole('button', { name: 'Tentar novamente' }).click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ana Teste');
    });

    test('explica quando o perfil ainda está a ser criado', async ({ page, backend }) => {
      backend.db.profiles = backend.db.profiles.filter((p) => p.id !== PLAYER.id);
      await new ProfilePage(page).goto();
      await expect(page.getByText('O teu perfil ainda está a ser criado.')).toBeVisible();
    });

    test('adota a foto do fornecedor de login quando o perfil ainda não tem avatar', async ({ page, backend }) => {
      backend.users[0]!.avatarUrl = AVATAR_URL;
      // Renova a sessão semeada para incluir os dados do fornecedor (corre depois do script do fixture `signIn`).
      await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: AUTH_STORAGE_KEY, value: backend.sessionFor() });
      await page.goto('profile');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ana Teste');
      await expect.poll(() => backend.profile().avatar_url).toBe(AVATAR_URL);
    });
  });

  test.describe('conquistas', () => {
    test('separa as descobertas das que estão por descobrir, com as descobertas primeiro', async ({ page, backend }) => {
      backend.addSession(PLAYER.id, 'dixit');
      await new ProfilePage(page).goto();
      const found = page.getByRole('heading', { name: /^Descobertas/ });
      const hidden = page.getByRole('heading', { name: /^Por descobrir/ });
      await expect(found).toBeVisible();
      await expect(hidden).toBeVisible();
      const [foundY, hiddenY] = await Promise.all([found.boundingBox(), hidden.boundingBox()]);
      expect(foundY!.y).toBeLessThan(hiddenY!.y);
      await expect(page.getByRole('region', { name: /Descobertas/ }).getByRole('heading', { name: 'Primeira Expedição' })).toBeVisible();
      await expect(page.getByRole('region', { name: /Por descobrir/ }).getByRole('heading', { name: 'Cronista da Mesa' })).toBeVisible();
      await expect(page.getByText('1 de 6 desbloqueadas').or(page.getByText(/\d+ de \d+ desbloqueadas/))).toBeVisible();
    });

    test('sem nada desbloqueado só existe o grupo "Por descobrir", com progresso', async ({ page }) => {
      await new ProfilePage(page).goto();
      await expect(page.getByRole('heading', { name: /^Descobertas/ })).toHaveCount(0);
      await expect(page.getByRole('heading', { name: /^Por descobrir/ })).toBeVisible();
      await expect(page.getByRole('progressbar', { name: 'Progresso de Cronista da Mesa' })).toHaveAttribute('aria-valuetext', '0 de 5');
    });

    test('o Sorteio do Destino desbloqueia "Destino Revelado"', async ({ page, backend }) => {
      backend.giveCard();
      await new ProfilePage(page).goto();
      await expect(page.getByRole('region', { name: /Descobertas/ }).getByRole('heading', { name: 'Destino Revelado' })).toBeVisible();
    });
  });

  test.describe('editar perfil', () => {
    test('abre o diálogo sem campo de facção e devolve o foco ao fechar com Esc @smoke', async ({ page }) => {
      const profile = new ProfilePage(page);
      await profile.goto();
      await profile.edit().click();
      await expect(profile.dialog()).toBeVisible();
      await expect(profile.nameField()).toHaveValue('Ana Teste');
      await expect(profile.dialog().getByLabel(/Facção/)).toHaveCount(0);
      await expect(profile.dialog().getByRole('combobox')).toHaveCount(0);
      await page.keyboard.press('Escape');
      await expect(profile.dialog()).toBeHidden();
      await expect(profile.edit()).toBeFocused();
    });

    test('cancelar descarta as alterações', async ({ page, backend }) => {
      const profile = new ProfilePage(page);
      await profile.goto();
      await profile.edit().click();
      await profile.nameField().fill('Nome Descartado');
      await profile.cancel().click();
      await expect(profile.dialog()).toBeHidden();
      await expect(profile.name()).toHaveText('Ana Teste');
      expect(backend.calls(/PATCH \/rest\/v1\/profiles/)).toHaveLength(0);
    });

    test('guarda nome e bio, atualiza a página e persiste; nunca envia a facção @smoke', async ({ page, backend }) => {
      const profile = new ProfilePage(page);
      await profile.goto();
      await profile.edit().click();
      await profile.nameField().fill('  Ana Renomeada  ');
      await profile.bioField().fill('Gosto de jogos cooperativos.');
      await profile.save().click();

      await expect(new AppShell(page).toast('Perfil atualizado')).toBeVisible();
      await expect(profile.dialog()).toBeHidden();
      await expect(profile.name()).toHaveText('Ana Renomeada');
      await expect(page.getByText('Gosto de jogos cooperativos.')).toBeVisible();

      const patch = backend.calls(/PATCH \/rest\/v1\/profiles/).at(-1)!.body as Record<string, unknown>;
      expect(patch).toMatchObject({ display_name: 'Ana Renomeada', bio: 'Gosto de jogos cooperativos.' });
      expect(Object.keys(patch)).not.toContain('faction_id');

      await page.reload();
      await expect(profile.name()).toHaveText('Ana Renomeada');
    });

    test('o nome e a bio têm limite de caracteres no próprio campo e a validação recusa o que está vazio ou curto', async ({ page, backend }) => {
      const profile = new ProfilePage(page);
      await profile.goto();
      await profile.edit().click();

      await profile.nameField().fill('A');
      await profile.save().click();
      await expect(profile.dialog().getByRole('alert').filter({ hasText: 'O nome deve ter pelo menos 2 caracteres.' })).toBeVisible();
      await expect(profile.nameField()).toHaveAttribute('aria-invalid', 'true');

      await profile.nameField().fill('   ');
      await profile.save().click();
      await expect(profile.dialog().getByRole('alert').filter({ hasText: 'O nome deve ter pelo menos 2 caracteres.' })).toBeVisible();

      await profile.nameField().fill('N'.repeat(61));
      await expect(profile.nameField()).toHaveValue('N'.repeat(60));
      await profile.bioField().fill('b'.repeat(281));
      await expect(profile.bioField()).toHaveValue('b'.repeat(280));
      expect(backend.calls(/PATCH \/rest\/v1\/profiles/)).toHaveLength(0);
    });

    test('mantém o diálogo aberto e o que foi escrito quando o servidor falha', async ({ page, backend }) => {
      backend.fail(/PATCH \/rest\/v1\/profiles/, { status: 500, body: { code: 'XX000', message: 'falha simulada' } });
      const profile = new ProfilePage(page);
      await profile.goto();
      await profile.edit().click();
      await profile.nameField().fill('Nome Pendente');
      await profile.save().click();
      await expect(new AppShell(page).toast(/Não foi possível guardar o perfil: falha simulada/)).toBeVisible();
      await expect(profile.dialog()).toBeVisible();
      await expect(profile.nameField()).toHaveValue('Nome Pendente');
    });

    test('mostra "A guardar…" e não envia o pedido duas vezes', async ({ page, backend }) => {
      const release = backend.hold(/PATCH \/rest\/v1\/profiles/);
      const profile = new ProfilePage(page);
      await profile.goto();
      await profile.edit().click();
      await profile.nameField().fill('Nome Lento');
      await profile.save().click();
      await expect(page.getByRole('button', { name: 'A guardar…' })).toBeDisabled();
      release();
      await expect(profile.dialog()).toBeHidden();
      expect(backend.calls(/PATCH \/rest\/v1\/profiles/)).toHaveLength(1);
    });

    test('carrega um avatar válido, guarda o endereço público e mostra-o no perfil', async ({ page, backend }) => {
      const profile = new ProfilePage(page);
      await profile.goto();
      await profile.edit().click();
      await profile.avatarField().setInputFiles({ name: 'novo.png', mimeType: 'image/png', buffer: png() });
      await profile.save().click();
      await expect(profile.dialog()).toBeHidden();
      expect(backend.calls(/POST \/storage\/v1\/object\/avatars\//)).toHaveLength(1);
      await expect.poll(() => backend.profile().avatar_url).toContain(`/storage/v1/object/public/avatars/${PLAYER.id}/avatar-`);
    });

    test('rejeita formatos e tamanhos de avatar inválidos antes de enviar', async ({ page, backend }) => {
      const profile = new ProfilePage(page);
      await profile.goto();
      await profile.edit().click();

      await profile.avatarField().setInputFiles({ name: 'doc.txt', mimeType: 'text/plain', buffer: Buffer.from('não sou imagem') });
      await expect(profile.dialog().getByRole('alert')).toHaveText('Usa uma imagem PNG, JPEG ou WebP.');

      await profile.avatarField().setInputFiles({ name: 'grande.png', mimeType: 'image/png', buffer: png(1024 * 1024 + 1) });
      await expect(profile.dialog().getByRole('alert')).toHaveText('A imagem não pode exceder 1 MB.');
      expect(backend.calls(/\/storage\//)).toHaveLength(0);
    });

    test('avisa quando o envio do avatar falha e não altera o perfil', async ({ page, backend }) => {
      backend.fail(/POST \/storage\/v1\/object\/avatars\//, { status: 500, body: { message: 'storage em baixo' } });
      const profile = new ProfilePage(page);
      await profile.goto();
      await profile.edit().click();
      await profile.avatarField().setInputFiles({ name: 'novo.png', mimeType: 'image/png', buffer: png() });
      await profile.save().click();
      await expect(new AppShell(page).toast(/Falha no upload do avatar/)).toBeVisible();
      await expect(profile.dialog()).toBeVisible();
      expect(backend.calls(/PATCH \/rest\/v1\/profiles/)).toHaveLength(0);
    });
  });

  test.describe('métodos de login', () => {
    test('lista os métodos associados e permite associar outro fornecedor', async ({ page }) => {
      const profile = new ProfilePage(page);
      await profile.goto();
      await expect(page.getByText('Métodos de login associados: E-mail (magic link).')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Associar Google' })).toBeVisible();
      await page.getByRole('button', { name: 'Associar GitHub' }).click();
      await expect(page).toHaveURL(/\/profile$/);
      await expect(page.getByText('Métodos de login associados: E-mail (magic link), GitHub.')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Associar GitHub' })).toHaveCount(0);
    });
  });
});
