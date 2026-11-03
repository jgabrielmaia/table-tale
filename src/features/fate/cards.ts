import { CARD_ART, type CardArtKey } from '@/assets/cards';

export type FactionId = 'arcana' | 'elementals';

export interface Faction {
  id: FactionId;
  name: string;
  headline: string;
  motto: string;
  line: string;
  gradient: string;
}

export interface FateCardData {
  id: CardArtKey;
  faction: FactionId;
  numeral?: string;
  title: string;
  description: string;
  glow: string;
  image: string;
}

export const FACTIONS: Record<FactionId, Faction> = {
  arcana: {
    id: 'arcana',
    name: 'Arcana',
    headline: 'You belong to the Arcana',
    motto: 'Knowledge is Power.',
    line: 'Question the unknown. Understand the impossible. Shape what comes next.',
    gradient: 'linear-gradient(90deg, #00E5FF, #B026FF)',
  },
  elementals: {
    id: 'elementals',
    name: 'Elementals',
    headline: 'You belong to the Elementals',
    motto: 'Strength is Power.',
    line: 'Honor your foundations. Protect what matters. Stand strong against change.',
    gradient: 'linear-gradient(90deg, #6BFF65, #168CFF, #FF8A24, #DCE7F5)',
  },
};

const CYAN = '#00E5FF';
const PURPLE = '#B026FF';

export const FATE_CARDS: readonly FateCardData[] = [
  {
    id: 'magician', faction: 'arcana', numeral: 'I', title: 'The Magician', glow: CYAN, image: CARD_ART.magician,
    description: 'You turn a spark of will into reality. Every tool you need is already within reach.',
  },
  {
    id: 'high-priestess', faction: 'arcana', numeral: 'II', title: 'The High Priestess', glow: PURPLE, image: CARD_ART['high-priestess'],
    description: 'You keep what is left unspoken. You hear the silence between moves and see what others miss.',
  },
  {
    id: 'star', faction: 'arcana', numeral: 'XVII', title: 'The Star', glow: CYAN, image: CARD_ART.star,
    description: 'You are a light for the long night. When the table goes quiet, you show everyone the way forward.',
  },
  {
    id: 'world', faction: 'arcana', numeral: 'XXI', title: 'The World', glow: PURPLE, image: CARD_ART.world,
    description: 'You see the whole board. Every ending is a circle closing, and you know where the next chapter begins.',
  },
  {
    id: 'temperance', faction: 'arcana', numeral: 'XIV', title: 'Temperance', glow: CYAN, image: CARD_ART.temperance,
    description: 'You blend opposing forces into something new. Patience and balance are your craft.',
  },
  {
    id: 'earth', faction: 'elementals', title: 'Earth', glow: '#6BFF65', image: CARD_ART.earth,
    description: 'Steady and patient, you are the foundation every story is built upon.',
  },
  {
    id: 'water', faction: 'elementals', title: 'Water', glow: '#168CFF', image: CARD_ART.water,
    description: 'Deep and adaptable, you flow around any obstacle and outlast every wall.',
  },
  {
    id: 'fire', faction: 'elementals', title: 'Fire', glow: '#FF8A24', image: CARD_ART.fire,
    description: 'Warm, bold and impossible to ignore, you spark the moments the table remembers.',
  },
  {
    id: 'air', faction: 'elementals', title: 'Air', glow: '#DCE7F5', image: CARD_ART.air,
    description: 'Light and far-sighted, you carry ideas on the wind and rise above the noise.',
  },
];

export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}
