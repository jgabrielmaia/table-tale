# Testes E2E (Playwright)

Suíte ponta a ponta da Table Tale: autenticação, biblioteca, detalhe do jogo e diário, eventos, perfil, Sorteio do Destino com poster, Lore, acessibilidade e responsividade. O que cada ficheiro cobre está em [`FEATURE-MATRIX.md`](./FEATURE-MATRIX.md).

## Pré-requisitos

- Node.js 20+ e dependências instaladas: `npm ci`
- Navegadores do Playwright (uma vez): `npx playwright install chromium firefox webkit`
  - Em Linux/CI: `npx playwright install --with-deps`
- Nenhuma conta, chave ou base de dados é necessária: a suíte **nunca fala com o Supabase real** (ver "Backend simulado").

## Variáveis de ambiente

Todas são opcionais. Não há segredos neste repositório.

| Variável | Predefinição | Para que serve |
|---|---|---|
| `E2E_BASE_URL` | *(vazio)* | Testa uma aplicação já em execução (ex.: `http://localhost:4173/table-tale/`). Com ela, o Playwright **não** arranca servidor. O servidor tem de ter sido construído com `VITE_SUPABASE_URL=https://e2e.supabase.test`, senão os pedidos não são intercetados. |
| `E2E_PORT` | `5183` | Porta do servidor que a suíte arranca. |
| `E2E_DEV` | *(vazio)* | `1` usa o servidor de desenvolvimento (`vite`) em vez da build de produção. Mais rápido ao editar a app, mas mais sensível a recarregamentos do Vite. |
| `E2E_WEBKIT` | `1` fora do Windows, `0` no Windows | WebKit no Windows exige bibliotecas de sistema que muitas máquinas não têm (`libEGL`). `E2E_WEBKIT=1` força-o. |
| `CI` | *(vazio)* | Ativa *retries* (2), `forbidOnly` e 2 *workers*. |

## Como iniciar a aplicação

Não é preciso. `playwright.config.ts` arranca sozinho um servidor próprio na porta 5183 com um Supabase falso:

```text
vite build --outDir dist-e2e/table-tale   # build de produção, isolada de dist/
vite preview --port 5183                  # servida em http://localhost:5183/table-tale/
```

