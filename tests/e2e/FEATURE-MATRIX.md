# Matriz de funcionalidades × testes E2E

Inventário feito a partir das rotas em `src/App.tsx`, das páginas em `src/features/*`, dos componentes em `src/components/*`, das migrações em `supabase/migrations/*` e da documentação (`README.md`, `docs/`). Só entra aqui o que existe no código.

## Perfis de utilizador

| Perfil | Como se identifica | O que pode fazer |
|---|---|---|
| **Visitante** | Sem sessão | Ver início, biblioteca (pesquisa e filtros), detalhe de jogo, Lore, eventos e páginas de entrada/registo. Não pode registar nada. |
| **Jogador** | Sessão Supabase (Google, GitHub ou link mágico) | Tudo o anterior, mais: favoritos e estados dos jogos, diário de sessões, inscrição em eventos, perfil, Sorteio do Destino, poster, coleção de cartas do Lore, conquistas. |

Não existe perfil de administrador na interface. A função `dev_reset_my_card` (apenas dono, apenas em *dev builds*) e o botão correspondente não existem na build de produção, por isso não são testados (ver "Fora de âmbito").

## Matriz

Estado: **Coberto** = fluxo principal + validações/erros relevantes; **Parcial** = ver nota; **N/A** = a aplicação não tem esta funcionalidade.

