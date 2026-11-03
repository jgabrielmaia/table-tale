# Configuração de autenticação

A autenticação usa Supabase Auth. A aplicação não guarda passwords: o frontend pede magic links ou delega o início de sessão Google ao Supabase.

## Desenvolvimento

1. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores do projeto Supabase. A chave anon é pública e as tabelas estão protegidas por RLS.
2. No Supabase, em **Authentication → Providers**, ative Google e Email. Para Google, registe o callback OAuth apresentado pelo painel Supabase (`https://<project-ref>.supabase.co/auth/v1/callback`) na Google Cloud Console.
3. Defina `http://localhost:5173/table-tale` como Site URL e permita `http://localhost:5173/table-tale/auth/callback`.
4. Execute `npm run dev`. Para aplicar migrations e seed local, use a Supabase CLI e as variáveis de servidor do `.env.example`.

## Produção

- Site URL: `https://jgabrielmaia.com/table-tale`
- Redirect URL: `https://jgabrielmaia.com/table-tale/auth/callback`
- Build: definir `VITE_SITE_URL` e as duas variáveis públicas Supabase no ambiente de build, executar `npm run build` e publicar `dist/table-tale/`.
- O Google Client Secret deve ser guardado apenas no Supabase Dashboard. `SUPABASE_SERVICE_ROLE_KEY` é exclusivamente para scripts de administração/seed e não pode ser publicada.

## Associação de métodos

A opção de linking manual do Supabase Auth fica ativa. Um utilizador autenticado pode associar Google ao perfil existente através do botão «Associar Google» no perfil; a operação exige a sessão atual e confirmação no Google. Magic link é o método de entrada por e-mail. A associação ou alteração de um endereço de e-mail adicional não tem fluxo de gestão próprio nesta versão.

No primeiro login, o trigger da migration cria o perfil. O seed guarda `OWNER_EMAIL` na configuração privada; quando o e-mail autenticado coincide, o trigger associa o inventário e a facção inicial ao perfil sem fixar um UUID no código.
