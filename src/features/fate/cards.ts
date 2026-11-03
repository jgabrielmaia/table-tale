import { CARD_ART, type CardArtKey } from '@/assets/cards';
import { getContent, t } from '@/i18n';

export type FactionId = 'arcanos' | 'elementais';

export interface Faction {
  id: FactionId;
  name: string;
  headline: string;
  motto: string;
  line: string;
  gradient: string;
}

/** Card metadata only. Ids mirror `public.fate_cards`; assignment is always decided by the server. */
export interface FateCardData {
  id: CardArtKey;
  faction: FactionId;
  numeral?: string;
  /** Exact title as printed on the artwork; identical in every language. */
  title: string;
  glow: string;
  image: string;
}

const GRADIENTS: Record<FactionId, string> = {
  arcanos: 'linear-gradient(90deg, #00E5FF, #B026FF)',
  elementais: 'linear-gradient(90deg, #6BFF65, #168CFF, #FF8A24, #DCE7F5)',
};

/** Faction copy in the current language. */
export function getFaction(id: FactionId): Faction {
  return {
    id,
    name: t(`faction.${id}`),
    headline: t(`faction.${id}.headline`),
    motto: t(`faction.${id}.motto`),
    line: t(`faction.${id}.line`),
    gradient: GRADIENTS[id],
  };
}

/** Short description of what a card means, in the current language. */
export const cardDescription = (id: CardArtKey) => getContent().cards[id];

/** What the card means within the Table Tale universe, in the current language. */
export const cardLore = (id: CardArtKey) => getContent().cardLore[id];

const CYAN = '#00E5FF';
const PURPLE = '#B026FF';

export const FATE_CARDS: readonly FateCardData[] = [
  { id: 'magician', faction: 'arcanos', numeral: 'I', title: 'The Magician', glow: CYAN, image: CARD_ART.magician },
  { id: 'high-priestess', faction: 'arcanos', numeral: 'II', title: 'The High Priestess', glow: PURPLE, image: CARD_ART['high-priestess'] },
  { id: 'star', faction: 'arcanos', numeral: 'XVII', title: 'The Star', glow: CYAN, image: CARD_ART.star },
  { id: 'world', faction: 'arcanos', numeral: 'XXI', title: 'The World', glow: PURPLE, image: CARD_ART.world },
  { id: 'temperance', faction: 'arcanos', numeral: 'XIV', title: 'Temperance', glow: CYAN, image: CARD_ART.temperance },
  { id: 'earth', faction: 'elementais', title: 'Earth', glow: '#6BFF65', image: CARD_ART.earth },
  { id: 'water', faction: 'elementais', title: 'Water', glow: '#168CFF', image: CARD_ART.water },
  { id: 'fire', faction: 'elementais', title: 'Fire', glow: '#FF8A24', image: CARD_ART.fire },
  { id: 'air', faction: 'elementais', title: 'Air', glow: '#DCE7F5', image: CARD_ART.air },
];

export function getFateCard(id: string): FateCardData | undefined {
  return FATE_CARDS.find((c) => c.id === id);
}
