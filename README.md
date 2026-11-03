# Table Tale

> Make stories. Play them.

Protótipo de uma biblioteca pessoal e comunidade de jogos de tabuleiro. Permite explorar a coleção, registar sessões de jogo, descobrir o universo das facções **Arcanos & Elementais** e acompanhar a evolução de um perfil de jogador.

## Tecnologias

- HTML5, CSS3 e JavaScript (vanilla, sem dependências nem build)
- Google Fonts (Cinzel, Cinzel Decorative, Cormorant Garamond, Inter)
- `localStorage` para dados simulados

## Executar localmente

Abrir `index.html` diretamente no navegador, ou servir a pasta:

```bash
npx serve .
# ou
python -m http.server 8000
```

## Estado atual

Protótipo navegável com dados simulados (sem backend):

- **Biblioteca** — 9 jogos com pesquisa, filtros e estados vazios/carregamento.
- **Detalhe do jogo** — estado, favoritos, diário de sessões e recomendações.
- **Arcanos & Elementais** — página narrativa alinhada com a fonte de verdade *S1: Elementais vs Arcanos*.
- **Login** — autenticação simulada por e-mail.
- **Perfil** — nível, facção, estatísticas, eventos e conquistas, com edição.

Os dados ficam guardados apenas no navegador; o rodapé tem a opção «Repor dados de demonstração».