| Funcionalidade | Rota / ponto de entrada | Perfil | Cenários cobertos | Ficheiro | Estado |
|---|---|---|---|---|---|
| Página inicial | `/` | Visitante, Jogador | Título, atalhos, estatísticas, destaques, botão Entrar conforme sessão, contador de favoritos, erro de carregamento | `home.spec.ts`, `navigation.spec.ts` | Coberto |
| Menu e navegação | Cabeçalho, barra inferior, rodapé | Todos | Ordem Perfil › Biblioteca › Arcanos › Eventos, item atual, hambúrguer (abrir/fechar/Esc), barra inferior, saltar para o conteúdo, 404, redirecionamento `/biblioteca` | `navigation.spec.ts`, `responsive.spec.ts` | Coberto |
| Idioma PT/EN | Seletor no cabeçalho | Todos | Alternar, persistir ao recarregar, `lang` do documento, textos de Lore e Sorteio em inglês | `navigation.spec.ts`, `lore.spec.ts`, `fate.spec.ts` | Coberto |
| Metadados de SEO em runtime | Todas as rotas | Todos | Título, canonical e robots mudam sem recarregar; páginas privadas e 404 em `noindex` | `navigation.spec.ts` | Coberto |
| Entrar com e-mail (link mágico) | `/login`, `/register` | Visitante | E-mail vazio e inválido, envio, confirmação, "usar outro e-mail", limite de pedidos, erro 500, falha de rede, botão desativado e sem duplo envio, conclusão pelo link de retorno | `auth.spec.ts` | Coberto |
| Entrar com Google / GitHub | `/login`, `/register` | Visitante | Fluxo completo (autorizar → callback → sessão), estado "a redirecionar", método desativado no projeto, cancelamento no fornecedor, link expirado, código de outro dispositivo, regresso ao destino pedido | `auth.spec.ts` | Coberto |
| Callback de autenticação | `/auth/callback` | Visitante | Erros do fornecedor traduzidos, `next` externo ignorado (redirecionamento aberto) | `auth.spec.ts` | Coberto |
| Sessão e proteção de rotas | `/profile`, `/fate` | Todos | Terminar sessão, persistência ao recarregar e numa sessão nova, sessão expirada renovável e não renovável, acesso anónimo redireciona e guarda o destino | `auth.spec.ts` | Coberto |
| Recuperação / alteração de palavra-passe | — | — | — | — | N/A (login sem palavra-passe) |
| Biblioteca: listagem | `/library` | Visitante, Jogador | Contagem, exemplares, proprietário, estados de carregamento, vazio e erro com "Tentar novamente", falha de rede | `library.spec.ts` | Coberto |
| Biblioteca: pesquisa e filtros | `/library?q=` | Visitante, Jogador | Pesquisa sem acentos/maiúsculas, género, jogadores, duração, estado, só favoritos, combinação, limpar, pesquisa no URL, texto muito longo | `library.spec.ts` | Coberto |
| Biblioteca: ordenar / paginar | — | — | — | — | N/A (lista única sem paginação nem ordenação) |
| Favoritos e estado do jogo | Cartões da biblioteca, detalhe | Jogador | Marcar/desmarcar, estado, persistência, desfazer em erro, 403, token expirado, sem duplo clique | `library.spec.ts`, `game-detail.spec.ts` | Coberto |
| Detalhe do jogo | `/games/:slug` | Visitante, Jogador | Ficha, proprietário, relacionados, jogo inexistente, erro de carregamento, convite a entrar | `game-detail.spec.ts` | Coberto |
| Diário de sessões (criar / listar / apagar) | `/games/:slug` | Jogador | Sessão completa, "jogado hoje", validações (data, jogadores, duração, notas), avaliação, apagar, erro 500, duplicado (23505), permissão (42501), sem duplo envio, HTML nas notas, notas longas, teclado | `game-detail.spec.ts` | Coberto |
| Diário de sessões: editar / confirmar exclusão | — | — | — | — | N/A (não há edição nem confirmação; o apagar é imediato) |
| Eventos | `/events` | Visitante, Jogador | Lista, inscrição e cancelamento, evento passado, persistência, erro, sem duplo clique, carregamento, vazio, texto longo, reflexo na experiência do perfil | `events.spec.ts` | Coberto |
| Perfil: visualização | `/profile` | Jogador | Nível, XP, estatísticas, facção vinda da carta, erro e "perfil a ser criado", foto do fornecedor | `profile.spec.ts` | Coberto |
| Perfil: edição | Diálogo "Editar perfil" | Jogador | Abrir/fechar/Esc/foco, sem campo de facção, nome e bio (limites e vazio), guardar e persistir, nunca enviar `faction_id`, erro, "A guardar…" sem duplo envio, avatar válido, tipo e tamanho inválidos, falha de upload | `profile.spec.ts` | Coberto |
| Conquistas | `/profile` | Jogador | Grupos "Descobertas" / "Por descobrir", progresso, "Destino Revelado" | `profile.spec.ts`, `fate.spec.ts` | Coberto |
| Métodos de login associados | `/profile` | Jogador | Lista e "Associar Google" (fluxo de ligação); não há "Associar GitHub" | `profile.spec.ts` | Coberto |
| Sorteio do Destino | `/fate` | Jogador | Convite, nove cartas, revelação com carta/facção/mensagem, "Entrar na mesa", servidor decide a carta, bloqueio após o toque, erro e nova tentativa, sem temporada, temporada fechada a meio, já sorteado (antes e durante), teclado, inglês | `fate.spec.ts` | Coberto |
| Poster de partilha | Diálogo em `/fate` | Jogador | Três formatos e dimensões, descarga e nome do ficheiro, partilha nativa (com e sem suporte), aviso de foto | `fate.spec.ts` | Parcial: a cópia para a área de transferência (`ClipboardItem`) não é verificada |
| Lore | `/lore` | Visitante, Jogador | Princípio central, facções, tensão, coleção bloqueada → desbloqueada, carta em destaque, histórico, capítulos, erro com recuperação, inglês | `lore.spec.ts` | Coberto |
| Acessibilidade | Todas as páginas | Todos | axe (regras estruturais) em 8 páginas públicas + perfil/diálogo/jogo com sessão, um `h1`, foco visível, foco preso no diálogo, erros ligados ao campo, nomes acessíveis, marcos | `a11y.spec.ts` | Coberto (contraste fora de âmbito) |
| Responsividade | Todas as páginas | Todos | Sem scroll horizontal de 320 a 1920 px, barra inferior só em ecrãs pequenos, filtros, diálogo e formulário em 360 px | `responsive.spec.ts`, `navigation.spec.ts` | Coberto |
| Downloads e links externos | — | — | Só existe a descarga do poster (acima) | `fate.spec.ts` | Coberto |

## Fora de âmbito (e porquê)

- **Entrega real de e-mail e consentimento no Google/GitHub**: dependem de serviços externos. Substituímos o fornecedor pelo seu efeito observável (ver `README.md`, secção "Backend simulado").
- **Políticas RLS, funções SQL e triggers do Supabase**: não são interface. Estão mapeados nas migrações; o simulador reproduz as regras de que a aplicação depende (XP, conquistas, facção a partir da carta) apenas para tornar os fluxos realistas.
- **Botão "Repetir o sorteio" (temporário, só dev)** e rota `/ui`: não existem na build de produção.
- **Contraste de cores**: o tema usa gradientes e transparências; o axe não os avalia de forma fiável.
- **Cópia do poster para a área de transferência** e **partilha nativa em dispositivos reais**: dependem de permissões do navegador/SO.
