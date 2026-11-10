import { AppShell } from '../pages/AppShell';
import { LoginPage } from '../pages/LoginPage';
import { expect, test } from '../fixtures';

const EMAIL = 'ana.teste@example.test';

test.describe('Autenticação', () => {
  test.describe('página de entrada', () => {
    test('mostra os métodos de acesso e liga ao registo @smoke', async ({ page }) => {
      const login = new LoginPage(page);
      await login.goto();
      await expect(login.heading()).toHaveText('Entrar na Table Tale');
      await expect(login.google()).toBeEnabled();
      await expect(login.github()).toBeEnabled();
      await expect(login.email()).toBeVisible();

      await page.getByRole('link', { name: 'Criar conta' }).click();
      await expect(page).toHaveURL(/\/register$/);
      await expect(login.heading()).toHaveText('Cria a tua conta Table Tale');
      await page.getByRole('main').getByRole('link', { name: 'Entrar', exact: true }).click();
      await expect(page).toHaveURL(/\/login$/);
    });

    test('um utilizador com sessão é reencaminhado para os jogos', async ({ page, signIn }) => {
      await signIn();
      await page.goto('login');
      await expect(page).toHaveURL(/\/games$/);
    });
  });

  test.describe('link mágico por e-mail', () => {
    test('exige o e-mail', async ({ page }) => {
      const login = new LoginPage(page);
      await login.goto();
      await login.submit().click();
      await expect(login.error()).toHaveText('Indica o teu e-mail.');
      await expect(login.email()).toHaveAttribute('aria-invalid', 'true');
      await expect(login.email()).toHaveAccessibleDescription('Indica o teu e-mail.');
    });

    test('rejeita formatos de e-mail inválidos', async ({ page, backend }) => {
      const login = new LoginPage(page);
      await login.goto();
      for (const invalid of ['sem-arroba', 'a@b', 'nome@']) {
        await login.requestMagicLink(invalid);
        await expect(login.error()).toHaveText('Este e-mail não parece válido. Ex.: nome@exemplo.pt');
      }
      expect(backend.otpRequests).toHaveLength(0);
    });

    test('envia o link, confirma o destino e permite usar outro e-mail @smoke', async ({ page, backend }) => {
      const login = new LoginPage(page);
      await login.goto();
      await login.requestMagicLink(`  ${EMAIL}  `);
      await expect(page.getByRole('heading', { name: 'Verifica o teu correio' })).toBeVisible();
      await expect(page.getByRole('status').filter({ hasText: EMAIL })).toBeVisible();
      expect(backend.otpRequests).toEqual([EMAIL]);

      await page.getByRole('button', { name: 'Usar outro e-mail' }).click();
      await expect(login.email()).toBeVisible();
    });

    test('conclui o acesso ao abrir o link recebido e regressa ao destino pedido', async ({ page, backend }) => {
      backend.giveCard(); // jogador que já descobriu o destino
      const login = new LoginPage(page);
      await login.goto();
      await login.requestMagicLink(EMAIL);
      await expect(page.getByRole('heading', { name: 'Verifica o teu correio' })).toBeVisible();

      // O e-mail real é substituído pelo seu efeito: abrir o link de retorno com o código PKCE.
      await page.goto('auth/callback?code=e2e-magic&next=%2Fevents');
      await expect(page).toHaveURL(/\/events$/);
      await new AppShell(page).expectSignedIn();
    });

    test('mostra mensagem clara quando há demasiados pedidos', async ({ page, backend }) => {
      backend.fail(/POST \/auth\/v1\/otp/, { status: 429, body: { code: 429, error_code: 'over_email_send_rate_limit', msg: 'email rate limit exceeded' } });
      const login = new LoginPage(page);
      await login.goto();
      await login.requestMagicLink(EMAIL);
      await expect(login.error()).toHaveText('Demasiados pedidos. Aguarda um minuto e tenta novamente.');
    });

    test('mostra erro genérico quando a API falha e permite tentar de novo', async ({ page, backend }) => {
      backend.fail(/POST \/auth\/v1\/otp/, { status: 500, body: { code: 500, msg: 'boom' } }, 1);
      const login = new LoginPage(page);
      await login.goto();
      await login.requestMagicLink(EMAIL);
      await expect(login.error()).toHaveText('Não foi possível enviar o link de acesso.');
      await login.submit().click();
      await expect(page.getByRole('heading', { name: 'Verifica o teu correio' })).toBeVisible();
    });

    test('trata a falha de rede sem perder o e-mail escrito', async ({ page, backend }) => {
      backend.fail(/POST \/auth\/v1\/otp/, 'network', 1);
      const login = new LoginPage(page);
      await login.goto();
      await login.requestMagicLink(EMAIL);
      await expect(login.error()).toHaveText('Não foi possível enviar o link de acesso.');
      await expect(login.email()).toHaveValue(EMAIL);
    });

    test('desativa o botão durante o envio e não duplica o pedido', async ({ page, backend }) => {
      const release = backend.hold(/POST \/auth\/v1\/otp/);
      const login = new LoginPage(page);
      await login.goto();
      await login.email().fill(EMAIL);
      await login.submit().click();
      await expect(page.getByRole('button', { name: 'A enviar link…' })).toBeDisabled();
      await login.email().press('Enter');
      release();
      await expect(page.getByRole('heading', { name: 'Verifica o teu correio' })).toBeVisible();
      expect(backend.otpRequests).toHaveLength(1);
    });
  });

  test.describe('Google e GitHub', () => {
    test('entrar com Google leva aos jogos com a sessão iniciada @smoke', async ({ page, backend }) => {
      backend.giveCard();
      const login = new LoginPage(page);
      await login.goto();
      await login.google().click();
      await expect(page).toHaveURL(/\/games$/);
      await new AppShell(page).expectSignedIn();
    });

    test('a primeira entrada leva ao Sorteio do Destino @smoke', async ({ page }) => {
      const login = new LoginPage(page);
      await login.goto();
      await login.google().click();
      await expect(page).toHaveURL(/\/fate$/);
      await expect(page.getByRole('heading', { level: 1, name: 'O Sorteio do Destino' })).toBeVisible();
    });

    test('a primeira entrada por link mágico também leva ao Sorteio, mesmo com outro destino pedido', async ({ page }) => {
      const login = new LoginPage(page);
      await login.goto();
      await login.requestMagicLink(EMAIL);
      await page.goto('auth/callback?code=e2e-magic&next=%2Fevents');
      await expect(page).toHaveURL(/\/fate$/);
    });

    test('quem já tem carta não volta ao Sorteio ao entrar @smoke', async ({ page, backend }) => {
      backend.giveCard();
      const login = new LoginPage(page);
      await login.goto();
      await login.google().click();
      await expect(page).toHaveURL(/\/games$/);
    });

    test('entrar com GitHub também funciona', async ({ page, backend }) => {
      backend.giveCard();
      const login = new LoginPage(page);
      await login.goto();
      await login.github().click();
      await expect(page).toHaveURL(/\/games$/);
      await new AppShell(page).expectSignedIn();
    });

    test('mostra o estado de redirecionamento enquanto o fornecedor responde', async ({ page, backend }) => {
      backend.giveCard();
      const release = backend.hold(/GET \/auth\/v1\/authorize/);
      const login = new LoginPage(page);
      await login.goto();
      await login.google().click({ noWaitAfter: true });
      await expect(page.getByRole('button', { name: 'A redirecionar…' })).toBeDisabled();
      release();
      await expect(page).toHaveURL(/\/games$/);
    });

    test('depois de entrar, regressa à página protegida que o utilizador queria @smoke', async ({ page, backend }) => {
      backend.giveCard();
      await page.goto('profile');
      await expect(page).toHaveURL(/\/login$/);
      await new LoginPage(page).google().click();
      await expect(page).toHaveURL(/\/profile$/);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ana Teste');
    });

    test('um método desativado no projeto fica indisponível antes de sair da aplicação', async ({ page, backend }) => {
      backend.providers.github = false;
      const login = new LoginPage(page);
      await login.goto();
      await expect(login.github()).toBeDisabled();
      await expect(login.github()).toContainText('indisponível de momento');
      await expect(page.getByRole('note')).toContainText('Alguns métodos de início de sessão ainda não estão ativos.');
      await expect(login.google()).toBeEnabled();
    });

    test('cancelar no fornecedor mostra uma explicação e volta ao login', async ({ page, backend }) => {
      backend.oauthError = { code: 'access_denied', description: 'The user denied access' };
      const login = new LoginPage(page);
      await login.goto();
      await login.google().click();
      await expect(page.getByRole('heading', { name: 'Não foi possível concluir o login' })).toBeVisible();
      await expect(page.getByText('Cancelaste o início de sessão')).toBeVisible();
      await page.getByRole('link', { name: 'Voltar ao login' }).click();
      await expect(page).toHaveURL(/\/login$/);
    });

    test('um link expirado explica o que fazer', async ({ page }) => {
      await page.goto('auth/callback?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
      await expect(page.getByText('O link pode ter expirado ou já ter sido usado.')).toBeVisible();
    });

    test('um código sem pedido anterior neste dispositivo acaba em erro compreensível', async ({ page }) => {
      test.slow();
      await page.goto('auth/callback?code=codigo-de-outro-dispositivo');
      await expect(page.getByRole('heading', { name: 'Não foi possível concluir o login' })).toBeVisible({ timeout: 25_000 });
      await expect(page.getByText('O link pode ter expirado ou já ter sido usado.')).toBeVisible();
    });

    test('um destino externo no parâmetro next nunca é seguido (redirecionamento aberto)', async ({ page, signIn, backend }) => {
      backend.giveCard();
      await signIn();
      for (const next of ['//evil.example.test', 'https://evil.example.test', '/\\evil.example.test']) {
        await page.goto(`auth/callback?next=${encodeURIComponent(next)}`);
        await expect(page).toHaveURL(/\/games$/);
        expect(new URL(page.url()).hostname).toBe('localhost');
      }
    });
  });

  test.describe('sessão', () => {
    test('termina a sessão, avisa e volta a proteger as rotas @smoke', async ({ page, signIn }) => {
      await signIn();
      await page.goto('games');
      const shell = new AppShell(page);
      await shell.openMenuIfCollapsed();
      await shell.signOut().click();
      await expect(shell.toast('Sessão terminada.')).toBeVisible();
      await shell.expectSignedOut();

      await page.reload();
      await shell.expectSignedOut();
      await page.goto('profile');
      await expect(page).toHaveURL(/\/login$/);
    });

    test('a sessão persiste ao recarregar e numa nova sessão do navegador', async ({ page, signIn, context, browser, backend }, testInfo) => {
      await signIn();
      await page.goto('profile');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ana Teste');
      await page.reload();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ana Teste');

      const storageState = await context.storageState();
      const fresh = await browser.newContext({ storageState, baseURL: testInfo.project.use.baseURL, locale: 'pt-PT' });
      await backend.install(fresh);
      const freshPage = await fresh.newPage();
      await freshPage.goto('profile');
      await expect(freshPage.getByRole('heading', { level: 1 })).toHaveText('Ana Teste');
      await fresh.close();
    });

    test('uma sessão expirada que não pode ser renovada volta ao login', async ({ page, signIn, backend }) => {
      await signIn({ expiresIn: -120 });
      backend.fail(/POST \/auth\/v1\/token/, { status: 400, body: { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token: Refresh Token Not Found' } });
      await page.goto('profile');
      await expect(page).toHaveURL(/\/login$/);
      await expect(new LoginPage(page).google()).toBeVisible();
    });

    test('uma sessão expirada que pode ser renovada continua a funcionar', async ({ page, signIn, backend }) => {
      await signIn({ expiresIn: -120 });
      await page.goto('profile');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ana Teste');
      expect(backend.calls(/POST \/auth\/v1\/token\?grant_type=refresh_token/).length).toBeGreaterThan(0);
    });

    test('páginas privadas exigem sessão e guardam o destino', async ({ page }) => {
      for (const path of ['profile', 'fate']) {
        await page.goto(path);
        await expect(page).toHaveURL(/\/login$/);
      }
    });
  });
});
