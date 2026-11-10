import type { LibraryGame } from '@/types/domain';

/** A point on the map, in decimal degrees. */
export interface GeoPoint {
  lat: number;
  lng: number;
}

/** The community a shelf entry belongs to, as much of it as the games list needs. */
export interface ShelfCommunity {
  id: string;
  slug: string;
  name: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
}

/** One row of `community_games`: a game on one community's shelf. */
export interface ShelfEntry {
  community: ShelfCommunity;
  copies: number;
  gameId: string;
}

/** Where a game can be found: one community, its copies and how far it is from the viewer. */
export interface GameShelf {
  communityId: string;
  slug: string;
  name: string;
  city: string;
  copies: number;
  /** null when the viewer has no location or the community has no coordinates. */
  distanceKm: number | null;
  isMine: boolean;
}

export interface ShelfGame extends LibraryGame {
  shelves: GameShelf[];
  /** Distance to the closest community that has the game; null when none can be measured. */
  nearestKm: number | null;
}

export const RADIUS_OPTIONS_KM = [5, 10, 20, 50, 100] as const;
export const DEFAULT_RADIUS_KM = 20;

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two points (haversine), in kilometres. */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const communityPoint = (c: Pick<ShelfCommunity, 'latitude' | 'longitude'>): GeoPoint | null =>
  c.latitude === null || c.longitude === null ? null : { lat: Number(c.latitude), lng: Number(c.longitude) };

export interface ShelfScope {
  origin: GeoPoint | null;
  radiusKm: number;
  /** Communities the viewer is an active member of: always in scope, whatever the distance. */
  myCommunityIds: ReadonlySet<string>;
}

/**
 * Whether a community's shelf is in the viewer's games list: their own communities always are,
 * other communities only when both points are known and the community is within the radius.
 */
export function inScope(community: ShelfCommunity, scope: ShelfScope): { included: boolean; distanceKm: number | null } {
  const point = communityPoint(community);
  const d = scope.origin && point ? distanceKm(scope.origin, point) : null;
  const isMine = scope.myCommunityIds.has(community.id);
  return { included: isMine || (d !== null && d <= scope.radiusKm), distanceKm: d };
}

/**
 * Groups shelf entries into one card per game, keeping every in-scope community that has it,
 * closest first (unmeasurable distances last, then by name).
 */
export function groupShelves(entries: ShelfEntry[], games: Map<string, LibraryGame>, scope: ShelfScope): ShelfGame[] {
  const byGame = new Map<string, Map<string, GameShelf>>();
  for (const e of entries) {
    const game = games.get(e.gameId);
    if (!game) continue;
    const { included, distanceKm: d } = inScope(e.community, scope);
    if (!included) continue;
    const shelves = byGame.get(e.gameId) ?? new Map<string, GameShelf>();
    const existing = shelves.get(e.community.id);
    if (existing) existing.copies += e.copies;
    else
      shelves.set(e.community.id, {
        communityId: e.community.id,
        slug: e.community.slug,
        name: e.community.name,
        city: e.community.city,
        copies: e.copies,
        distanceKm: d,
        isMine: scope.myCommunityIds.has(e.community.id),
      });
    byGame.set(e.gameId, shelves);
  }

  return [...byGame.entries()].map(([gameId, shelves]) => {
    const list = [...shelves.values()].sort(compareShelves);
    const measured = list.map((s) => s.distanceKm).filter((d): d is number => d !== null);
    return { ...games.get(gameId)!, shelves: list, nearestKm: measured.length ? Math.min(...measured) : null };
  });
}

function compareShelves(a: GameShelf, b: GameShelf): number {
  if (a.distanceKm !== null && b.distanceKm !== null && a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
  if (a.distanceKm === null && b.distanceKm !== null) return 1;
  if (a.distanceKm !== null && b.distanceKm === null) return -1;
  return a.name.localeCompare(b.name);
}

export type GamesSort = 'title' | 'nearest' | 'bgg';

/** Sorts a copy of the list. Unknown values (no distance, no BGG rating) always go last; ties fall back to the title. */
/** Works on any game list; "nearest" only applies to games that carry a distance (shelf games). */
export function sortShelfGames<T extends LibraryGame & { nearestKm?: number | null }>(games: T[], sort: GamesSort, locale?: string): T[] {
  const byTitle = (a: T, b: T) => a.title.localeCompare(b.title, locale);
  const lastIfNull = (a: number | null, b: number | null, cmp: (x: number, y: number) => number) =>
    a === null && b === null ? 0 : a === null ? 1 : b === null ? -1 : cmp(a, b);
  return [...games].sort((a, b) => {
    const primary =
      sort === 'nearest' ? lastIfNull(a.nearestKm ?? null, b.nearestKm ?? null, (x, y) => x - y)
      : sort === 'bgg' ? lastIfNull(a.rating, b.rating, (x, y) => y - x)
      : 0;
    return primary || byTitle(a, b);
  });
}

/** Communities that appear on at least one card, for the community filter. */
export function shelfCommunities(games: ShelfGame[]): { id: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const g of games) for (const s of g.shelves) seen.set(s.communityId, s.name);
  return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

export interface CityOption {
  key: string;
  label: string;
  point: GeoPoint;
}

/** Fallback when the browser location is refused: cities that have communities, centred on their communities. */
export function cityOptions(communities: ShelfCommunity[]): CityOption[] {
  const groups = new Map<string, { label: string; points: GeoPoint[] }>();
  for (const c of communities) {
    const point = communityPoint(c);
    const label = c.city.trim();
    if (!point || !label) continue;
    const key = label.toLocaleLowerCase();
    const group = groups.get(key) ?? { label, points: [] };
    group.points.push(point);
    groups.set(key, group);
  }
  return [...groups.entries()]
    .map(([key, { label, points }]) => ({
      key,
      label,
      point: {
        lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
        lng: points.reduce((s, p) => s + p.lng, 0) / points.length,
      },
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export const formatKm = (km: number) => (km < 10 ? km.toFixed(1) : String(Math.round(km)));
