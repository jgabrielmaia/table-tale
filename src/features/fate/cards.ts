import { CARD_ART, type CardArtKey } from '@/assets/cards';

export type FactionId = 'arcanos' | 'elementais';

export interface Faction {
  id: FactionId;
  name: string;
  headline: string;
  motto: string;
  line: string;
  gradient: string;
}

/** Editorial metadata only. Ids mirror `public.fate_cards`; assignment is always decided by the server. */
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
  arcanos: {
    id: 'arcanos',
    name: 'Arcanos',
    headline: 'You belong to the Arcanos',
    motto: 'Knowledge is Power.',
    line: 'A faction driven by curiosity, discovery, reason and transformation.',
    gradient: 'linear-gradient(90deg, #00E5FF, #B026FF)',
  },
  elementais: {
    id: 'elementais',
    name: 'Elementais',
    headline: 'You belong to the Elementais',
    motto: 'Strength is Power.',
    line: 'A faction rooted in resilience, protection, stability and the forces that sustain the world.',
    gradient: 'linear-gradient(90deg, #6BFF65, #168CFF, #FF8A24, #DCE7F5)',
  },
};

const CYAN = '#00E5FF';
const PURPLE = '#B026FF';

export const FATE_CARDS: readonly FateCardData[] = [
  {
    id: 'magician', faction: 'arcanos', numeral: 'I', title: 'The Magician', glow: CYAN, image: CARD_ART.magician,
    description: 'You turn a spark of will into reality. Every tool you need is already within reach.',
  },
  {
    id: 'high-priestess', faction: 'arcanos', numeral: 'II', title: 'The High Priestess', glow: PURPLE, image: CARD_ART['high-priestess'],
    description: 'You keep what is left unspoken. You hear the silence between moves and see what others miss.',
  },
  {
    id: 'star', faction: 'arcanos', numeral: 'XVII', title: 'The Star', glow: CYAN, image: CARD_ART.star,
    description: 'You are a light for the long night. When the table goes quiet, you show everyone the way forward.',
  },
  {
    id: 'world', faction: 'arcanos', numeral: 'XXI', title: 'The World', glow: PURPLE, image: CARD_ART.world,
    description: 'You see the whole board. Every ending is a circle closing, and you know where the next chapter begins.',
  },
  {
    id: 'temperance', faction: 'arcanos', numeral: 'XIV', title: 'Temperance', glow: CYAN, image: CARD_ART.temperance,
    description: 'You blend opposing forces into something new. Patience and balance are your craft.',
  },
  {
    id: 'earth', faction: 'elementais', title: 'Earth', glow: '#6BFF65', image: CARD_ART.earth,
    description: 'Steady and patient, you are the foundation every story is built upon.',
  },
  {
    id: 'water', faction: 'elementais', title: 'Water', glow: '#168CFF', image: CARD_ART.water,
    description: 'Deep and adaptable, you flow around any obstacle and outlast every wall.',
  },
  {
    id: 'fire', faction: 'elementais', title: 'Fire', glow: '#FF8A24', image: CARD_ART.fire,
    description: 'Warm, bold and impossible to ignore, you spark the moments the table remembers.',
  },
  {
    id: 'air', faction: 'elementais', title: 'Air', glow: '#DCE7F5', image: CARD_ART.air,
    description: 'Light and far-sighted, you carry ideas on the wind and rise above the noise.',
  },
];

export function getFateCard(id: string): FateCardData | undefined {
  return FATE_CARDS.find((c) => c.id === id);
}
