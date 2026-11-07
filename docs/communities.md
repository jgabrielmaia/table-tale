# Comunidades

Utilizadores, comunidades, ligações (memberships) e bibliotecas de jogos são conceitos independentes.

```
auth.users 1─1 profiles
profiles 1─N communities                (created_by)
profiles N─N communities via community_memberships   unique (user_id, community_id)
communities N─N games via community_games            unique (community_id, game_id)
profiles N─N games via user_games                    (coleção pessoal, ex-game_ownerships)
games                                   (catálogo global, independente)
```

- **communities**: localização obrigatória (`city`, `district`, `country`), `latitude`/`longitude` opcionais (os dois ou nenhum), `visibility` `public|private`.
- **community_memberships**: `role` `owner|admin|moderator|member`, `status` `pending|active|suspended`.
- **community_games**: biblioteca da comunidade (exemplares e estado).
- **user_games**: coleção pessoal. `user_game_status` (estado e favoritos) não mudou, por isso o progresso/XP não é afetado.

## Regras (aplicadas na base de dados, RLS + triggers)

| Ação | Quem |
| --- | --- |
| Ver comunidade pública | qualquer pessoa; privada só quem tem ligação (inclui pendentes) |
| Ver membros e biblioteca | públicas: todos; privadas: membros ativos |
| Criar comunidade | qualquer utilizador autenticado (torna-se dono, via trigger) |
| Entrar | pública: ativo de imediato; privada: `pending` |
| Aprovar, suspender, remover | owner, admin e moderator, só sobre quem tem papel inferior |
| Mudar papéis | owner e admin, nunca para um papel igual ou superior ao seu; `owner` só por transferência |
| Editar comunidade | owner e admin |
| Apagar comunidade | owner |
| Gerir biblioteca da comunidade | owner, admin e moderator |
| Sair | qualquer um, exceto suspensos; o **último dono ativo não pode sair** (erro `last_owner`) |
| Transferir propriedade | RPC `transfer_community_ownership` (dono atual -> membro ativo; o dono passa a admin) |

`src/features/communities/permissions.ts` espelha estas regras para a interface; a base de dados é a fonte de verdade.

## Migrações (aditivas; nada é apagado)

1. `20261106000001_communities.sql`: tipos, tabelas, RLS, triggers, RPC; renomeia `game_ownerships` para `user_games` (dados, índices e políticas preservados); atualiza `claim_owner`; novos perfis entram na comunidade `table-tale`.
2. `20261106000002_communities_backfill.sql`: cria a comunidade por omissão, inscreve todos os perfis (o dono de `owner_email` como `owner`; sem correspondência, o perfil mais antigo), copia a coleção do dono para `community_games`. Faz `RAISE EXCEPTION` (rollback) se as contagens não baterem.

Não existiam ligações utilizador-comunidade antes, por isso não há nada a converter além disto.

**Compatibilidade de deploy**: a migração 1 cria a vista só de leitura `game_ownerships` (sobre `user_games`, com `security_invoker`), porque a app em produção antes desta alteração ainda lê esse nome. Aplique a migração e depois publique a nova app; a vista pode ser removida numa migração futura.

**Localização provisória**: a comunidade por omissão fica com `city`, `district` e `country` = `Por definir`. O dono deve editá-la em *Gestão*.

Antes de aplicar a um projeto Supabase partilhado ou de produção, correr primeiro num projeto de teste (`supabase db reset` local) e validar. Só depois, e só com aprovação, apagar o que ficou obsoleto (nada nesta entrega).

## Rollback e CI

- **Rollback**: `supabase/rollbacks/*.down.sql` desfaz cada migração (fora de `supabase/migrations`, para o CLI não as tratar como migrações). Aplique por ordem inversa, cada uma numa transação: primeiro `20261106000002_communities_backfill.down.sql`, depois `20261106000001_communities.down.sql`. Atenção: apaga todos os dados de comunidades; a coleção pessoal (`user_games`) volta a `game_ownerships` sem perdas. Em produção:

  ```bash
  npx supabase db query --remote -f supabase/rollbacks/20261106000002_communities_backfill.down.sql
  npx supabase db query --remote -f supabase/rollbacks/20261106000001_communities.down.sql
  ```

  Depois, marque as versões como revertidas: `npx supabase migration repair --status reverted 20261106000001 20261106000002 --linked`.
- **CI**: o job `migrations` (`scripts/db-check.sh`) aplica todas as migrações a um Postgres descartável com dados de teste, valida, executa o rollback, valida o estado anterior e volta a migrar. O script apaga os schemas `public`, `auth` e `storage` do alvo: nunca o aponte a uma base real.
