# Integração com o BoardGameGeek (BGG)

A Table Tale usa os dados do BoardGameGeek em vez de métricas próprias (género e complexidade): categorias, mecânicas,
peso, nota, ranking, ano, idade mínima, autores, ilustradores, editoras, famílias, descrição, imagens, jogadores e duração.

Primeira fase: **pesquisar no BGG, ver todos os dados e importar** o jogo para o catálogo, adicionando-o à coleção pessoal
(`user_games`) ou à biblioteca de uma comunidade que o utilizador gere (`community_games`). Fora desta fase: importar a
coleção de um utilizador BGG e importação em massa.

## Como funciona

```
Browser ── supabase.functions.invoke('bgg') ──▶ Edge Function `bgg` ──(Bearer BGG_API_TOKEN)──▶ boardgamegeek.com/xmlapi2
   │                                               │ verifica o JWT do utilizador
   │                                               │ respeita o ritmo do BGG, faz cache e tenta de novo com espera
   │◀── { results | thing | game } ───────────────┘ grava em `games` com a service role (upsert por bgg_id)
   └─ adiciona o jogo à coleção ou à comunidade com a sessão do utilizador (RLS decide se pode)
```

- O token **nunca** vai para o browser nem para o repositório: vive só como segredo da função (`BGG_API_TOKEN`).
- Ações da função (POST, JSON): `search` (`query`), `preview` (`id`, não grava nada) e `import` (`id`).
- Só utilizadores com sessão iniciada usam a função (a chave anónima é rejeitada). O catálogo `games` continua só de
  leitura para os clientes; apenas a função (service role) escreve.
- Código: `supabase/functions/bgg/index.ts` (arranque e acesso à BD), `_shared/bggHandler.ts` (pedidos), `_shared/bggClient.ts`
  (cliente do BGG: `Authorization: Bearer`, `https://boardgamegeek.com` sem `www`, ~5 s entre pedidos, lotes de 20 ids,
  novas tentativas em 429/5xx, cache em memória) e `_shared/bggParse.ts` (XML → dados, sem dependências).
- Interface: `/library/import` (também a partir da Biblioteca e da biblioteca de cada comunidade).

### Dados

`games` ganhou: `bgg_id` (único), `bgg_data` (o item completo do BGG, **tal como devolvido**), `bgg_synced_at`,
`categories` e `mechanics` (cópias para filtrar, índices GIN) e colunas tipadas para filtrar/ordenar:
`year_published`, `min_age`, `bgg_rating`, `bgg_rating_count`, `bgg_rank`, `bgg_weight`.
Jogadores e duração passam a poder ser nulos: o BGG envia `0` quando não sabe e a app mostra «—» em vez de inventar um valor
(o `0` original fica em `bgg_data`). Os jogos que já existiam ficam sem categorias até serem importados do BGG.

### Termos de utilização do BGG (versão 2025-07-02)

- Licença **não comercial**: sem anúncios nem pagamentos na app.
- **Não alterar os dados**: guardam-se e mostram-se como o BGG os devolve (categorias e mecânicas em inglês, sem tradução).
- **Dar crédito**: «Powered by BGG» com ligação ao BoardGameGeek, visível onde há dados do BGG (biblioteca, ficha do jogo e
  página de importação). Por agora é um selo de texto acessível; falta o **logótipo oficial**, que deve ser fornecido por quem
  gere o projeto (substituir o texto em `src/components/bgg/BggCredit.tsx`, mantendo a ligação).
- Não usar os dados para treinar IA. Os pedidos são só do servidor e com cache.
- **Imagens**: a capa do BGG é guardada em `cover_url`, mas o CSP (`vercel.json`) **não** autoriza o domínio das imagens do
  BGG, porque não foi confirmado que os termos permitem mostrá-las. Sem autorização, o browser bloqueia a imagem e a app mostra
  a capa ilustrada da marca. Depois de confirmar, acrescentar o domínio (hoje `cf.geekdo-images.com`) a `img-src`.

## Pôr em produção

### 1. Registar a aplicação e obter o token

1. Em <https://boardgamegeek.com/applications> registar a app (licença não comercial, gratuita) e esperar pela aprovação
   (pode demorar uma semana ou mais).
2. Guardar o token (chave de aplicação) num gestor de segredos. Não o colocar em ficheiros do repositório, em `VITE_*` nem
   em ficheiros `.env` versionados.

### 2. Segredo e função

O deploy da função e das migrações é automático (ver «Automação» abaixo). O segredo do BGG é o único passo manual, uma só vez:

