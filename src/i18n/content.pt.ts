import type { Content } from './content.types';

/** Portuguese (Portugal). The database already stores the Portuguese text, so most overlays are empty. */
export const contentPt: Content = {
  lore: {
    intro: {
      title: 'Duas verdades. Um só mundo. Qual é a tua?',
      text: 'Os Arcanos acreditam que o conhecimento é poder. Os Elementais, que é a força. Ambos têm razão, e ambos são perigosos.',
      note: 'Tu não escolhes um lado. As cartas escolhem.',
    },
    premise: [
      'Há muito tempo, o mundo partiu-se em dois. Não entre o bem e o mal, mas entre duas formas de sobreviver.',
      'Um lado dobra a realidade para a compreender. O outro segura-a para que não se parta.',
      'Ambos querem poder. Nenhum vence sem o outro.',
      'Por isso a pergunta nunca foi quem tem razão. É quem és tu.',
    ],
    tension: {
      intro: [
        'Cada lado guarda aquilo sem o qual o outro não vive.',
      ],
      rows: [
        ['O que faz o mundo avançar?', 'Perguntas', 'Raízes'],
        ['O que nunca se pode perder?', 'A liberdade de explorar', 'O que sustenta tudo'],
        ['O que fazer com o passado?', 'Abri-lo ao meio', 'Guardar o que sobreviveu'],
        ['Qual é a maior ameaça?', 'Ficar parado', 'Esquecer quem somos'],
      ],
      outro: 'As suas disputas acendem rivalidades, alianças e uma ou outra traição.',
    },
    balance: {
      lead: 'Os Arcanos questionam. Os Elementais resistem.',
      without: {
        arcanos: 'Sem os Arcanos, o mundo deixa de crescer.',
        elementais: 'Sem os Elementais, o mundo fica sem chão.',
      },
      warning: 'Conhecimento sem raízes torna-se arrogância. Força sem perguntas torna-se pedra.',
      closing: 'Equilíbrio não é igualdade. É uma tensão que se aguenta.',
    },
    choice: {
      intro: 'Nove cartas. Uma é tua.',
      question: 'Tu não escolhes. És escolhido.',
      destiny: [
        'Tira uma carta e o destino responde. Dá-te a facção e o rosto desta temporada. Não é uma preferência, é uma revelação.',
      ],
      express: 'Os Arcanos falam pelo Mago, pela Sacerdotisa, pela Estrela, pelo Mundo e pela Temperança. Os Elementais respondem com Terra, Água, Fogo e Ar.',
      answer: 'Nenhum lado é o vilão. Ambos são necessários.',
    },
    neutral: 'O verso partilhado não pertence a ninguém, e por isso pertence a todos.',
    outro: {
      title: 'Dois caminhos. Uma só mesa.',
      text: 'Alguém tem de questionar as fronteiras. Alguém tem de guardar os portões. Tira a tua carta.',
    },
    chapters: [
      { id: 'identidade', label: 'A tua identidade' },
      { id: 'premissa', label: 'Premissa' },
      { id: 'arcanos', label: 'Os Arcanos' },
      { id: 'elementais', label: 'Os Elementais' },
      { id: 'tensao', label: 'Ponto de tensão' },
    ],
    timeline: [
      { marker: 'I', title: 'A tua identidade', text: 'Revela a carta que o destino te reservou e a facção a que pertences nesta temporada.', symbol: 'compass' },
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
