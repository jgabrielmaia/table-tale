import type { MessageKey } from '@/i18n';

export interface NavItem {
  to: string;
  labelKey: MessageKey;
  shortKey: MessageKey;
  symbol: string;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/profile', labelKey: 'nav.profile', shortKey: 'nav.profile', symbol: 'compass' },
  { to: '/library', labelKey: 'nav.library', shortKey: 'nav.library', symbol: 'book' },
  { to: '/lore', labelKey: 'nav.lore', shortKey: 'nav.loreShort', symbol: 'atom' },
  { to: '/events', labelKey: 'nav.events', shortKey: 'nav.events', symbol: 'shield' },
  { to: '/communities', labelKey: 'nav.communities', shortKey: 'nav.communities', symbol: 'constellation' },
];
