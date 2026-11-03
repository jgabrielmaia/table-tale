import type { Content } from './content.types';

/** Portuguese (Portugal). The database already stores the Portuguese text, so most overlays are empty. */
export const contentPt: Content = {
  lore: {
    intro: {
      title: 'Duas visões do mundo. Dois caminhos para o poder.',
      text: 'Os Arcanos acreditam que compreender a realidade é a melhor forma de transformá-la. Os Elementais acreditam que a força das fundações sustenta tudo aquilo que merece existir.',
      note: 'Nenhuma das facções está certa por definição. A escolha revela aquilo em que cada jogador acredita.',
    },
    premise: [
      'No universo de Table Tale, Arcanos e Elementais representam duas filosofias fundamentais sobre como o mundo deve ser compreendido, protegido e transformado.',
      'A divergência não é simplesmente entre magia e natureza, antigo e moderno, inteligência e força. É uma diferença de prioridades.',
      'Ambas as facções procuram poder, mas discordam sobre onde ele nasce e como deve ser utilizado.',
      'O conflito é filosófico e cultural antes de ser uma disputa entre heróis e vilões. Nenhuma facção é moralmente superior, e nenhuma possui o monopólio da verdade.',
    ],
    tension: {
      intro: [
        'As duas facções dependem de algo que a outra considera essencial.',
        'Os Arcanos sabem que o conhecimento precisa de uma base sobre a qual possa crescer. Os Elementais sabem que até as fundações mais sólidas precisam de resistir ao tempo e às mudanças.',
      ],
      rows: [
        ['O que permite evoluir?', 'Conhecimento e descoberta', 'Fundamentos e experiência'],
        ['O que deve ser protegido?', 'A liberdade de explorar possibilidades', 'Aquilo que sustenta a existência'],
        ['Como lidar com o passado?', 'Questioná-lo e aprender com ele', 'Preservar o que provou o seu valor'],
        ['Como lidar com a mudança?', 'Abraçá-la como oportunidade', 'Avaliar o seu impacto antes de a aceitar'],
        ['Qual é o maior perigo?', 'Ignorância e estagnação', 'Perda de identidade e de equilíbrio'],
        ['Onde nasce o poder?', 'Na compreensão', 'Na força e na resiliência'],
      ],
      outro: 'A discordância não precisa de terminar em guerra. Pode gerar debate, rivalidade, cooperação, respeito e alianças circunstanciais.',
    },
    balance: {
      lead: 'Os Arcanos transformam e questionam. Os Elementais sustentam e protegem.',
      without: {
        arcanos: 'Sem os Arcanos, o mundo corre o risco de permanecer preso às próprias limitações.',
        elementais: 'Sem os Elementais, o mundo corre o risco de perder as bases que tornam qualquer futuro possível.',
      },
      warning: 'O conhecimento sem fundamento pode tornar-se arrogância. A força sem questionamento pode tornar-se estagnação.',
      closing: 'O equilíbrio nasce dessa interdependência, não de tornar as facções idênticas.',
    },
    choice: {
      intro: 'Cada jogador descobre a sua carta através do Sorteio do Destino. Antes de a revelares, lê o que cada facção defende e pergunta-te o que realmente te move.',
      question: 'Quando o mundo precisa de mudar, preferes descobrir aquilo que ele ainda pode ser ou proteger aquilo que o mantém de pé?',
      answer: 'Não existe resposta correta. A carta revela uma identidade dentro do universo Table Tale, e nenhuma facção é superior à outra.',
    },
    neutral: 'O verso partilhado representa o universo Table Tale como um todo, e não uma facção. Pertence igualmente a Arcanos e Elementais.',
    outro: {
      title: 'Dois caminhos. Duas verdades. Um só mundo.',
      text: 'O mundo precisa de quem questione as suas fronteiras e de quem proteja as suas fundações.',
    },
    chapters: [
      { id: 'identidade', label: 'A tua identidade' },
      { id: 'premissa', label: 'Premissa' },
      { id: 'arcanos', label: 'Os Arcanos' },
      { id: 'elementais', label: 'Os Elementais' },
      { id: 'tensao', label: 'Ponto de tensão' },
    ],
    timeline: [
      { marker: 'I', title: 'A tua identidade', text: 'Descobre a carta e a facção que te representam nesta temporada.', symbol: 'compass' },
      { marker: 'II', title: 'Duas filosofias', text: 'Conhecimento e fundamento: duas formas legítimas de ver o mundo.', symbol: 'scroll' },
      { marker: 'III · IV', title: 'Arcanos e Elementais', text: 'Valores, virtudes, riscos e a expressão visual de cada facção.', symbol: 'constellation' },
      { marker: 'V', title: 'O ponto de tensão', text: 'Onde as prioridades se cruzam — e porque cada lado precisa do outro.', symbol: 'shield' },
    ],
  },
  cards: {
    magician: 'Transformas uma faísca de vontade em realidade. Tudo o que precisas já está ao teu alcance.',
    'high-priestess': 'Guardas o que fica por dizer. Ouves o silêncio entre as jogadas e vês o que os outros não veem.',
    star: 'És uma luz para a noite longa. Quando a mesa se cala, mostras a todos o caminho em frente.',
    world: 'Vês o tabuleiro inteiro. Cada fim é um círculo que se fecha e sabes onde começa o próximo capítulo.',
    temperance: 'Fundes forças opostas em algo novo. A paciência e o equilíbrio são o teu ofício.',
    earth: 'Com firmeza e paciência, és o alicerce sobre o qual todas as histórias se constroem.',
    water: 'Com profundidade e capacidade de adaptação, contornas qualquer obstáculo e resistes a qualquer muralha.',
    fire: 'Com calor e ousadia, és impossível de ignorar: acendes os momentos de que a mesa se lembra.',
    air: 'Leveza e visão longínqua: levas ideias no vento e elevas-te acima do ruído.',
  },
  cardLore: {
    magician: 'Primeira faísca dos Arcanos: quem acredita que compreender é o primeiro passo para transformar. Em Table Tale, o Mago abre o caminho para todas as descobertas.',
    'high-priestess': 'Guardiã dos segredos do Véu. Para os Arcanos, o silêncio também ensina, e a Sacerdotisa vê o que a mesa ainda não disse.',
    star: 'A esperança que orienta os Arcanos na noite mais longa. Em Table Tale, a Estrela lembra que descobrir é também guiar os outros.',
    world: 'O círculo completo do conhecimento. A carta dos Arcanos que vê o tabuleiro inteiro e sabe quando um capítulo termina e outro começa.',
    temperance: 'A arte de equilibrar forças opostas. Entre os Arcanos, a Temperança transforma tensão em harmonia, um gole de cada vez.',
    earth: 'O alicerce dos Elementais. Em Table Tale, a Terra é a raiz paciente que sustenta cada história e protege o que merece permanecer.',
    water: 'A força que se adapta e persiste. Para os Elementais, a Água contorna qualquer obstáculo e guarda a memória de tudo o que atravessa.',
    fire: 'A chama dos Elementais: coragem, calor e vontade. Em Table Tale, o Fogo acende os momentos de que a mesa se lembra durante muito tempo.',
    air: 'O sopro livre que une os Elementais. Em Table Tale, o Ar leva ideias de mesa em mesa e eleva cada história acima do ruído.',
  },
  factionLore: {
    arcanos: { motto: 'O conhecimento é poder.' },
    elementais: { motto: 'A força é poder.' },
  },
  genres: {},
  complexities: {},
  games: {},
  events: {},
  achievements: {},
};
