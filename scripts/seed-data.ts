import type { CoverTone } from '../src/lib/cover';
import type { FactionLore } from '../src/types/domain';
import type { AchievementRequirement, OwnershipCondition } from '../src/types/database';

/* Fonte de verdade das facções: Notion "S1: Elementais vs Arcanos".
   Origens, eventos históricos e personagens fundadores NÃO são cânone e não são criados aqui. */

export interface SeedFaction {
  slug: string;
  name: string;
  description: string;
  symbol: string;
  color: string;
  lore: FactionLore;
}

export const factions: SeedFaction[] = [
  {
    slug: 'arcanos',
    name: 'Arcanos',
    symbol: 'atom',
    color: '#22d3ee',
    description: 'Acreditam que compreender a realidade é a melhor forma de transformá-la.',
    lore: {
      member: 'Arcano',
      color2: '#a855f7',
      motto: 'Knowledge is power.',
      latin: 'Ad Astra Per Scientiam',
      latinMeaning: 'Às estrelas através do conhecimento',
      priorities: 'Questionar, compreender e evoluir.',
      keywords: ['Razão', 'Conhecimento', 'Descoberta', 'Ambição', 'Transformação'],
      worldview: [
        'Os Arcanos acreditam no poder da razão, do conhecimento e da descoberta. Para eles, compreender algo é deixar de ser dominado por aquilo. A ignorância limita; o conhecimento abre possibilidades.',
        'A realidade não deve ser aceite apenas porque sempre existiu de determinada maneira. Deve ser investigada, questionada e, quando necessário, transformada.',
        'O universo é um sistema de mistérios à espera de quem tenha curiosidade e disciplina suficientes para os decifrar.',
      ],
      values: [
        ['Razão', 'As decisões devem nascer da observação, do pensamento crítico e da compreensão.'],
        ['Conhecimento', 'Aprender é conquistar novas possibilidades.'],
        ['Curiosidade', 'Questionar o desconhecido é o primeiro passo para avançar.'],
        ['Inovação', 'A tradição não deve impedir novas soluções.'],
        ['Liberdade', 'Compreender as regras permite superar limitações.'],
        ['Ambição', 'Existe sempre algo além do que já foi alcançado.'],
      ],
      personality: [
        'Os Arcanos tendem a ser curiosos, analíticos, estratégicos e inquietos. Gostam de explorar ideias, descobrir padrões e encontrar soluções onde outros veem limites.',
        'Podem ser visionários e generosos ao partilhar conhecimento, mas também correm o risco de se tornarem arrogantes, excessivamente racionais ou convencidos de que tudo pode ser controlado.',
      ],
      tensions: [
        ['Desafiam certezas e tornam possível o progresso.', 'Podem confundir inteligência com superioridade.'],
        ['Procuram soluções para problemas complexos.', 'Podem sacrificar o presente em nome de um futuro ideal.'],
        ['Libertam-se de limites impostos.', 'Podem esquecer que nem tudo o que pode ser mudado deve ser mudado.'],
      ],
      principle: 'Para um Arcano, aceitar algo sem procurar compreendê-lo é desperdiçar uma oportunidade de evoluir.',
      chooseIf: [
        'Questionar é mais importante do que aceitar.',
        'O conhecimento amplia a liberdade.',
        'O futuro deve ser descoberto, mesmo que isso desafie certezas.',
        'A evolução exige curiosidade, coragem intelectual e transformação.',
      ],
      visual: {
        palette: [['#05070d', 'Preto profundo'], ['#22d3ee', 'Cyan elétrico'], ['#a855f7', 'Roxo néon']],
        language: 'Geometria, símbolos esotéricos, estruturas cósmicas e energia intelectual.',
        feeling: 'Mistério, descoberta, precisão e transcendência.',
      },
    },
  },
  {
    slug: 'elementais',
    name: 'Elementais',
    symbol: 'roots',
    color: '#8fc46a',
    description: 'Acreditam que a força das fundações sustenta tudo aquilo que merece existir.',
    lore: {
      member: 'Elemental',
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
        'O mundo não precisa de ser reinventado a cada geração. Algumas coisas merecem ser preservadas porque carregam experiência, identidade e equilíbrio.',
      ],
      values: [
        ['Força', 'Capacidade de resistir, proteger e permanecer de pé.'],
        ['Fundamento', 'Tudo o que cresce precisa de raízes sólidas.'],
        ['Tradição', 'O passado guarda conhecimento adquirido através da experiência.'],
        ['Resiliência', 'Sobreviver às mudanças sem perder a própria identidade.'],
        ['Equilíbrio', 'Respeitar os ciclos e as forças que sustentam a existência.'],
        ['Lealdade', 'Proteger pessoas, comunidades e compromissos.'],
      ],
      personality: [
        'Os Elementais tendem a ser firmes, leais, resilientes e ligados às suas origens. Valorizam compromissos, experiências partilhadas e aquilo que foi construído ao longo do tempo.',
        'Podem ser protetores e confiáveis, mas também correm o risco de se tornarem inflexíveis, resistentes a mudanças necessárias ou excessivamente apegados ao passado.',
      ],
      tensions: [
        ['Preservam aquilo que dá estabilidade ao mundo.', 'Podem confundir preservação com imobilidade.'],
        ['Permanecem firmes em momentos de crise.', 'Podem rejeitar mudanças por medo de perder as suas referências.'],
        ['Protegem as suas comunidades e os seus valores.', 'Podem transformar lealdade em fechamento ao que é diferente.'],
      ],
      principle: 'Para um Elemental, destruir as próprias fundações em nome do progresso é arriscar perder tudo aquilo que torna a evolução possível.',
      chooseIf: [
        'Nem tudo o que é antigo está ultrapassado.',
        'A força está em resistir e proteger o que importa.',
        'Toda a construção depende de fundamentos sólidos.',
        'Evoluir também significa preservar identidade, memória e equilíbrio.',
      ],
      visual: {
        palette: [['#7fb069', 'Terra'], ['#3b9ad9', 'Água'], ['#f59e0b', 'Fogo'], ['#d6dbe1', 'Ar']],
        language: 'A mesma qualidade de acabamento e presença dos Arcanos, expressando a força dos fundamentos e das forças naturais.',
        feeling: 'Raízes, profundidade, vitalidade e clareza.',
      },
    },
  },
];