```bash
npx supabase secrets set BGG_API_TOKEN=<token> --project-ref afrwnvusaxpflbezepik
npx supabase functions deploy bgg --project-ref afrwnvusaxpflbezepik
```

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são injetados pelo Supabase. Sem o token a função responde 503
(«ligação não configurada») e o resto da app funciona. Em desenvolvimento local: `supabase functions serve bgg --env-file <ficheiro fora do git>`.

### 3. Ordem de lançamento (expand / contract)

A app em produção ainda lê `genre` e `complexity`; por isso a remoção é feita em duas fases.

1. **Expand**: aplicar `supabase/migrations/20261107000001_bgg_games.sql` (aditiva: novas colunas, `genre`/`complexity`/jogadores/duração
   passam a nulos). A app antiga continua a funcionar. Reversão: `supabase/rollbacks/20261107000001_bgg_games.down.sql`
   (perde os dados do BGG; mantém os jogos importados com valores provisórios).
2. **Publicar a nova app** (merge do PR em `main` → deploy da Vercel) e **fazer o deploy da função** `bgg` (passo 2 acima).
   A nova app já não usa `genre` nem `complexity`.
3. **Contract**: só depois de confirmar que a nova app está em produção, aplicar
   `supabase/contract/20261107000002_drop_genre_complexity.sql` (automático: ver «Automação»). Remove as duas colunas e o índice `games_genre_idx` e atualiza a
   função das conquistas para contar só categorias BGG. Reversão: `…drop_genre_complexity.down.sql` (os valores antigos perdem-se).
   O ficheiro está fora de `supabase/migrations/` de propósito, para um `supabase db push` não o aplicar antes do tempo; num PR
   seguinte, mover-o (`git mv`) para `supabase/migrations/` com o mesmo nome.

A CI (`scripts/db-check.sh`) migra, reverte e volta a migrar, e ainda aplica e reverte a fase contract.

### 4. Verificar

- Entrar na app, abrir `/library/import`, pesquisar um jogo e importá-lo; deve aparecer na biblioteca com categorias e na
  coleção (ou na comunidade) escolhida.
- Os erros mostrados ao utilizador: 429 («a limitar pedidos»), 502 («ligação não autorizada» se o token for inválido),
  503 (BGG indisponível ou token em falta).

## Automação (migrações e função)

O workflow `production-deploy.yml` (só corre depois de um merge em `main` com a CI verde) faz, por esta ordem:
`supabase db push` (migrações pendentes de `supabase/migrations/`) → deploy da app na Vercel → deploy das Edge Functions.
Se a migração falhar, o deploy pára antes de chegar aos utilizadores. Por isso toda a migração tem de ser compatível com a app que ainda está em produção (expand/contract).

**Pré-requisitos, uma só vez** (antes do primeiro merge com este workflow):

1. Segredos do ambiente `production` no GitHub: `SUPABASE_ACCESS_TOKEN` (token de conta Supabase) e `SUPABASE_DB_PASSWORD`; variável `SUPABASE_PROJECT_REF` = `afrwnvusaxpflbezepik`.
2. **Reparar o histórico de migrações de produção.** Hoje `db push --remote --dry-run` falha com `DbPushMissingLocalError`: a produção regista quatro versões que não existem no repositório (`20261103174609`, `20261103193453`, `20261103193500`, `20261103212707`) e não regista `20261103000009` a `…012`, que foram aplicadas por outro caminho. Depois de confirmar que o esquema de produção já inclui o que essas migrações fazem, corrigir o histórico com `supabase migration repair` (`--status reverted` para as quatro versões remotas; `--status applied` para `20261103000009`–`012`) e voltar a correr `supabase db push --remote --dry-run` até listar apenas as migrações novas.
3. Segredo `BGG_API_TOKEN` na função (passo 2).

A fase contract passa a ser um PR seguinte que move o ficheiro de `supabase/contract/` para `supabase/migrations/`: o merge aplica-a sozinho, já com a nova app em produção.

## O que não foi verificado

Nada foi testado contra a API real do BGG (o token ainda não existia). O analisador de XML e o cliente (ritmo, lotes,
novas tentativas, cache) têm testes unitários com ficheiros de exemplo em `supabase/functions/_shared/fixtures/`, escritos com a
estrutura documentada da XML API2, e os testes e2e usam uma função falsa. Ao receber o token, confirmar com uma pesquisa e uma
importação reais, em especial: campos do `thing` (ranking, peso), os limites de ritmo e se as imagens podem ser mostradas.
