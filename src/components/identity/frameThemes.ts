import type { CardArtKey } from '@/assets/cards';

export type Ornament =
  | 'diamonds' | 'crescents' | 'rays' | 'orbit' | 'twin'
  | 'leaves' | 'waves' | 'flames' | 'wind';

export type MotionKind = 'spin' | 'pulse' | 'flicker' | 'flow' | 'drift' | 'sway';

export interface FrameTheme {
  /** Primary and secondary frame colours. */
  a: string;
  b: string;
  ornament: Ornament;
  motion: MotionKind;
}

/** One theme per card: same faction shares a palette family, never an identical frame. */
export const FRAME_THEMES: Record<CardArtKey, FrameTheme> = {
  magician: { a: '#00E5FF', b: '#B026FF', ornament: 'diamonds', motion: 'spin' },
  'high-priestess': { a: '#B026FF', b: '#00E5FF', ornament: 'crescents', motion: 'drift' },
  star: { a: '#7DF3FF', b: '#B026FF', ornament: 'rays', motion: 'spin' },
  world: { a: '#B026FF', b: '#00E5FF', ornament: 'orbit', motion: 'spin' },
  temperance: { a: '#00E5FF', b: '#9B6BFF', ornament: 'twin', motion: 'drift' },
  earth: { a: '#6BFF65', b: '#1F8F3A', ornament: 'leaves', motion: 'sway' },
  water: { a: '#168CFF', b: '#5FD0FF', ornament: 'waves', motion: 'flow' },
  fire: { a: '#FF8A24', b: '#FF3D0A', ornament: 'flames', motion: 'flicker' },
  air: { a: '#DCE7F5', b: '#8AA3C4', ornament: 'wind', motion: 'drift' },
};

/** Compact label for tiny frames; the full title stays available on hover/tap. */
export const compactTitle = (title: string) => title.replace(/^The\s+/i, '');
