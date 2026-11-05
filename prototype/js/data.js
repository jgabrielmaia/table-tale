/* Dados simulados do universo Table Tale.
   Facções conforme a fonte de verdade "S1: Elementais vs Arcanos". */
window.TT_DATA = (function () {
  'use strict';

  // Símbolos desenhados numa grelha 48x48 (apenas traço, sem preenchimento)
  const symbols = {
    compass: '<circle cx="24" cy="24" r="18"/><path d="M24 8 L28 24 L24 40 L20 24 Z"/><path d="M6 24h4M38 24h4M24 4v2M24 42v2"/>',
    star: '<path d="M24 6 L28.5 19 L42 19 L31 27.5 L35 41 L24 33 L13 41 L17 27.5 L6 19 L19.5 19 Z"/>',
    shield: '<path d="M24 6 L39 11 V23 C39 32 32 39 24 42 C16 39 9 32 9 23 V11 Z"/><path d="M24 16 v14 M18 22 h12"/>',
    flame: '<path d="M24 42 C15 42 11 35 13 28 C15 21 21 19 20 10 C27 14 30 20 29 25 C31 23 32 21 32 18 C37 23 38 30 35 36 C33 40 29 42 24 42 Z"/><path d="M24 42 C20 42 19 37 21 34 C23 31 24 30 24 27 C28 30 29 34 28 37 C27 40 26 42 24 42 Z"/>',
    wave: '<path d="M6 18 C11 12 15 12 20 18 S29 24 34 18 S40 12 42 14"/><path d="M6 28 C11 22 15 22 20 28 S29 34 34 28 S40 22 42 24"/><path d="M6 38 C11 32 15 32 20 38 S29 44 34 38"/>',
    leaf: '<path d="M10 38 C10 20 22 10 40 8 C38 26 28 38 10 38 Z"/><path d="M10 38 L30 18"/><path d="M18 30 h7 M22 26 v-6"/>',
    wind: '<path d="M6 18 H30 A5 5 0 1 0 25 13"/><path d="M6 26 H36 A5 5 0 1 1 31 31"/><path d="M6 34 H22"/>',
    mountain: '<path d="M4 40 L18 14 L26 28 L32 20 L44 40 Z"/><path d="M14 22 L18 26 L22 21"/>',
    roots: '<path d="M24 4 V22"/><path d="M14 10 C18 14 22 14 24 12 C26 14 30 14 34 10"/><path d="M24 22 C24 30 16 32 10 42 M24 22 C24 30 32 32 38 42 M24 22 V44 M24 30 C20 34 18 38 18 44 M24 30 C28 34 30 38 30 44"/>',
    atom: '<circle cx="24" cy="24" r="3"/><ellipse cx="24" cy="24" rx="19" ry="7.5"/><ellipse cx="24" cy="24" rx="19" ry="7.5" transform="rotate(60 24 24)"/><ellipse cx="24" cy="24" rx="19" ry="7.5" transform="rotate(-60 24 24)"/>',
    eye: '<path d="M4 24 C10 14 17 10 24 10 C31 10 38 14 44 24 C38 34 31 38 24 38 C17 38 10 34 4 24 Z"/><circle cx="24" cy="24" r="7"/><path d="M24 4 v3 M24 41 v3"/>',
    scales: '<path d="M24 6 V40 M14 42 H34 M8 12 H40"/><path d="M8 12 L3 26 H13 Z M40 12 L35 26 H45 Z"/><circle cx="24" cy="8" r="2"/>',
    dice: '<rect x="9" y="9" width="30" height="30" rx="6"/><circle cx="17" cy="17" r="2"/><circle cx="24" cy="24" r="2"/><circle cx="31" cy="31" r="2"/>',
    tower: '<path d="M18 42 L20 14 H28 L30 42 Z"/><path d="M17 14 H31 L28 8 H20 Z"/><path d="M24 4 v4"/><path d="M8 12 L16 14 M40 12 L32 14 M6 20 L17 18 M42 20 L31 18"/><path d="M12 42 H36"/>',
    book: '<path d="M8 10 C14 8 19 9 24 13 C29 9 34 8 40 10 V38 C34 36 29 37 24 41 C19 37 14 36 8 38 Z"/><path d="M24 13 V41"/>',
    crown: '<path d="M8 34 L10 14 L18 24 L24 10 L30 24 L38 14 L40 34 Z"/><path d="M8 40 H40"/>',
    scroll: '<path d="M14 8 H36 V34"/><path d="M14 8 A4 4 0 0 0 10 12 V36 A4 4 0 0 0 14 40 H34 A4 4 0 0 0 38 36 V34 H18 V36 A4 4 0 0 1 14 40"/><path d="M18 16 h12 M18 22 h12 M18 28 h8"/>',
    heart: '<path d="M24 40 C10 30 6 22 10 15 C14 9 21 10 24 16 C27 10 34 9 38 15 C42 22 38 30 24 40 Z"/>',
    trophy: '<path d="M15 8 H33 V18 A9 9 0 0 1 15 18 Z"/><path d="M15 12 H8 A6 6 0 0 0 15 22 M33 12 H40 A6 6 0 0 1 33 22"/><path d="M24 27 V34 M16 40 H32 L30 34 H18 Z"/>',
    constellation: '<circle cx="10" cy="34" r="2.5"/><circle cx="20" cy="16" r="2.5"/><circle cx="32" cy="24" r="2.5"/><circle cx="40" cy="10" r="2.5"/><path d="M11.5 32 L18.8 18.2 M22.3 17.3 L29.8 22.7 M33.6 22 L38.6 12"/>',
    gem: '<path d="M14 8 H34 L42 18 L24 42 L6 18 Z"/><path d="M6 18 H42 M18 18 L24 42 L30 18 M14 8 L18 18 L24 8 L30 18 L34 8"/>',
    key: '<circle cx="15" cy="24" r="8"/><path d="M23 24 H42 M36 24 V30 M30 24 V29"/>',
    music: '<path d="M18 36 V12 L38 8 V32"/><path d="M18 18 L38 14"/><circle cx="13" cy="36" r="5"/><circle cx="33" cy="32" r="5"/>',
    cards: '<rect x="7" y="12" width="20" height="28" rx="3" transform="rotate(-12 17 26)"/><rect x="21" y="8" width="20" height="28" rx="3" transform="rotate(10 31 22)"/><path d="M31 18 L34 22 L31 26 L28 22 Z"/>',
    palette: '<path d="M24 6 C13 6 6 14 6 23 C6 33 14 42 24 42 C27 42 28 40 27 37 C26 34 28 32 31 32 H35 C39 32 42 29 42 24 C42 14 34 6 24 6 Z"/><circle cx="15" cy="21" r="2.5"/><circle cx="21" cy="13" r="2.5"/><circle cx="30" cy="13" r="2.5"/><circle cx="36" cy="21" r="2.5"/>'
  };

  /* ---------- Fonte de verdade: S1 — Elementais vs Arcanos ---------- */
  const lore = {
    intro: {
      title: 'Duas visões do mundo. Dois caminhos para o poder.',
      text: 'Os Arcanos acreditam que compreender a realidade é a melhor forma de transformá-la. Os Elementais acreditam que a força das fundações sustenta tudo aquilo que merece existir.',
      note: 'Nenhuma das facções está certa por definição. A escolha revela aquilo em que cada jogador acredita.'
    },
    premise: [
      'No universo de Table Tale, Arcanos e Elementais representam duas filosofias fundamentais sobre como o mundo deve ser compreendido, protegido e transformado.',
      'A divergência não é simplesmente entre magia e natureza, antigo e moderno, inteligência e força. É uma diferença de prioridades.',
      'Ambas as facções procuram poder, mas discordam sobre onde ele nasce e como deve ser utilizado.',
      'O conflito é filosófico e cultural antes de ser uma disputa entre heróis e vilões. Nenhuma facção é moralmente superior, e nenhuma possui o monopólio da verdade.'
    ],
    tension: {
      intro: [
        'As duas facções dependem de algo que a outra considera essencial.',
        'Os Arcanos sabem que o conhecimento precisa de uma base sobre a qual possa crescer. Os Elementais sabem que até as fundações mais sólidas precisam de resistir ao tempo e às mudanças.'
      ],
      rows: [
        ['O que permite evoluir?', 'Conhecimento e descoberta', 'Fundamentos e experiência'],
        ['O que deve ser protegido?', 'A liberdade de explorar possibilidades', 'Aquilo que sustenta a existência'],
        ['Como lidar com o passado?', 'Questioná-lo e aprender com ele', 'Preservar o que provou o seu valor'],
        ['Como lidar com a mudança?', 'Abraçá-la como oportunidade', 'Avaliar o seu impacto antes de a aceitar'],
        ['Qual é o maior perigo?', 'Ignorância e estagnação', 'Perda de identidade e de equilíbrio'],
        ['Onde nasce o poder?', 'Na compreensão', 'Na força e na resiliência']
      ],
      outro: 'A discordância não precisa de terminar em guerra. Pode gerar debate, rivalidade, cooperação, respeito e alianças circunstanciais.'
    },
    balance: {
      lead: 'Os Arcanos transformam e questionam. Os Elementais sustentam e protegem.',
      without: [
        ['arcanos', 'Sem os Arcanos, o mundo corre o risco de permanecer preso às próprias limitações.'],
        ['elementais', 'Sem os Elementais, o mundo corre o risco de perder as bases que tornam qualquer futuro possível.']
      ],
      warning: 'O conhecimento sem fundamento pode tornar-se arrogância. A força sem questionamento pode tornar-se estagnação.',
      closing: 'O equilíbrio nasce dessa interdependência, não de tornar as facções idênticas.'
    },
    choice: {
      intro: 'A decisão é individual. Ninguém escolhe uma facção por obrigação de grupo, por alinhamento moral ou por uma diferença de força — escolhe-se a filosofia que mais representa a maneira como se vê o mundo.',
      question: 'Quando o mundo precisa de mudar, preferes descobrir aquilo que ele ainda pode ser ou proteger aquilo que o mantém de pé?',
      answer: 'Não existe resposta correta. A escolha é uma declaração de identidade dentro do universo Table Tale.'
    },
    neutral: 'O verso partilhado representa o universo Table Tale como um todo, e não uma facção. Pertence igualmente a Arcanos e Elementais.',
    outro: {
      title: 'Two paths. Two truths. One world.',
      text: 'O mundo precisa de quem questione as suas fronteiras e de quem proteja as suas fundações.'
    }
  };

  const factions = [
    {
      id: 'arcanos',
      name: 'Arcanos',
      member: 'Arcano',
      symbol: 'atom',
      color: '#22d3ee',
      color2: '#a855f7',
      motto: 'Knowledge is power.',
      latin: 'Ad Astra Per Scientiam',
      latinMeaning: 'Às estrelas através do conhecimento',
      priorities: 'Questionar, compreender e evoluir.',
      keywords: ['Razão', 'Conhecimento', 'Descoberta', 'Ambição', 'Transformação'],
      worldview: [
        'Os Arcanos acreditam no poder da razão, do conhecimento e da descoberta. Para eles, compreender algo é deixar de ser dominado por aquilo. A ignorância limita; o conhecimento abre possibilidades.',
        'A realidade não deve ser aceite apenas porque sempre existiu de determinada maneira. Deve ser investigada, questionada e, quando necessário, transformada.',
        'O universo é um sistema de mistérios à espera de quem tenha curiosidade e disciplina suficientes para os decifrar.'
      ],
      values: [
        ['Razão', 'As decisões devem nascer da observação, do pensamento crítico e da compreensão.'],
        ['Conhecimento', 'Aprender é conquistar novas possibilidades.'],
        ['Curiosidade', 'Questionar o desconhecido é o primeiro passo para avançar.'],
        ['Inovação', 'A tradição não deve impedir novas soluções.'],
        ['Liberdade', 'Compreender as regras permite superar limitações.'],
        ['Ambição', 'Existe sempre algo além do que já foi alcançado.']
      ],
      personality: [
        'Os Arcanos tendem a ser curiosos, analíticos, estratégicos e inquietos. Gostam de explorar ideias, descobrir padrões e encontrar soluções onde outros veem limites.',
        'Podem ser visionários e generosos ao partilhar conhecimento, mas também correm o risco de se tornarem arrogantes, excessivamente racionais ou convencidos de que tudo pode ser controlado.'
      ],
      tensions: [
        ['Desafiam certezas e tornam possível o progresso.', 'Podem confundir inteligência com superioridade.'],
        ['Procuram soluções para problemas complexos.', 'Podem sacrificar o presente em nome de um futuro ideal.'],
        ['Libertam-se de limites impostos.', 'Podem esquecer que nem tudo o que pode ser mudado deve ser mudado.']
      ],
      principle: 'Para um Arcano, aceitar algo sem procurar compreendê-lo é desperdiçar uma oportunidade de evoluir.',
      chooseIf: [
        'Questionar é mais importante do que aceitar.',
        'O conhecimento amplia a liberdade.',
        'O futuro deve ser descoberto, mesmo que isso desafie certezas.',
        'A evolução exige curiosidade, coragem intelectual e transformação.'
      ],
      visual: {
        palette: [['#05070d', 'Preto profundo'], ['#22d3ee', 'Cyan elétrico'], ['#a855f7', 'Roxo néon']],
        language: 'Geometria, símbolos esotéricos, estruturas cósmicas e energia intelectual.',
        feeling: 'Mistério, descoberta, precisão e transcendência.'
      }
    },
    {
      id: 'elementais',
      name: 'Elementais',
      member: 'Elemental',
      symbol: 'roots',
      color: '#8fc46a',
      color2: '#f59e0b',
      motto: 'Strength is power.',
      latin: 'Radices Tenent Mundum',
      latinMeaning: 'As raízes sustentam o mundo',
      priorities: 'Preservar, resistir e sustentar.',
      keywords: ['Força', 'Fundamento', 'Tradição', 'Resiliência', 'Preservação'],
      worldview: [
        'Os Elementais valorizam aquilo que existe, aquilo que resistiu ao tempo e os fundamentos sobre os quais o mundo foi construído.',
        'Acreditam que toda a evolução depende de uma base. Antes de transformar, é preciso compreender o valor do que já existe. Antes de construir, é preciso garantir que as fundações resistem.',
        'Força não significa apenas poder físico. É também resiliência, estabilidade, disciplina, continuidade e capacidade de proteger aquilo que importa.',
        'O mundo não precisa de ser reinventado a cada geração. Algumas coisas merecem ser preservadas porque carregam experiência, identidade e equilíbrio.'
      ],
      values: [
        ['Força', 'Capacidade de resistir, proteger e permanecer de pé.'],
        ['Fundamento', 'Tudo o que cresce precisa de raízes sólidas.'],
        ['Tradição', 'O passado guarda conhecimento adquirido através da experiência.'],
        ['Resiliência', 'Sobreviver às mudanças sem perder a própria identidade.'],
        ['Equilíbrio', 'Respeitar os ciclos e as forças que sustentam a existência.'],
        ['Lealdade', 'Proteger pessoas, comunidades e compromissos.']
      ],
      personality: [
        'Os Elementais tendem a ser firmes, leais, resilientes e ligados às suas origens. Valorizam compromissos, experiências partilhadas e aquilo que foi construído ao longo do tempo.',
        'Podem ser protetores e confiáveis, mas também correm o risco de se tornarem inflexíveis, resistentes a mudanças necessárias ou excessivamente apegados ao passado.'
      ],
      tensions: [
        ['Preservam aquilo que dá estabilidade ao mundo.', 'Podem confundir preservação com imobilidade.'],
        ['Permanecem firmes em momentos de crise.', 'Podem rejeitar mudanças por medo de perder as suas referências.'],
        ['Protegem as suas comunidades e os seus valores.', 'Podem transformar lealdade em fechamento ao que é diferente.']
      ],
      principle: 'Para um Elemental, destruir as próprias fundações em nome do progresso é arriscar perder tudo aquilo que torna a evolução possível.',
      chooseIf: [
        'Nem tudo o que é antigo está ultrapassado.',
        'A força está em resistir e proteger o que importa.',
        'Toda a construção depende de fundamentos sólidos.',
        'Evoluir também significa preservar identidade, memória e equilíbrio.'
      ],
      visual: {
        palette: [['#7fb069', 'Terra'], ['#3b9ad9', 'Água'], ['#f59e0b', 'Fogo'], ['#d6dbe1', 'Ar']],
        language: 'A mesma qualidade de acabamento e presença dos Arcanos, expressando a força dos fundamentos e das forças naturais.',
        feeling: 'Raízes, profundidade, vitalidade e clareza.'
      }
    }
  ];

  // Expressão visual dos Elementais (secção 8 da fonte de verdade)
  const elements = [
    { id: 'terra', name: 'Terra', symbol: 'mountain', color: '#7fb069', colorName: 'Verde', keywords: ['Raízes', 'Pedra', 'Permanência'] },
    { id: 'agua', name: 'Água', symbol: 'wave', color: '#3b9ad9', colorName: 'Azul', keywords: ['Movimento', 'Profundidade', 'Adaptação'] },
    { id: 'fogo', name: 'Fogo', symbol: 'flame', color: '#f59e0b', colorName: 'Âmbar e laranja', keywords: ['Vitalidade', 'Coragem', 'Renovação'] },
    { id: 'ar', name: 'Ar', symbol: 'wind', color: '#d6dbe1', colorName: 'Branco e prata', keywords: ['Liberdade', 'Clareza', 'Movimento'] }
  ];

  /* ---------- Biblioteca (o verso neutro: os jogos pertencem a Table Tale, não a uma facção) ---------- */
  const tones = {
    ember: { name: 'brasa', cover: ['#7a2a1c', '#1a0f0c'], accent: '#E76F3C' },
    petrol: { name: 'azul petróleo', cover: ['#0F4C5C', '#0B1E2D'], accent: '#2DD4BF' },
    moss: { name: 'verde musgo', cover: ['#2f4a32', '#0d1a14'], accent: '#9cba6e' },
    dusk: { name: 'roxo arcano', cover: ['#4a3f72', '#0B1E2D'], accent: '#9d8bd1' },
    steel: { name: 'cinza frio', cover: ['#3b4f5c', '#0B1E2D'], accent: '#8CA3B0' }
  };

  const owner = 'Gabriel Maia';

  const games = [
    {
      id: 'hitster', title: 'Hitster', genre: 'Música', tone: 'dusk', symbol: 'music',
      minPlayers: 2, maxPlayers: 10, duration: 30, complexity: 'Leve',
      description: 'Ouve uma música e coloca-a no sítio certo da tua linha do tempo. Acerta no ano e constrói a cronologia musical mais longa antes dos outros.',
      status: 'em-progresso', favorite: false,
      sessions: [
        { id: 's1', date: '2026-10-25', participants: 'Gabriel Maia, Inês Rocha, Tomás Leal, Marta Sousa', notes: 'Ninguém acertou nos anos 80. Revanche marcada.' }
      ]
    },
    {
      id: 'uno', title: 'Uno', genre: 'Cartas', tone: 'ember', symbol: 'cards',
      minPlayers: 2, maxPlayers: 10, duration: 30, complexity: 'Leve',
      description: 'Combina cores e números para te livrares de todas as cartas. Cartas de ação mudam o rumo da partida — e não te esqueças de dizer «Uno!».',
      status: 'em-progresso', favorite: false,
      sessions: [
        { id: 's2', date: '2026-09-30', participants: 'Gabriel Maia, Inês Rocha, Rui Faria', notes: '' }
      ]
    },
    {
      id: 'tranquility', title: 'Tranquility', genre: 'Cooperativo', tone: 'petrol', symbol: 'wave',
      minPlayers: 1, maxPlayers: 5, duration: 20, complexity: 'Leve',
      description: 'Uma viagem cooperativa e silenciosa: ordenem cartas numeradas pelo mar até à ilha, sem poderem comunicar entre si.',
      status: 'concluido', favorite: true,
      sessions: [
        { id: 's3', date: '2026-10-11', participants: 'Gabriel Maia, Marta Sousa, Rui Faria', notes: 'Chegámos à ilha com uma única carta de sobra!' }
      ]
    },
    {
      id: 'cores-com-dicas', title: 'Cores com Dicas', genre: 'Festa', tone: 'moss', symbol: 'palette',
      minPlayers: 3, maxPlayers: 10, duration: 30, complexity: 'Leve',
      description: 'Dá uma dica de uma ou duas palavras para que os outros encontrem a tua cor num tabuleiro com centenas de tons.',
      status: 'por-jogar', favorite: false, sessions: []
    },
    {
      id: 'dixit', title: 'Dixit', genre: 'Narrativo', tone: 'dusk', symbol: 'star',
      minPlayers: 3, maxPlayers: 6, duration: 30, complexity: 'Leve',
      description: 'Escolhe uma carta ilustrada e descreve-a com uma frase, palavra ou som. A dica não pode ser óbvia demais nem misteriosa demais.',
      status: 'concluido', favorite: true,
      sessions: [
        { id: 's4', date: '2026-08-17', participants: 'Gabriel Maia, Marta Sousa, Inês Rocha, Tomás Leal', notes: 'A dica «saudade» deu pontos a toda a mesa.' }
      ]
    },
    {
      id: 'coup', title: 'Coup', genre: 'Blefe', tone: 'ember', symbol: 'crown',
      minPlayers: 2, maxPlayers: 6, duration: 15, complexity: 'Leve',
      description: 'Intriga e blefe numa corte corrupta. Usa — ou finge usar — o poder das tuas personagens para eliminar a influência dos rivais.',
      status: 'em-progresso', favorite: false,
      sessions: [
        { id: 's5', date: '2026-10-29', participants: 'Gabriel Maia, Inês Rocha, Rui Faria', notes: 'O Rui blefou com o Duque três vezes seguidas.' },
        { id: 's6', date: '2026-07-05', participants: 'Gabriel Maia, Tomás Leal, Marta Sousa', notes: '' }
      ]
    },
    {
      id: 'vaalbara', title: 'Vaalbara', genre: 'Estratégia', tone: 'moss', symbol: 'mountain',
      minPlayers: 2, maxPlayers: 4, duration: 45, complexity: 'Média',
      description: 'Jogo de estratégia inspirado em Vaalbara, o supercontinente primordial da Terra.',
      status: 'por-jogar', favorite: false, sessions: []
    },
    {
      id: 'duelo-por-cardia', title: 'Duelo por Cardia', genre: 'Duelo', tone: 'steel', symbol: 'shield',
      minPlayers: 2, maxPlayers: 2, duration: 15, complexity: 'Leve',
      description: 'Duelo de cartas para dois jogadores: em cada ronda, ambos revelam um personagem e o mais forte vence — mas cada habilidade pode virar o resultado.',
      status: 'por-jogar', favorite: false, sessions: []
    },
    {
      id: 'baralho-classico', title: 'Baralho Clássico', genre: 'Clássico', tone: 'steel', symbol: 'cards', copies: 2,
      minPlayers: 1, maxPlayers: 8, duration: 30, complexity: 'Variável',
      description: 'Baralho clássico de 52 cartas para sueca, paciência, bisca, poker e tantos outros jogos de sempre.',
      status: 'por-jogar', favorite: false, sessions: []
    }
  ].map(function (g) { g.owner = owner; g.copies = g.copies || 1; return g; });

  const events = [
    { id: 'e1', name: 'Feira do Pergaminho', date: '2026-06-07', place: 'Coimbra · Claustro das Letras', text: 'Mercado de jogos usados, oficinas de pintura de miniaturas e leitura de histórias.', attended: true },
    { id: 'e2', name: 'Noite dos Mapas Perdidos', date: '2026-09-14', place: 'Lisboa · Taberna do Compasso', text: 'Maratona de jogos de exploração e cartografia.', attended: true },
    { id: 'e3', name: 'Torneio de Outono: Arcanos vs Elementais', date: '2026-10-12', place: 'Porto · Salão das Marés', text: 'Torneio amigável em que cada jogador representa a facção que escolheu. Nenhum lado parte com vantagem.', attended: true },
    { id: 'e4', name: 'Two Paths, One Table', date: '2026-11-21', place: 'Braga · Observatório Velho', text: 'Noite de jogos cooperativos com equipas mistas de Arcanos e Elementais. Lugares limitados.', attended: false }
  ];

  const achievements = [
    { id: 'a1', name: 'Primeira Expedição', text: 'Regista a tua primeira sessão de jogo.', symbol: 'compass', metric: 'sessions', goal: 1 },
    { id: 'a2', name: 'Cronista da Mesa', text: 'Regista 5 sessões no diário.', symbol: 'scroll', metric: 'sessions', goal: 5 },
    { id: 'a3', name: 'Peregrino dos Eventos', text: 'Participa em 3 eventos da comunidade.', symbol: 'shield', metric: 'events', goal: 3 },
    { id: 'a4', name: 'Coração de Pergaminho', text: 'Adiciona 3 jogos aos favoritos.', symbol: 'heart', metric: 'favorites', goal: 3 },
    { id: 'a5', name: 'Mestre do Compasso', text: 'Conclui 3 jogos da biblioteca.', symbol: 'trophy', metric: 'completed', goal: 3 },
    { id: 'a6', name: 'Explorador de Géneros', text: 'Joga títulos de 6 géneros diferentes.', symbol: 'constellation', metric: 'genres', goal: 6 }
  ];

  const levelTitles = [
    'Aprendiz de Mesa', 'Leitor de Runas', 'Portador de Dados', 'Guardião de Fichas', 'Viajante do Véu',
    'Escriba da Mesa', 'Cartógrafo Arcano', 'Arquivista das Marés', 'Mestre do Compasso', 'Lenda da Mesa'
  ];

  const profile = {
    name: owner,
    faction: 'arcanos',
    bio: 'Coleciona mapas, dados antigos e histórias contadas à volta da mesa.',
    avatarColor: '#0F4C5C',
    memberSince: '2024',
    baseXp: 1400,
    baseHours: 112
  };

  const avatarColors = [
    { value: '#0F4C5C', label: 'Azul petróleo' },
    { value: '#6B5B95', label: 'Roxo arcano' },
    { value: '#B23A2E', label: 'Vermelho antigo' },
    { value: '#2A1F1A', label: 'Marrom escuro' },
    { value: '#7a5a24', label: 'Dourado envelhecido' }
  ];

  return { symbols, lore, factions, elements, tones, games, events, achievements, levelTitles, profile, avatarColors };
})();
