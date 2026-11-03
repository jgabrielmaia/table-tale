# Publicação no Namecheap

## Perfil de alojamento

O projeto gera um build estático em `dist/table-tale/` e não requer Node.js em produção. É compatível com alojamento compartilhado/cPanel que disponibilize Apache com `mod_rewrite`. A configuração disponível na conta Namecheap e o DNS do domínio precisam de ser confirmados no painel; não há credenciais de alojamento neste repositório.

## Build e upload

1. Configure `.env.production` localmente com as variáveis públicas Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) e `VITE_SITE_URL=https://jgabrielmaia.com/table-tale`. Não faça commit desse ficheiro.
2. Execute `npm ci` e `npm run build`.
3. Carregue **o conteúdo** de `dist/table-tale/` para `public_html/table-tale/` no cPanel. O `.htaccess` incluído no build dá fallback de rotas para o `index.html`; confirma que a opção de mostrar ficheiros ocultos está ativa no cliente de upload.
4. Não carregue nada para `public_html/` fora de `public_html/table-tale/`. O build deste projeto não escreve nem substitui ficheiros da raiz do domínio.
5. Ative/verifique HTTPS para `jgabrielmaia.com` no cPanel/Namecheap.

O router e os assets usam o prefixo `/table-tale/`. As rotas suportadas são `/table-tale/login`, `/table-tale/library`, `/table-tale/games/:slug`, `/table-tale/lore`, `/table-tale/profile` e `/table-tale/events`.

## Supabase

1. Crie um projeto Supabase e execute `supabase db push` (ou aplique por ordem os ficheiros em `supabase/migrations/`).
2. Configure Google em **Authentication → Providers → Google**. O secret fica apenas no Supabase, nunca no Vite nem no repositório.
3. Em **Authentication → URL Configuration**, defina `https://jgabrielmaia.com/table-tale` como Site URL e permita `https://jgabrielmaia.com/table-tale/auth/callback`. Para desenvolvimento, permita também `http://localhost:5173/table-tale/auth/callback`.
4. Configure `.env` local com `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `OWNER_EMAIL` e execute `npm run seed` uma vez. `OWNER_EMAIL` deve ser o e-mail que o Gabriel usará para entrar.
5. O `service_role` só é usado pelo seed local e nunca deve ser definido com prefixo `VITE_` ou enviado ao alojamento.

## Validação depois do upload

- Abrir `/table-tale` e atualizar diretamente cada rota.
- Confirmar carregamento de capas, leitura pública do catálogo e login Google/magic link.
- Confirmar inserção de sessão, atualização de estado/favorito e participação num evento com sessão autenticada.
- Testar em desktop e telemóvel.
- Confirmar que `https://jgabrielmaia.com/` continua a servir o site existente.

A publicação real requer acesso ao cPanel/FTP e configuração do projeto Supabase; estes acessos não estão no workspace.
