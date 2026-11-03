// Official Table Tale identity, extracted untouched from the supplied logo sheet. Never redraw, recolour or re-export.
import primaryIvory from './primary-ivory.png';
import primaryInk from './primary-ink.png';
import horizontalIvory from './horizontal-ivory.png';
import horizontalInk from './horizontal-ink.png';
import simplifiedIvory from './simplified-ivory.png';
import simplifiedInk from './simplified-ink.png';
import symbolIvory from './symbol-ivory.png';
import symbolInk from './symbol-ink.png';
import markIvory from './symbol-simple-ivory.png';
import markInk from './symbol-simple-ink.png';
import monogramIvory from './monogram-ivory.png';
import monogramInk from './monogram-ink.png';
import favicon from './favicon.png';

/**
 * - primary: wordmark with the central ornament (brand moments)
 * - horizontal: symbol followed by the wordmark (navigation, footer)
 * - simplified: stacked wordmark
 * - symbol: ornamental emblem (limited space)
 * - mark: simplified symbol
 * - monogram: stylised T
 * - favicon: emblem in its rounded square
 */
export type LogoVariant = 'primary' | 'horizontal' | 'simplified' | 'symbol' | 'mark' | 'monogram' | 'favicon';
/** ivory artwork for dark backgrounds, ink artwork for light backgrounds. */
export type LogoTone = 'ivory' | 'ink';

export interface LogoAsset {
  src: string;
  width: number;
  height: number;
}

const asset = (src: string, width: number, height: number): LogoAsset => ({ src, width, height });

export const LOGOS: Record<LogoVariant, Record<LogoTone, LogoAsset>> = {
  primary: { ivory: asset(primaryIvory, 881, 505), ink: asset(primaryInk, 881, 505) },
  horizontal: { ivory: asset(horizontalIvory, 559, 196), ink: asset(horizontalInk, 559, 196) },
  simplified: { ivory: asset(simplifiedIvory, 329, 273), ink: asset(simplifiedInk, 329, 273) },
  symbol: { ivory: asset(symbolIvory, 287, 367), ink: asset(symbolInk, 287, 367) },
  mark: { ivory: asset(markIvory, 175, 196), ink: asset(markInk, 175, 196) },
  monogram: { ivory: asset(monogramIvory, 155, 201), ink: asset(monogramInk, 155, 201) },
  favicon: { ivory: asset(favicon, 192, 192), ink: asset(favicon, 192, 192) },
};
