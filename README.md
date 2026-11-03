# Table Tale

> Make stories. Play them.

Aplicação de biblioteca pessoal e comunidade de jogos de tabuleiro. Explora jogos, regista sessões, descobre as filosofias das facções **Arcanos & Elementais** e acompanha perfil, eventos e conquistas.

## Stack

- React 19, TypeScript e Vite
- Tailwind CSS 4 e CSS da identidade Table Tale
- React Router, TanStack Query, React Hook Form e Zod
- Supabase PostgreSQL, Auth, Storage e RLS
- Vitest, Testing Library

## Desenvolvimento local

Requer Node.js 22 ou superior. Instala dependências e configura as variáveis públicas Supabase:

```bash
npm ci
Copy-Item .env.example .env
npm run dev
```

Sem Supabase configurado, as páginas apresentam estados de configuração/erro; para dados reais, aplica as migrations e executa o seed conforme [docs/auth-setup.md](docs/auth-setup.md).

Comandos úteis: `npm run typecheck`, `npm test`, `npm run build` e `npm run seed`.

## Publicação

O build estático é gerado em `dist/table-tale/`, com assets e router prefixados para `/table-tale`. Para Namecheap/cPanel, publica apenas o conteúdo dessa pasta em `public_html/table-tale/`. O `.htaccess` dá fallback às rotas sem alterar a raiz do domínio. Vê [docs/deployment-namecheap.md](docs/deployment-namecheap.md) e [docs/auth-setup.md](docs/auth-setup.md).

## Estado atual

MVP funcional preparado para Supabase: biblioteca com filtros, detalhes e sessões; login Google, GitHub e magic link; perfil protegido com estatísticas e edição; eventos, conquistas e lore. Inclui migrations, RLS, seed idempotente e documentação de configuração.

A publicação e o login OAuth em produção dependem de credenciais/configuração do projeto Supabase e acesso ao cPanel/Namecheap; nenhum segredo está incluído no repositório.