export interface SeedLoreEntity {
  slug: string;
  name: string;
  description: string;
  long_description: string;
  symbol: string;
  color: string;
  sort_order: number;
}

/** Os quatro registos da linguagem visual Arcana (S1, secção 8). */
export const arcanas: SeedLoreEntity[] = [
  {
    slug: 'geometria', name: 'Geometria', symbol: 'geometry', color: '#22d3ee', sort_order: 1,
    description: 'Precisão e padrão: a realidade como um sistema que pode ser medido e compreendido.',
    long_description: 'A geometria traduz o valor Arcano da razão. Onde outros veem acaso, os Arcanos procuram proporção, estrutura e regra — porque compreender as regras permite superar limitações.',
  },
  {
    slug: 'simbolos-esotericos', name: 'Símbolos Esotéricos', symbol: 'eye', color: '#a855f7', sort_order: 2,
    description: 'O mistério à espera de ser decifrado.',
    long_description: 'Os símbolos esotéricos expressam a curiosidade Arcana: o universo é um sistema de mistérios à espera de quem tenha curiosidade e disciplina suficientes para os decifrar.',
  },
  {
    slug: 'estruturas-cosmicas', name: 'Estruturas Cósmicas', symbol: 'constellation', color: '#818cf8', sort_order: 3,
    description: 'Ad Astra Per Scientiam — às estrelas através do conhecimento.',
    long_description: 'As estruturas cósmicas dão forma à ambição Arcana: existe sempre algo além do que já foi alcançado, e o futuro deve ser descoberto mesmo que isso desafie certezas.',
  },
  {
    slug: 'energia-intelectual', name: 'Energia Intelectual', symbol: 'spark', color: '#67e8f9', sort_order: 4,
    description: 'A transformação que nasce de uma ideia.',
    long_description: 'A energia intelectual representa a inovação e a liberdade Arcanas: a tradição não deve impedir novas soluções, e a evolução exige coragem intelectual.',
  },
];

