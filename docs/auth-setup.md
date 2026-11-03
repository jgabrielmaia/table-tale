# Configuração de autenticação

A autenticação usa Supabase Auth. A aplicação não guarda passwords nem segredos OAuth: o frontend só conhece o URL e a chave **anon** (pública) do Supabase e delega Google e GitHub ao Supabase, ou envia um magic link por e-mail.

## Porque aparecia «Unsupported provider: provider is not enabled»

O erro vem do Supabase, não do código: o fornecedor pedido estava **desativado** no projeto. Os identificadores do frontend (`google`, `github`) coincidem com os do Supabase. Para o confirmar a qualquer momento, o endpoint público de definições lista o que está ativo:

```
GET https://<project-ref>.supabase.co/auth/v1/settings   (cabeçalho apikey: <anon key>)
→ "external": { "google": false, "github": false, "email": true, ... }
```

A aplicação lê este endpoint: um fornecedor desativado aparece como «indisponível de momento» e **nunca** envia o utilizador para o fornecedor. Se o endpoint não puder ser lido, o botão fica ativo e um erro «provider is not enabled» é traduzido para uma mensagem localizada.

## Passos manuais (exigem credenciais e painéis de terceiros)

Estes passos não podem ser feitos por código nem por scripts: precisam das tuas contas e de segredos que nunca devem entrar no repositório. Em todos, o **callback** a registar no fornecedor é o do Supabase:

`https://<project-ref>.supabase.co/auth/v1/callback`

1. **Google** — Google Cloud Console → *APIs & Services* → *Credentials* → *Create credentials* → *OAuth client ID* (tipo *Web application*). Em *Authorized redirect URIs* acrescenta o callback acima. Configura o *OAuth consent screen* (âmbitos `openid`, `email`, `profile`). Contas Gmail funcionam sem configuração extra.
2. **GitHub** — GitHub → *Settings* → *Developer settings* → *OAuth Apps* → *New OAuth App*. *Authorization callback URL* = o callback acima. Gera um *Client secret*.
4. **Supabase Dashboard** → *Authentication* → *Providers*: ativa **Google** e **GitHub** e cola o *Client ID* e o *Client Secret* de cada um. Os segredos ficam apenas aqui.
5. **Supabase Dashboard** → *Authentication* → *URL Configuration*:
   - *Site URL* (desenvolvimento): `http://localhost:5173/table-tale`
   - *Redirect URLs*: `http://localhost:5173/table-tale/auth/callback` e `https://jgabrielmaia.com/table-tale/auth/callback`
6. **Supabase Dashboard** → *Authentication* → *Sign In / Providers*: mantém *Allow new users to sign up* e *Manual linking* ativos.

Produção: Site URL `https://jgabrielmaia.com/table-tale` e `VITE_SITE_URL` definido no ambiente de build.

### Supabase CLI (desenvolvimento local)

`supabase/config.toml` lê `GOOGLE_*` e `GITHUB_*` do ambiente (ver `.env.example`). Estas variáveis são só para o CLI local, nunca levam prefixo `VITE_` e nunca vão para o bundle.

## Fluxo OAuth

1. O botão chama `supabase.auth.signInWithOAuth({ provider, redirectTo })` com PKCE. O `redirectTo` é `…/auth/callback?next=<destino>`.
2. O destino original (`from`) é guardado ao abrir `/login` e só é aceite se for um caminho interno (`safeNextPath` rejeita `//`, URLs absolutos e `\`).
3. `/auth/callback` troca o código por sessão e navega para `next`.
4. Erros do fornecedor (`error`, `error_code`, `error_description` na query ou no fragmento) são traduzidos para mensagens localizadas: permissões recusadas ou login cancelado, link expirado, conta já associada, e-mail por verificar, e-mail não partilhado, fornecedor desativado e erro genérico. O texto cru do fornecedor nunca é mostrado.
5. Sessão expirada ou sem resposta em 12 s mostra o erro «link expirado» com um botão para voltar ao login.

## Contas duplicadas e associação de métodos

- O Supabase associa automaticamente identidades **com o mesmo e-mail verificado**: entrar com Google e mais tarde com GitHub (mesmo e-mail verificado) usa a mesma conta, sem duplicados.
- Se o e-mail não vier verificado ou não for partilhado, o Supabase não associa nada automaticamente (evita sequestro de contas). Nesse caso entra com o método original e associa o novo no **Perfil** (botões «Associar Google / GitHub», que usam `linkIdentity` e exigem a sessão atual).
- Se a identidade já pertencer a outro perfil, o callback mostra «esta conta já está associada a outro perfil».

## Perfil e avatar

- No primeiro login o trigger `handle_new_user` cria o perfil com o nome (`full_name`, `name`, `user_name` ou a parte local do e-mail) e a foto do fornecedor (`avatar_url`, `picture` ou `picture.data.url`, só `https`).
- Associar um fornecedor mais tarde preenche a foto só se o perfil **não tiver** avatar (`handle_identity_avatar`). Um avatar personalizado nunca é substituído em logins seguintes.
- Em «Editar perfil» o utilizador pode carregar outra imagem ou voltar a usar a foto da conta; isto não altera a carta nem a identidade sazonal.

## Associação do dono da coleção

O seed guarda `OWNER_EMAIL` na configuração privada; quando o e-mail autenticado coincide, o trigger associa o inventário e a facção inicial ao perfil sem fixar um UUID no código. `SUPABASE_SERVICE_ROLE_KEY` é exclusivamente para scripts de administração/seed e não pode ser publicada.