As variáveis `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `VITE_SITE_URL` são injetadas pela configuração e sobrepõem-se ao `.env`. Se a porta já estiver ocupada por um servidor da suíte, é reutilizado (fora de CI).

## Como executar

```powershell
npm run test:e2e              # tudo, em todos os navegadores ativos (headless)
npm run test:e2e:chromium     # só Chromium
npm run test:e2e:firefox      # só Firefox
npm run test:e2e:webkit       # só WebKit (ver E2E_WEBKIT)
npm run test:e2e:mobile       # Pixel 7 (testes marcados @responsive e @smoke)
npm run test:e2e:headed       # com o navegador visível
npm run test:e2e:ui           # modo UI do Playwright
npm run test:e2e:report       # abre o relatório HTML da última execução
npm run typecheck:e2e         # verifica os tipos da suíte
```

Um ficheiro, um teste ou uma etiqueta:

```powershell
npx playwright test tests/e2e/library.spec.ts
npx playwright test tests/e2e/library.spec.ts --project=chromium
npx playwright test -g "link mágico"
npx playwright test --grep @smoke        # fluxos críticos
npx playwright test --grep @a11y         # acessibilidade (axe)
npx playwright test --grep @responsive   # responsividade
```

Etiquetas: `@smoke` (fluxos críticos), `@a11y`, `@responsive`.

## Como visualizar o relatório e depurar uma falha

- Relatório: `npm run test:e2e:report` (HTML em `playwright-report/`).
- Em falha ficam guardados **screenshot**, **vídeo** (`test-results/`) e, na primeira repetição, **trace** (`trace: on-first-retry`). Para forçar o trace numa execução local: `npx playwright test <ficheiro> --trace on`, depois `npx playwright show-trace test-results/<pasta>/trace.zip`.
- Passo a passo com o inspetor: `npx playwright test <ficheiro> --debug`.
- Para ver o que a aplicação pediu ao backend, cada teste tem `backend.requests` / `backend.calls(/regex/)`.
- Erro "port 5183 already in use": termina o processo que a ocupa ou muda `E2E_PORT`.

## Arquitetura

```text
playwright.config.ts        configuração (navegadores, trace/vídeo/screenshot, servidor próprio)
tests/
  e2e/*.spec.ts             testes por funcionalidade (+ FEATURE-MATRIX.md e este README)
  fixtures/index.ts         `test` estendido: `backend` (automático) e `signIn`
  pages/*.ts                Page Objects (locators acessíveis: role, label, texto)
  utils/fakeBackend.ts      Supabase simulado e em memória (Auth, PostgREST, Storage)
  utils/jwt.ts, constants.ts
  data/seed.ts              dados determinísticos (reutiliza o catálogo de scripts/seed-data.ts)
  tsconfig.json
```

Convenções: seletores por `getByRole` / `getByLabel` / `getByText`; sem `waitForTimeout`; *assertions* web-first; cada teste cria o seu próprio estado.

## Backend simulado (estratégia de dados)

O projeto não tem base de dados de teste nem mecanismo de *seed* seguro, e o Supabase real é de produção. Por isso:

- `tests/utils/fakeBackend.ts` responde, dentro de cada teste, aos pedidos para `https://e2e.supabase.test` (Auth, REST e Storage). É **por teste**: não há estado partilhado, nem ordem de execução.
- Os dados partem de `tests/data/seed.ts`: o catálogo vem de `scripts/seed-data.ts` (jogos, facções, conquistas) e o resto é fixo (jogadora "Ana Teste", dono da estante, três eventos com datas em 2020 e 2099, época "Season 1").
- O simulador reproduz as regras de servidor de que a interface depende: XP e nível, desbloqueio de conquistas, facção a partir da carta sorteada, "já sorteado", "sem temporada".
- A sessão de um jogador é semeada no `localStorage` (`signIn()`); o fluxo OAuth e o do link mágico são simulados de ponta a ponta (autorizar → redirecionar com código → troca PKCE).
- Para estados difíceis de reproduzir usam-se `backend.fail(regex, resposta | 'network', vezes)` (erro 4xx/5xx ou falha de rede) e `backend.hold(regex)` (segura o pedido para observar estados de carregamento e duplo envio).
- Fontes do Google e imagens externas são bloqueadas/simuladas para a suíte não depender da rede.

### Mocks e porquê

| Mock | Motivo |
|---|---|
| Supabase Auth, REST e Storage em memória | Sem ambiente de teste; evita escrever em produção; torna os dados determinísticos |
| Fornecedor OAuth (`/auth/v1/authorize` → código) | Google/GitHub não podem ser automatizados de forma estável |
| Entrega de e-mail (`/auth/v1/otp`) | Substituída pela abertura do link de retorno com o código PKCE |
| Respostas 4xx/5xx e falhas de rede injetadas | Estados que não se reproduzem de forma fiável num backend real |
| `navigator.share` / `navigator.canShare` (2 testes do poster) | Partilha nativa depende do SO; testamos o que a app envia e o fallback |
| Google Fonts bloqueado | Serviço externo; a app usa as fontes de reserva |

## Limitações conhecidas

- **WebKit no Windows**: não corre nesta máquina de desenvolvimento (falta `libEGL`). Está configurado e ativo em Linux/macOS e com `E2E_WEBKIT=1`. Em CI use Linux.
- **O simulador não é o Supabase**: não valida RLS, triggers nem SQL. Uma regressão só de base de dados não é apanhada aqui (ver `supabase/migrations`).
- **Acessibilidade**: usa-se o axe com regras estruturais; `color-contrast` está desligado de propósito (gradientes e transparências geram falsos positivos). Contraste deve ser revisto manualmente.
- **Cópia do poster para a área de transferência** (`ClipboardItem`) não é verificada.
- **Snapshots visuais**: o projeto não tinha infraestrutura visual, por isso não foram introduzidos.
- Os pedidos GET falhados são repetidos pelo cliente (postgrest + react-query), por isso o teste de falha de rede demora cerca de 30 s a mostrar o erro.
