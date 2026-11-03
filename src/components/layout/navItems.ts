export interface NavItem {
  to: string;
  label: string;
  symbol: string;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/library', label: 'Biblioteca', symbol: 'book' },
  { to: '/lore', label: 'Arcanos & Elementais', symbol: 'atom' },
  { to: '/events', label: 'Eventos', symbol: 'shield' },
  { to: '/profile', label: 'Perfil', symbol: 'compass' },
];
