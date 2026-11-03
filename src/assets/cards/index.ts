// Original Table Tale card artwork, cropped 1:1 from the approved sheet. Never regenerate or edit.
import back from './card-back.png';
import magician from './arcana-magician.png';
import highPriestess from './arcana-high-priestess.png';
import star from './arcana-star.png';
import world from './arcana-world.png';
import temperance from './arcana-temperance.png';
import earth from './elemental-earth.png';
import water from './elemental-water.png';
import fire from './elemental-fire.png';
import air from './elemental-air.png';

export const CARD_BACK_ART = back;

export const CARD_ART = {
  magician,
  'high-priestess': highPriestess,
  star,
  world,
  temperance,
  earth,
  water,
  fire,
  air,
} as const;

export type CardArtKey = keyof typeof CARD_ART;

/** Native proportion of the supplied artwork (all ten files share it). */
export const CARD_ASPECT_RATIO = '282 / 440';
