import { AppShell } from '../pages/AppShell';
import { FatePage } from '../pages/FatePage';
import { AVATAR_URL } from '../utils/constants';
import { expect, test, PLAYER } from '../fixtures';

const REVEAL_TIMEOUT = 30_000;

test.describe('O Sorteio do Destino', () => {
  test('exige sessão e guarda o destino @smoke', async ({ page }) => {
    await page.goto('fate');
    await expect(page).toHaveURL(/\/login$/);
  });

  test.describe('com sessão', () => {
    test.beforeEach(async ({ signIn }) => {
      await signIn();
    });

    test('o convite fala de destino e revelação, sem pedir uma escolha', async ({ page }) => {
      const fate = new FatePage(page);
      await fate.goto();
      await expect(page.getByRole('heading', { level: 1, name: 'O Sorteio do Destino' })).toBeVisible();
      await expect(page.getByText('«Nove cartas. Duas facções. Um destino.»')).toBeVisible();
      await expect(fate.start()).toBeVisible();
      await expect(page.getByText(/Escolhe a tua (carta|facção)|Confia no teu instinto/)).toHaveCount(0);
    });

    test('mostra nove cartas viradas e a frase "Não escolhes o teu destino"', async ({ page }) => {
      const fate = new FatePage(page);
      await fate.goto();
      await fate.start().click();
      await expect(page.getByRole('heading', { name: 'Nove cartas aguardam.' })).toBeVisible();
      await expect(page.getByText('Não escolhes o teu destino. As cartas revelam-no.')).toBeVisible();
      await expect(fate.cards()).toHaveCount(9);
      await expect(fate.cards().first()).toHaveAccessibleName('Revelar a carta 1 de 9');
      await expect(fate.cards().last()).toHaveAccessibleName('Revelar a carta 9 de 9');
    });

    test('revela a carta atribuída pelo servidor, a facção e a identidade, e entra no perfil @smoke', async ({ page, backend }) => {
      const fate = new FatePage(page);
      await fate.goto();
      await fate.draw(4);

      await expect(page.getByRole('heading', { name: 'A Temperança', level: 2 })).toBeVisible({ timeout: REVEAL_TIMEOUT });
      await expect(page.getByText('Pertences aos Arcanos')).toBeVisible();
      await expect(page.getByText('O conhecimento é poder.')).toBeVisible();
      expect(backend.calls(/POST \/rest\/v1\/rpc\/draw_fate_card/)).toHaveLength(1);

      await fate.continue().click();
      await expect(page.getByRole('heading', { name: 'Bem-vindo à Table Tale.' })).toBeVisible();
      await expect(page.getByText('O teu destino foi revelado.')).toBeVisible();
      await expect(page.getByText('XIV — A Temperança')).toBeVisible();

      await fate.enter().click();
      await expect(page).toHaveURL(/\/profile$/);
      await expect(page.getByRole('region', { name: 'A minha identidade Table Tale' }).getByRole('heading', { name: 'A Temperança' })).toBeVisible();
      await expect(page.getByText('Arcanos', { exact: true }).first()).toBeVisible();
      await expect(page.getByRole('region', { name: /Descobertas/ }).getByRole('heading', { name: 'Destino Revelado' })).toBeVisible();
      expect(backend.profile().faction_id).not.toBeNull();
    });

    test('a carta clicada não influencia o resultado: o servidor decide', async ({ page, backend }) => {
      backend.nextCard = { id: 'fire', faction: 'elementais' };
      const fate = new FatePage(page);
      await fate.goto();
      await fate.draw(0);
      await expect(page.getByRole('heading', { name: 'Fogo', level: 2 })).toBeVisible({ timeout: REVEAL_TIMEOUT });
      await expect(page.getByText('Pertences aos Elementais')).toBeVisible();
      await expect(page.getByText('A força é poder.')).toBeVisible();
      expect(backend.calls(/rpc\/draw_fate_card/)[0]!.body).toEqual({});
    });

    test('bloqueia as cartas depois de uma ser tocada e não sorteia duas vezes', async ({ page, backend }) => {
      const release = backend.hold(/POST \/rest\/v1\/rpc\/draw_fate_card/);
      const fate = new FatePage(page);
      await fate.goto();
      await fate.draw(2);
      for (let i = 0; i < 9; i++) await expect(fate.cards().nth(i)).toBeDisabled();
      release();
      await expect(page.getByRole('heading', { name: 'A Temperança', level: 2 })).toBeVisible({ timeout: REVEAL_TIMEOUT });
      expect(backend.calls(/rpc\/draw_fate_card/)).toHaveLength(1);
    });

    test('mostra o erro do sorteio e permite tentar outra vez', async ({ page, backend }) => {
      backend.fail(/POST \/rest\/v1\/rpc\/draw_fate_card/, { status: 500, body: { code: 'XX000', message: 'falha simulada' } }, 1);
      const fate = new FatePage(page);
      await fate.goto();
      await fate.draw(1);
      await expect(page.getByRole('alert')).toHaveText('Não foi possível concluir o sorteio. Tenta novamente.');
      await expect(fate.cards().first()).toBeEnabled();
      await fate.cards().first().click();
      await expect(page.getByRole('heading', { name: 'A Temperança', level: 2 })).toBeVisible({ timeout: REVEAL_TIMEOUT });
    });

    test('se a temporada fechou durante o sorteio, explica e não revela nada', async ({ page, backend }) => {
      backend.fail(/POST \/rest\/v1\/rpc\/draw_fate_card/, { status: 400, body: { code: 'P0001', message: 'no active season', hint: 'no_active_season' } });
      const fate = new FatePage(page);
      await fate.goto();
      await fate.draw(0);
      await expect(page.getByRole('alert')).toHaveText('Não há nenhuma temporada aberta neste momento. Volta em breve.');
      await expect(page.getByRole('heading', { level: 2, name: /Temperança|Fogo|Terra/ })).toHaveCount(0);
    });

    test('sem temporada aberta oferece voltar ao perfil', async ({ page, backend }) => {
      backend.db.seasons = [];
      await new FatePage(page).goto();
      await expect(page.getByText('Não há nenhuma temporada aberta.')).toBeVisible();
      await page.getByRole('link', { name: 'Voltar ao meu perfil' }).click();
      await expect(page).toHaveURL(/\/profile$/);
    });

    test('quem já tem carta nesta temporada é reencaminhado para o perfil', async ({ page, backend }) => {
      backend.giveCard();
      await new FatePage(page).goto();
      await expect(page).toHaveURL(/\/profile$/);
    });

    test('se o servidor já tinha atribuído a carta, segue para o perfil sem nova revelação', async ({ page, backend }) => {
      const fate = new FatePage(page);
      await fate.goto();
      await fate.start().click();
      await expect(fate.cards()).toHaveCount(9);
      backend.giveCard();
      await fate.cards().first().click();
      await expect(page).toHaveURL(/\/profile$/);
    });

    test('funciona só com o teclado', async ({ page }) => {
      const fate = new FatePage(page);
      await fate.goto();
      await fate.start().focus();
      await page.keyboard.press('Enter');
      await fate.cards().nth(3).focus();
      await expect(fate.cards().nth(3)).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('heading', { name: 'A Temperança', level: 2 })).toBeVisible({ timeout: REVEAL_TIMEOUT });
      await fate.continue().focus();
      await page.keyboard.press('Enter');
      await expect(fate.enter()).toBeVisible();
    });

    test('em inglês mantém o título original da carta e traduz o resto', async ({ page }) => {
      const fate = new FatePage(page);
      await fate.goto();
      await new AppShell(page).switchLanguage('EN');
      await expect(page.getByRole('button', { name: 'Discover your fate' })).toBeVisible();
      await page.getByRole('button', { name: 'Discover your fate' }).click();
      await expect(page.getByText('You do not choose your destiny. The cards reveal it.')).toBeVisible();
      await page.getByRole('button', { name: 'Reveal card 1 of 9' }).click();
      await expect(page.getByRole('heading', { name: 'Temperance', level: 2 })).toBeVisible({ timeout: REVEAL_TIMEOUT });
      await expect(page.getByText('You belong to the Arcanos')).toBeVisible();
    });
  });

  test.describe('poster de partilha', () => {
    test.beforeEach(async ({ signIn }) => {
      await signIn();
    });

    async function revealAndOpenPoster(page: import('@playwright/test').Page) {
      const fate = new FatePage(page);
      await fate.goto();
      await fate.draw(0);
      await expect(page.getByRole('heading', { name: 'A Temperança', level: 2 })).toBeVisible({ timeout: REVEAL_TIMEOUT });
      await fate.continue().click();
      await fate.share().click();
      return fate;
    }

    test('gera o poster nos três formatos com as dimensões certas @smoke', async ({ page }) => {
      const fate = await revealAndOpenPoster(page);
      const preview = fate.posterDialog().getByRole('img', { name: 'Poster de identidade Table Tale: A Temperança, Arcanos' });
      const size = async () => preview.evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight]);

      await expect(preview).toBeVisible({ timeout: 20_000 });
      expect(await size()).toEqual([1080, 1920]);

      await fate.posterDialog().getByRole('button', { name: /Instagram Feed/ }).click();
      await expect(fate.posterDialog().getByRole('button', { name: /Instagram Feed/ })).toHaveAttribute('aria-pressed', 'true');
      await expect.poll(size, { timeout: 20_000 }).toEqual([1080, 1350]);

      await fate.posterDialog().getByRole('button', { name: /WhatsApp/ }).click();
      await expect.poll(size, { timeout: 20_000 }).toEqual([1080, 1440]);
    });

    test('descarrega a imagem com o nome do ficheiro certo', async ({ page }) => {
      const fate = await revealAndOpenPoster(page);
      await expect(fate.posterDialog().getByRole('img')).toBeVisible({ timeout: 20_000 });
      const download = page.waitForEvent('download');
      await fate.posterDialog().getByRole('button', { name: 'Descarregar imagem' }).click();
      expect((await download).suggestedFilename()).toBe('table-tale-temperance-story.jpg');
      await expect(new AppShell(page).toast('Imagem descarregada.')).toBeVisible();
    });

    test('explica que a partilha direta não está disponível quando o navegador não a suporta', async ({ page }) => {
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
      });
      const fate = await revealAndOpenPoster(page);
      await expect(fate.posterDialog().getByRole('img')).toBeVisible({ timeout: 20_000 });
      await expect(fate.posterDialog().getByRole('button', { name: 'Partilhar', exact: true })).toHaveCount(0);
      await expect(fate.posterDialog().getByText('A partilha direta não está disponível neste dispositivo.')).toBeVisible();
    });

    test('a partilha nativa envia um ficheiro de imagem com o texto do destino', async ({ page }) => {
      await page.addInitScript(() => {
        const calls: { files: number; type: string; text: string }[] = [];
        (window as unknown as { __shared: typeof calls }).__shared = calls;
        Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
        Object.defineProperty(navigator, 'share', {
          configurable: true,
          value: async (data: ShareData) => {
            calls.push({ files: data.files?.length ?? 0, type: data.files?.[0]?.type ?? '', text: data.text ?? '' });
          },
        });
      });
      const fate = await revealAndOpenPoster(page);
      await expect(fate.posterDialog().getByRole('img')).toBeVisible({ timeout: 20_000 });
      await fate.posterDialog().getByRole('button', { name: 'Partilhar', exact: true }).click();
      await expect(new AppShell(page).toast('Partilhado.')).toBeVisible();
      const shared = await page.evaluate(() => (window as unknown as { __shared: { files: number; type: string; text: string }[] }).__shared);
      expect(shared).toEqual([{ files: 1, type: 'image/jpeg', text: expect.stringContaining('Pertenço aos Arcanos — A Temperança') }]);
    });

    test('só avisa sobre a foto quando há foto mas não pode ser incluída; sem foto ou com foto válida não avisa', async ({ page, backend }) => {
      test.setTimeout(90_000); // três revelações e três posters no mesmo teste
      const fate = await revealAndOpenPoster(page);
      await expect(fate.posterDialog().getByRole('img')).toBeVisible({ timeout: 20_000 });
      await expect(fate.posterDialog().getByRole('note')).toHaveCount(0);
      await page.keyboard.press('Escape');
      await expect(fate.posterDialog()).toBeHidden();

      backend.db.identities = [];
      await page.route('https://avatars.e2e.test/bloqueado.png', (route) => route.abort());
      backend.profile().avatar_url = 'https://avatars.e2e.test/bloqueado.png';
      await page.goto('fate');
      await fate.draw(0);
      await expect(page.getByRole('heading', { name: 'A Temperança', level: 2 })).toBeVisible({ timeout: REVEAL_TIMEOUT });
      await fate.continue().click();
      await fate.share().click();
      await expect(fate.posterDialog().getByRole('img')).toBeVisible({ timeout: 20_000 });
      await expect(fate.posterDialog().getByRole('note')).toContainText('Não foi possível incluir a tua foto de perfil');
      await page.keyboard.press('Escape');

      backend.db.identities = [];
      backend.profile().avatar_url = AVATAR_URL;
      await page.goto('fate');
      await fate.draw(0);
      await expect(page.getByRole('heading', { name: 'A Temperança', level: 2 })).toBeVisible({ timeout: REVEAL_TIMEOUT });
      await fate.continue().click();
      await fate.share().click();
      await expect(fate.posterDialog().getByRole('img')).toBeVisible({ timeout: 20_000 });
      await expect(fate.posterDialog().getByRole('note')).toHaveCount(0);
      expect(PLAYER.displayName).toBe('Ana Teste');
    });
  });
});