/** As quatro forças naturais da linguagem visual Elemental (S1, secção 8). */
export const elementals: SeedLoreEntity[] = [
  {
    slug: 'terra', name: 'Terra', symbol: 'mountain', color: '#7fb069', sort_order: 1,
    description: 'Raízes, pedra e permanência.',
    long_description: 'A Terra exprime o fundamento Elemental: tudo o que cresce precisa de raízes sólidas, e a força está em permanecer de pé.',
  },
  {
    slug: 'agua', name: 'Água', symbol: 'wave', color: '#3b9ad9', sort_order: 2,
    description: 'Movimento, profundidade e adaptação.',
    long_description: 'A Água exprime a resiliência Elemental: sobreviver às mudanças sem perder a própria identidade.',
  },
  {
    slug: 'fogo', name: 'Fogo', symbol: 'flame', color: '#f59e0b', sort_order: 3,
    description: 'Vitalidade, coragem e renovação.',
    long_description: 'O Fogo exprime a coragem Elemental: permanecer firme em momentos de crise e proteger aquilo que importa.',
  },
  {
    slug: 'ar', name: 'Ar', symbol: 'wind', color: '#d6dbe1', sort_order: 4,
    description: 'Liberdade, clareza e movimento.',
    long_description: 'O Ar exprime o equilíbrio Elemental: respeitar os ciclos e as forças que sustentam a existência.',
  },
];

export interface SeedGame {
  slug: string;
  title: string;
  genre: string;
  min_players: number;
  max_players: number;
  duration_minutes: number;
  complexity: string;
  description: string;
  cover: { tone: CoverTone; symbol: string };
  copies: number;
}

