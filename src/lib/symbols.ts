/** Thematic line icons drawn on a 48×48 grid (stroke only). Shared by the UI and the seed covers. */
export const SYMBOLS = {
  compass: '<circle cx="24" cy="24" r="18"/><path d="M24 8 L28 24 L24 40 L20 24 Z"/><path d="M6 24h4M38 24h4M24 4v2M24 42v2"/>',
  star: '<path d="M24 6 L28.5 19 L42 19 L31 27.5 L35 41 L24 33 L13 41 L17 27.5 L6 19 L19.5 19 Z"/>',
  shield: '<path d="M24 6 L39 11 V23 C39 32 32 39 24 42 C16 39 9 32 9 23 V11 Z"/><path d="M24 16 v14 M18 22 h12"/>',
  flame: '<path d="M24 42 C15 42 11 35 13 28 C15 21 21 19 20 10 C27 14 30 20 29 25 C31 23 32 21 32 18 C37 23 38 30 35 36 C33 40 29 42 24 42 Z"/><path d="M24 42 C20 42 19 37 21 34 C23 31 24 30 24 27 C28 30 29 34 28 37 C27 40 26 42 24 42 Z"/>',
  wave: '<path d="M6 18 C11 12 15 12 20 18 S29 24 34 18 S40 12 42 14"/><path d="M6 28 C11 22 15 22 20 28 S29 34 34 28 S40 22 42 24"/><path d="M6 38 C11 32 15 32 20 38 S29 44 34 38"/>',
  wind: '<path d="M6 18 H30 A5 5 0 1 0 25 13"/><path d="M6 26 H36 A5 5 0 1 1 31 31"/><path d="M6 34 H22"/>',
  mountain: '<path d="M4 40 L18 14 L26 28 L32 20 L44 40 Z"/><path d="M14 22 L18 26 L22 21"/>',
  roots: '<path d="M24 4 V22"/><path d="M14 10 C18 14 22 14 24 12 C26 14 30 14 34 10"/><path d="M24 22 C24 30 16 32 10 42 M24 22 C24 30 32 32 38 42 M24 22 V44 M24 30 C20 34 18 38 18 44 M24 30 C28 34 30 38 30 44"/>',
  atom: '<circle cx="24" cy="24" r="3"/><ellipse cx="24" cy="24" rx="19" ry="7.5"/><ellipse cx="24" cy="24" rx="19" ry="7.5" transform="rotate(60 24 24)"/><ellipse cx="24" cy="24" rx="19" ry="7.5" transform="rotate(-60 24 24)"/>',
  geometry: '<circle cx="24" cy="24" r="18"/><path d="M24 6 L39.6 33 H8.4 Z"/><circle cx="24" cy="24" r="6"/>',
  eye: '<path d="M4 24 C10 14 17 10 24 10 C31 10 38 14 44 24 C38 34 31 38 24 38 C17 38 10 34 4 24 Z"/><circle cx="24" cy="24" r="7"/><path d="M24 4 v3 M24 41 v3"/>',
  constellation: '<circle cx="10" cy="34" r="2.5"/><circle cx="20" cy="16" r="2.5"/><circle cx="32" cy="24" r="2.5"/><circle cx="40" cy="10" r="2.5"/><path d="M11.5 32 L18.8 18.2 M22.3 17.3 L29.8 22.7 M33.6 22 L38.6 12"/>',
  spark: '<path d="M24 4 L28 20 L44 24 L28 28 L24 44 L20 28 L4 24 L20 20 Z"/><circle cx="24" cy="24" r="4"/>',
  dice: '<rect x="9" y="9" width="30" height="30" rx="6"/><circle cx="17" cy="17" r="2"/><circle cx="24" cy="24" r="2"/><circle cx="31" cy="31" r="2"/>',
  book: '<path d="M8 10 C14 8 19 9 24 13 C29 9 34 8 40 10 V38 C34 36 29 37 24 41 C19 37 14 36 8 38 Z"/><path d="M24 13 V41"/>',
  crown: '<path d="M8 34 L10 14 L18 24 L24 10 L30 24 L38 14 L40 34 Z"/><path d="M8 40 H40"/>',
  scroll: '<path d="M14 8 H36 V34"/><path d="M14 8 A4 4 0 0 0 10 12 V36 A4 4 0 0 0 14 40 H34 A4 4 0 0 0 38 36 V34 H18 V36 A4 4 0 0 1 14 40"/><path d="M18 16 h12 M18 22 h12 M18 28 h8"/>',
  heart: '<path d="M24 40 C10 30 6 22 10 15 C14 9 21 10 24 16 C27 10 34 9 38 15 C42 22 38 30 24 40 Z"/>',
  trophy: '<path d="M15 8 H33 V18 A9 9 0 0 1 15 18 Z"/><path d="M15 12 H8 A6 6 0 0 0 15 22 M33 12 H40 A6 6 0 0 1 33 22"/><path d="M24 27 V34 M16 40 H32 L30 34 H18 Z"/>',
  music: '<path d="M18 36 V12 L38 8 V32"/><path d="M18 18 L38 14"/><circle cx="13" cy="36" r="5"/><circle cx="33" cy="32" r="5"/>',
  cards: '<rect x="7" y="12" width="20" height="28" rx="3" transform="rotate(-12 17 26)"/><rect x="21" y="8" width="20" height="28" rx="3" transform="rotate(10 31 22)"/><path d="M31 18 L34 22 L31 26 L28 22 Z"/>',
  palette: '<path d="M24 6 C13 6 6 14 6 23 C6 33 14 42 24 42 C27 42 28 40 27 37 C26 34 28 32 31 32 H35 C39 32 42 29 42 24 C42 14 34 6 24 6 Z"/><circle cx="15" cy="21" r="2.5"/><circle cx="21" cy="13" r="2.5"/><circle cx="30" cy="13" r="2.5"/><circle cx="36" cy="21" r="2.5"/>',
  key: '<circle cx="15" cy="24" r="8"/><path d="M23 24 H42 M36 24 V30 M30 24 V29"/>',
} as const;

export type SymbolName = keyof typeof SYMBOLS;

export function isSymbolName(value: string): value is SymbolName {
  return Object.prototype.hasOwnProperty.call(SYMBOLS, value);
}