export const games: SeedGame[] = [
  {
    slug: 'hitster', title: 'Hitster', genre: 'Música', min_players: 2, max_players: 10, duration_minutes: 30, complexity: 'Leve', copies: 1,
    cover: { tone: 'dusk', symbol: 'music' },
    description: 'Ouve uma música e coloca-a no sítio certo da tua linha do tempo. Acerta no ano e constrói a cronologia musical mais longa antes dos outros.',
  },
  {
    slug: 'uno', title: 'Uno', genre: 'Cartas', min_players: 2, max_players: 10, duration_minutes: 30, complexity: 'Leve', copies: 1,
    cover: { tone: 'ember', symbol: 'cards' },
    description: 'Combina cores e números para te livrares de todas as cartas. Cartas de ação mudam o rumo da partida — e não te esqueças de dizer «Uno!».',
  },
  {
    slug: 'tranquility', title: 'Tranquility', genre: 'Cooperativo', min_players: 1, max_players: 5, duration_minutes: 20, complexity: 'Leve', copies: 1,
    cover: { tone: 'petrol', symbol: 'wave' },
    description: 'Uma viagem cooperativa e silenciosa: ordenem cartas numeradas pelo mar até à ilha, sem poderem comunicar entre si.',
  },
  {
    slug: 'cores-com-dicas', title: 'Cores com Dicas', genre: 'Festa', min_players: 3, max_players: 10, duration_minutes: 30, complexity: 'Leve', copies: 1,
    cover: { tone: 'moss', symbol: 'palette' },
    description: 'Dá uma dica de uma ou duas palavras para que os outros encontrem a tua cor num tabuleiro com centenas de tons.',
  },
  {
    slug: 'dixit', title: 'Dixit', genre: 'Narrativo', min_players: 3, max_players: 6, duration_minutes: 30, complexity: 'Leve', copies: 1,
    cover: { tone: 'dusk', symbol: 'star' },
    description: 'Escolhe uma carta ilustrada e descreve-a com uma frase, palavra ou som. A dica não pode ser óbvia demais nem misteriosa demais.',
  },
  {
    slug: 'coup', title: 'Coup', genre: 'Blefe', min_players: 2, max_players: 6, duration_minutes: 15, complexity: 'Leve', copies: 1,
    cover: { tone: 'ember', symbol: 'crown' },
    description: 'Intriga e blefe numa corte corrupta. Usa — ou finge usar — o poder das tuas personagens para eliminar a influência dos rivais.',
  },
  {
    slug: 'vaalbara', title: 'Vaalbara', genre: 'Estratégia', min_players: 2, max_players: 4, duration_minutes: 45, complexity: 'Média', copies: 1,
    cover: { tone: 'moss', symbol: 'mountain' },
    description: 'Jogo de estratégia inspirado em Vaalbara, o supercontinente primordial da Terra.',
  },
  {
    slug: 'duelo-por-cardia', title: 'Duelo por Cardia', genre: 'Duelo', min_players: 2, max_players: 2, duration_minutes: 15, complexity: 'Leve', copies: 1,
    cover: { tone: 'steel', symbol: 'shield' },
    description: 'Duelo de cartas para dois jogadores: em cada ronda, ambos revelam um personagem e o mais forte vence — mas cada habilidade pode virar o resultado.',
  },
  {
    slug: 'cartas-classico', title: 'Cartas Clássico', genre: 'Clássico', min_players: 1, max_players: 8, duration_minutes: 30, complexity: 'Variável', copies: 2,
    cover: { tone: 'steel', symbol: 'cards' },
    description: 'Baralho clássico de 52 cartas para sueca, paciência, bisca, poker e tantos outros jogos de sempre.',
  },
];

export interface SeedAchievement {
  slug: string;
  name: string;
  description: string;
  icon: string;
  requirement_type: AchievementRequirement;
  requirement_value: number;
}

export const achievements: SeedAchievement[] = [
  { slug: 'primeira-expedicao', name: 'Primeira Expedição', description: 'Regista a tua primeira sessão de jogo.', icon: 'compass', requirement_type: 'sessions', requirement_value: 1 },
  { slug: 'cronista-da-mesa', name: 'Cronista da Mesa', description: 'Regista 5 sessões no diário.', icon: 'scroll', requirement_type: 'sessions', requirement_value: 5 },
  { slug: 'peregrino-dos-eventos', name: 'Peregrino dos Eventos', description: 'Participa em 3 eventos da comunidade.', icon: 'shield', requirement_type: 'events', requirement_value: 3 },
  { slug: 'coracao-de-pergaminho', name: 'Coração de Pergaminho', description: 'Adiciona 3 jogos aos favoritos.', icon: 'heart', requirement_type: 'favorites', requirement_value: 3 },
  { slug: 'mestre-do-compasso', name: 'Mestre do Compasso', description: 'Conclui 3 jogos da biblioteca.', icon: 'trophy', requirement_type: 'completed', requirement_value: 3 },
];

export interface SeedEvent {
  slug: string;
  name: string;
  description: string;
  location: string;
  event_date: string;
}

// Sem eventos por agora; os anteriores estão no histórico do git.
export const events: SeedEvent[] = [];

export const ownerSetup: { factionSlug: string; baseExperiencePoints: number; condition: OwnershipCondition } = {
  factionSlug: 'arcanos',
  // Progresso histórico de Gabriel Maia (nível 7 — Cartógrafo Arcano).
  baseExperiencePoints: 1850,
  condition: 'good',
};
