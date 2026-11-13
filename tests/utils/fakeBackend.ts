import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { BrowserContext, Route } from '@playwright/test';
import { parseThings, slugify, toGameColumns } from '../../supabase/functions/_shared/bggParse';
import { AVATAR_URL, FAKE_SUPABASE_URL } from './constants';
import { fakeJwt, subjectOf } from './jwt';
import { PLAYER, SEASON, baseDb, type Db, type Row } from '../data/seed';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
  'access-control-expose-headers': '*',
};

// 1x1 transparent PNG, used for avatars and uploaded files.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

interface FakeUser {
  id: string;
  email: string;
  providers: string[];
  avatarUrl?: string;
}

interface Rule {
  match: RegExp;
  times?: number;
  abort?: boolean;
  response?: { status: number; body?: unknown };
  gate?: Promise<void>;
}

export interface RecordedRequest {
  method: string;
  path: string;
  search: string;
  body: unknown;
}

interface Result {
  status: number;
  body?: unknown;
}

/** The same recorded-shape XML the parser unit tests use, so the fake function runs the real parser and mapping. */
const BGG_ITEMS = parseThings(readFileSync(resolve(process.cwd(), 'supabase/functions/_shared/fixtures/thing.xml'), 'utf8'));

const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns']);

/**
 * In-memory stand-in for the Supabase project (Auth, PostgREST, Storage). It exists because the real project has no test
 * database or seed mechanism, and the suite must be deterministic and must never write to production data.
 * Each test gets its own instance, so state is never shared. It implements only what the app actually calls.
 */
export class FakeBackend {
  db: Db = baseDb();
  users: FakeUser[] = [{ id: PLAYER.id, email: PLAYER.email, providers: ['email'] }];
  requests: RecordedRequest[] = [];
  otpRequests: string[] = [];
  /** Providers reported as enabled by /auth/v1/settings. */
  providers: Record<string, boolean> = { google: true, github: true };
  /** When set, the OAuth provider "returns" this error to the callback page instead of a code. */
  oauthError: { code: string; description: string } | null = null;
  /** Card the Fate Draw will hand out. */
  nextCard: { id: string; faction: 'arcanos' | 'elementais' } = { id: 'temperance', faction: 'arcanos' };
  /** Cities the mocked `city-search` function knows (country as ISO code, like the real function). */
  cities: { name: string; country: string; latitude: number; longitude: number }[] = [
    { name: 'Coimbra', country: 'PT', latitude: 40.2111, longitude: -8.4292 },
    { name: 'Porto', country: 'PT', latitude: 41.1496, longitude: -8.6109 },
    { name: 'Portimão', country: 'PT', latitude: 37.1386, longitude: -8.5376 },
  ];
  private rules: Rule[] = [];

  // ---- test controls -------------------------------------------------------------------------------------------

  /** Fails matching requests ("METHOD /path?query"). `times` limits how many are affected. */
  fail(match: RegExp, response: { status: number; body?: unknown } | 'network', times?: number) {
    const rule: Rule = { match, times, ...(response === 'network' ? { abort: true } : { response }) };
    this.rules.push(rule);
    return () => { this.rules = this.rules.filter((r) => r !== rule); };
  }

  /** Holds matching requests until `release()` is called, to observe loading states and double submits. */
  hold(match: RegExp) {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const rule: Rule = { match, gate };
    this.rules.push(rule);
    return () => { release(); this.rules = this.rules.filter((r) => r !== rule); };
  }

  calls(match: RegExp) {
    return this.requests.filter((r) => match.test(`${r.method} ${r.path}${r.search}`));
  }

  profile(id = PLAYER.id): Row {
    return this.db.profiles.find((p) => p.id === id)!;
  }

  /** Creates a fully-formed past Fate Draw result for a user. */
  giveCard(userId = PLAYER.id, card = this.nextCard) {
    this.db.identities.push({ id: this.id('4000'), player_id: userId, season_id: SEASON.id, card_id: card.id, faction: card.faction, selected_at: '2026-11-03T10:00:00.000Z', is_active: true });
    this.syncFaction(userId);
    this.recompute(userId);
  }

  /**
   * Makes a user a member of a community, as if they had joined it earlier. New accounts belong to no community:
   * there is no automatic join any more (migration 20261112000004), so tests that need a member set it up here.
   */
  joinCommunity(slug: string, userId = PLAYER.id, partial: Row = {}) {
    const community = this.db.communities.find((c) => c.slug === slug)!;
    const row = { id: this.id('a100'), user_id: userId, community_id: community.id, role: 'member', status: 'active', joined_at: '2026-01-02T10:00:00.000Z', ...partial };
    this.db.memberships.push(row);
    return row;
  }

  addSession(userId: string, gameSlug: string, partial: Row = {}) {
    const game = this.db.games.find((g) => g.slug === gameSlug)!;
    const row = { id: this.id('3000'), game_id: game.id, user_id: userId, played_at: '2026-10-01', duration_minutes: null, players_count: null, rating: null, notes: null, created_at: new Date().toISOString(), ...partial };
    this.db.sessions.push(row);
    this.recompute(userId);
    return row;
  }

  // ---- wiring ----------------------------------------------------------------------------------------------------

  async install(context: BrowserContext) {
    await context.route(`${FAKE_SUPABASE_URL}/**`, (route) => this.handle(route));
    await context.route(AVATAR_URL, (route) => route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'image/png' }, body: PNG }));
    // External fonts are not part of what is tested and would make timing depend on the network.
    await context.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/, (route) => route.abort());
  }

  /** Mirrors the `city-search` Edge Function: sign-in required, 2-60 characters, contains-match, ISO country codes. */
  private citySearch(body: unknown, uid: string | null): Result {
    const query = String((body as { query?: unknown } | undefined)?.query ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!uid) return { status: 401, body: { error: { code: 'unauthenticated', message: 'Sign in to search cities' } } };
    if (query.length < 2 || query.length > 60) return { status: 400, body: { error: { code: 'bad_request', message: 'bad query' } } };
    const results = this.cities.filter((c) => c.name.toLowerCase().includes(query));
    return { status: 200, body: { results } };
  }

  private id(kind: string) {
    this.db.counter += 1;
    return `00000000-0000-4000-${kind}-${String(this.db.counter + 100).padStart(12, '0')}`;
  }

  private json(route: Route, { status, body }: Result, extra: Record<string, string> = {}) {
    return route.fulfill({
      status,
      headers: { ...CORS, ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...extra },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  private async handle(route: Route) {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const url = new URL(req.url());
    const raw = req.postData();
    let body: unknown = raw ?? undefined;
    try { body = raw ? JSON.parse(raw) : undefined; } catch { /* multipart uploads stay raw */ }
    this.requests.push({ method: req.method(), path: url.pathname, search: url.search, body });

    const key = `${req.method()} ${url.pathname}${url.search}`;
    for (const rule of this.rules) {
      if (!rule.match.test(key) || rule.times === 0) continue;
      if (rule.times !== undefined) rule.times -= 1;
      if (rule.gate) await rule.gate;
      if (rule.abort) return route.abort('failed');
      if (rule.response) return this.json(route, rule.response);
    }

    const uid = subjectOf(req.headers().authorization);
    const accept = req.headers().accept ?? '';
    const prefer = req.headers().prefer ?? '';
    if (url.pathname === '/functions/v1/bgg') return this.json(route, this.bggFunction(body, uid));
    if (url.pathname.startsWith('/rest/v1/')) {
      return this.json(route, this.rest(req.method(), url, body, uid, accept.includes('vnd.pgrst.object'), prefer.includes('return=representation')));
    }
    if (url.pathname === '/functions/v1/city-search') return this.json(route, this.citySearch(body, uid));
    if (url.pathname.startsWith('/auth/v1/')) return this.auth(route, req.method(), url, body, uid);
    if (url.pathname.startsWith('/storage/v1/')) {
      if (req.method() === 'POST') return this.json(route, { status: 200, body: { Key: url.pathname.replace('/storage/v1/object/', ''), Id: this.id('2000') } });
      return route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'image/png' }, body: PNG });
    }
    return this.json(route, { status: 404, body: { message: 'not found' } });
  }

  // ---- bgg Edge Function (search / preview / import), backed by recorded-shape fixtures ------------------------------

  private bggFunction(body: unknown, uid: string | null): Result {
    const error = (status: number, code: string): Result => ({ status, body: { error: { code, message: code } } });
    if (!uid) return error(401, 'unauthenticated');
    const { action, query, id } = (body ?? {}) as { action?: string; query?: string; id?: number };
    const known = (bggId: number) => this.db.games.find((g) => g.bgg_id === bggId);
    if (action === 'search') {
      const q = (query ?? '').trim().toLowerCase();
      if (q.length < 2) return error(400, 'bad_request');
      const results = BGG_ITEMS.filter((t) => t.name.toLowerCase().includes(q) || t.alternateNames.some((n) => n.toLowerCase().includes(q)))
        .map((t) => ({ id: t.id, name: t.name, yearPublished: t.yearPublished || null, type: t.type, gameSlug: known(t.id)?.slug ?? null }));
      return { status: 200, body: { results } };
    }
    const thing = BGG_ITEMS.find((t) => t.id === id);
    if (!thing) return error(404, 'not_found');
    if (action === 'preview') return { status: 200, body: { thing, gameSlug: known(thing.id)?.slug ?? null } };
    if (action === 'import') {
      const columns = toGameColumns(thing, '2026-11-06T12:00:00.000Z');
      const existing = known(thing.id);
      if (existing) return { status: 200, body: { game: Object.assign(existing, columns) } };
      const taken = this.db.games.some((g) => g.slug === slugify(thing.name, thing.id));
      const slug = taken ? `${slugify(thing.name, thing.id)}-${thing.id}` : slugify(thing.name, thing.id);
      const game = { id: this.id('8000'), slug, created_at: '2026-11-06T12:00:00.000Z', updated_at: '2026-11-06T12:00:00.000Z', ...columns };
      this.db.games.push(game);
      return { status: 201, body: { game } };
    }
    return error(400, 'bad_request');
  }

  // ---- auth ----------------------------------------------------------------------------------------------------

  private session(user: FakeUser, expiresIn = 3600) {
    const now = Math.floor(Date.now() / 1000);
    return {
      access_token: fakeJwt({ sub: user.id, role: 'authenticated', aud: 'authenticated', email: user.email, exp: now + expiresIn }),
      token_type: 'bearer',
      expires_in: expiresIn,
      expires_at: now + expiresIn,
      refresh_token: `refresh-${user.id}`,
      user: this.authUser(user),
    };
  }

  authUser(user: FakeUser) {
    const stamp = '2026-01-01T10:00:00.000Z';
    return {
      id: user.id, aud: 'authenticated', role: 'authenticated', email: user.email, email_confirmed_at: stamp,
      app_metadata: { provider: user.providers[0], providers: user.providers },
      user_metadata: user.avatarUrl ? { avatar_url: user.avatarUrl } : {},
      identities: user.providers.map((provider) => ({ id: `${user.id}-${provider}`, user_id: user.id, identity_data: user.avatarUrl ? { avatar_url: user.avatarUrl } : {}, provider, created_at: stamp, last_sign_in_at: stamp, updated_at: stamp })),
      created_at: stamp, updated_at: stamp,
    };
  }

  /** Session object to seed into localStorage so a test starts signed in. */
  sessionFor(userId = PLAYER.id, expiresIn = 3600) {
    return this.session(this.users.find((u) => u.id === userId)!, expiresIn);
  }

  private async auth(route: Route, method: string, url: URL, body: unknown, uid: string | null) {
    const path = url.pathname.replace('/auth/v1', '');
    const user = this.users.find((u) => u.id === uid) ?? this.users[0]!;

    if (path === '/settings') {
      return this.json(route, { status: 200, body: { external: { email: true, ...this.providers }, disable_signup: false, mailer_autoconfirm: false } });
    }
    if (path === '/authorize') {
      const target = new URL(url.searchParams.get('redirect_to') ?? `${url.origin}/`);
      const provider = url.searchParams.get('provider') ?? 'google';
      if (this.oauthError) {
        target.searchParams.set('error', this.oauthError.code);
        target.searchParams.set('error_code', this.oauthError.code);
        target.searchParams.set('error_description', this.oauthError.description);
      } else {
        target.searchParams.set('code', `e2e-code-${provider}`);
      }
      return route.fulfill({ status: 302, headers: { ...CORS, location: target.toString() } });
    }
    if (path === '/user/identities/authorize') {
      const target = new URL(url.searchParams.get('redirect_to') ?? `${url.origin}/`);
      target.searchParams.set('code', `e2e-link-${url.searchParams.get('provider') ?? 'github'}`);
      return this.json(route, { status: 200, body: { url: target.toString() } });
    }
    if (path === '/token') {
      const grant = url.searchParams.get('grant_type');
      if (grant === 'pkce') {
        const code = String((body as { auth_code?: string })?.auth_code ?? '');
        if (code === 'e2e-expired') return this.json(route, { status: 400, body: { code: 400, error_code: 'flow_state_not_found', msg: 'invalid flow state, no valid flow state found' } });
        const provider = /^e2e-(?:code|link)-(.+)$/.exec(code)?.[1];
        const signedIn = this.users[0]!;
        if (provider && !signedIn.providers.includes(provider)) signedIn.providers.push(provider);
        if (!provider && code !== 'e2e-magic') return this.json(route, { status: 400, body: { code: 400, error_code: 'bad_code_verifier', msg: 'invalid code' } });
        return this.json(route, { status: 200, body: this.session(signedIn) });
      }
      if (grant === 'refresh_token') {
        const token = String((body as { refresh_token?: string })?.refresh_token ?? '');
        const target = this.users.find((u) => `refresh-${u.id}` === token);
        if (!target) return this.json(route, { status: 400, body: { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token: Refresh Token Not Found' } });
        return this.json(route, { status: 200, body: this.session(target) });
      }
    }
    if (path === '/otp' && method === 'POST') {
      this.otpRequests.push(String((body as { email?: string })?.email ?? ''));
      return this.json(route, { status: 200, body: {} });
    }
    if (path === '/user') return this.json(route, { status: 200, body: this.authUser(user) });
    if (path === '/logout') return this.json(route, { status: 204 });
    return this.json(route, { status: 404, body: { msg: `unhandled auth route ${path}` } });
  }

  // ---- PostgREST -------------------------------------------------------------------------------------------------

  private filtered(rows: Row[], params: URLSearchParams) {
    let out = rows;
    for (const [key, value] of params) {
      if (RESERVED.has(key) || key.includes('.')) continue;
      const [op, ...rest] = value.split('.');
      const operand = rest.join('.');
      out = out.filter((r) => (op === 'eq' ? String(r[key]) === operand : op === 'neq' ? String(r[key]) !== operand : true));
    }
    const order = params.get('order');
    if (order) {
      const keys = order.split(',').map((o) => { const [col, dir] = o.split('.'); return { col: col!, desc: dir === 'desc' }; });
      out = [...out].sort((a, b) => {
        for (const { col, desc } of keys) {
          const cmp = String(a[col] ?? '').localeCompare(String(b[col] ?? ''), 'pt');
          if (cmp) return desc ? -cmp : cmp;
        }
        return 0;
      });
    }
    const limit = params.get('limit');
    return limit ? out.slice(0, Number(limit)) : out;
  }

  private rows(rows: Row[], single: boolean): Result {
    if (!single) return { status: 200, body: rows };
    if (rows.length === 1) return { status: 200, body: rows[0] };
    return { status: 406, body: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `The result contains ${rows.length} rows`, hint: null } };
  }

  private rest(method: string, url: URL, body: unknown, uid: string | null, single: boolean, representation: boolean): Result {
    const resource = url.pathname.replace('/rest/v1/', '');
    const params = url.searchParams;
    const select = params.get('select') ?? '*';
    const db = this.db;
    const done = (row: Row | Row[], created = false): Result => representation ? this.rows(Array.isArray(row) ? row : [row], single) : { status: created ? 201 : 204 };

    if (resource.startsWith('rpc/')) return this.rpc(resource.slice(4), uid, body);

    switch (resource) {
      case 'games': {
        const rows = this.filtered(db.games, params).map((g) => ({
          ...g,
          user_games: db.ownerships.filter((o) => o.game_id === g.id).map((o) => {
            const owner = db.profiles.find((p) => p.id === o.user_id);
            return { user_id: o.user_id, copy_number: o.copy_number, condition: o.condition, profiles: owner ? { id: owner.id, display_name: owner.display_name, avatar_url: owner.avatar_url } : null };
          }),
        }));
        return this.rows(rows, single);
      }
      case 'user_game_status': {
        if (method === 'GET') return this.rows(this.filtered(db.gameStatus.filter((s) => s.user_id === uid), params).map((s) => ({ game_id: s.game_id, status: s.status, is_favorite: s.is_favorite })), single);
        const input = body as Row;
        let row = db.gameStatus.find((s) => s.user_id === input.user_id && s.game_id === input.game_id);
        if (!row) { row = { user_id: input.user_id, game_id: input.game_id, status: 'unplayed', is_favorite: false }; db.gameStatus.push(row); }
        Object.assign(row, input);
        this.recompute(input.user_id);
        return done({ game_id: row.game_id, status: row.status, is_favorite: row.is_favorite }, true);
      }
      case 'game_sessions': {
        if (method === 'GET') {
          const rows = this.filtered(db.sessions.filter((s) => s.user_id === uid), params).map((s) => (select.includes('games(') ? { ...s, games: this.gameBrief(s.game_id) } : s));
          return this.rows(rows, single);
        }
        if (method === 'POST') {
          const input = body as Row;
          const row = { id: this.id('3000'), created_at: new Date().toISOString(), ...input };
          db.sessions.push(row);
          this.recompute(input.user_id);
          return done(row, true);
        }
        if (method === 'DELETE') {
          const gone = this.filtered(db.sessions, params);
          db.sessions = db.sessions.filter((s) => !gone.includes(s));
          if (gone[0]) this.recompute(gone[0].user_id);
          return { status: 204 };
        }
        break;
      }
      case 'profiles': {
        if (method === 'GET') return this.rows(this.filtered(db.profiles, params), single);
        if (method === 'PATCH') {
          for (const row of this.filtered(db.profiles, params)) Object.assign(row, body, { updated_at: new Date().toISOString() });
          return { status: 204 };
        }
        break;
      }
      case 'seasons': return this.rows(this.filtered(db.seasons, params), single);
      case 'player_card_identities':
        // Card identities are public (RLS "card identities are public"); the app filters by player_id.
        return this.rows(this.filtered(db.identities, params).map((i) => ({ ...i, seasons: db.seasons.find((s) => s.id === i.season_id) ?? null })), single);
      case 'active_player_identities':
        return this.rows(db.identities.filter((i) => i.is_active && db.seasons.find((s) => s.id === i.season_id)?.is_active).map((i) => ({ player_id: i.player_id, season_id: i.season_id, card_id: i.card_id, faction: i.faction, selected_at: i.selected_at })), single);
      case 'factions': return this.rows(this.filtered(db.factions, params), single);
      case 'arcanas':
      case 'elementals':
      case 'arcana_elemental_links': return this.rows([], single);
      case 'events': return this.rows(this.filtered(db.events, params), single);
      case 'event_participants': {
        if (method === 'GET') {
          const mine = this.filtered(db.participants.filter((p) => p.user_id === uid), params);
          return this.rows(select.includes('events(') ? mine.map((p) => ({ ...p, events: db.events.find((e) => e.id === p.event_id) })) : mine.map((p) => ({ event_id: p.event_id })), single);
        }
        if (method === 'POST') {
          const input = body as Row;
          if (!db.participants.some((p) => p.user_id === input.user_id && p.event_id === input.event_id)) db.participants.push({ id: this.id('1000'), joined_at: new Date().toISOString(), ...input });
          this.recompute(input.user_id);
          return { status: 201 };
        }
        if (method === 'DELETE') {
          const gone = this.filtered(db.participants, params);
          db.participants = db.participants.filter((p) => !gone.includes(p));
          if (gone[0]) this.recompute(gone[0].user_id);
          return { status: 204 };
        }
        break;
      }
      case 'communities': return this.communities(method, params, body, uid, single, select, representation);
      case 'community_memberships': return this.memberships(method, params, body, uid, single, select, representation);
      case 'community_games': {
        if (method === 'GET') {
          const rows = this.filtered(db.communityGames.filter((g) => this.canSeeShelf(g.community_id, uid)), params).map((g) => ({
            ...g,
            ...(select.includes('community_game_copies(') ? { community_game_copies: this.copiesFor(g).map((k) => this.withOwner(k)) } : {}),
            games: db.games.find((x) => x.id === g.game_id) ?? null,
            // The games list embeds the community with its location: `communities(id,slug,name,city,latitude,longitude)`.
            ...(select.includes('communities(') ? { communities: db.communities.find((c) => c.id === g.community_id) ?? null } : {}),
          }));
          return this.rows(rows, single);
        }
        if (method === 'POST') {
          const input = body as Row;
          if (!this.hasRole(input.community_id, uid, ['owner', 'admin', 'moderator'])) return this.forbidden();
          if (db.communityGames.some((g) => g.community_id === input.community_id && g.game_id === input.game_id)) return this.duplicate();
          const entry = { id: this.id('a200'), notes: null, condition: 'good', copies: 1, added_at: new Date().toISOString(), ...input };
          db.communityGames.push(entry);
          this.copiesFor(entry); // trigger community_games_first_copies
          return { status: 201 };
        }
        if (method === 'PATCH') {
          // Column grant: only condition and notes; the count follows community_game_copies.
          if ('copies' in (body as Row)) return { status: 401, body: { code: '42501', message: 'permission denied for table community_games', details: null, hint: null } };
          const targets = this.filtered(db.communityGames, params);
          if (targets.some((g) => !this.hasRole(g.community_id, uid, ['owner', 'admin', 'moderator']))) return this.forbidden();
          for (const g of targets) Object.assign(g, body);
          return { status: 204 };
        }
        if (method === 'DELETE') {
          const gone = this.filtered(db.communityGames, params);
          if (gone.some((g) => !this.hasRole(g.community_id, uid, ['owner', 'admin', 'moderator']))) return this.forbidden();
          db.communityGames = db.communityGames.filter((g) => !gone.includes(g));
          db.communityGameCopies = db.communityGameCopies.filter((k) => !gone.some((g) => g.id === k.community_game_id));
          return { status: 204 };
        }
        break;
      }
      case 'community_game_copies': return this.copies(method, params, body, uid);
      case 'user_games': {
        if (method === 'GET') {
          const rows = this.filtered(db.ownerships.filter((o) => o.user_id === uid), params).map((o) => ({ ...o, games: db.games.find((x) => x.id === o.game_id) ?? null }));
          return this.rows(rows, single);
        }
        if (method === 'POST') {
          const input = body as Row;
          if (input.user_id !== uid) return this.forbidden();
          db.ownerships.push({ condition: 'good', ...input });
          return { status: 201 };
        }
        if (method === 'DELETE') {
          const gone = this.filtered(db.ownerships.filter((o) => o.user_id === uid), params);
          db.ownerships = db.ownerships.filter((o) => !gone.includes(o));
          return { status: 204 };
        }
        break;
      }
      case 'achievements': return this.rows(this.filtered(db.achievements, params), single);
      case 'user_achievements': {
        const mine = this.filtered(db.userAchievements.filter((a) => a.user_id === uid), params);
        return this.rows(select.includes('achievements(') ? mine.map((a) => ({ ...a, achievements: db.achievements.find((x) => x.id === a.achievement_id) })) : mine, single);
      }
    }
    return { status: 404, body: { code: 'PGRST205', message: `Unhandled resource ${method} ${resource}`, details: null, hint: null } };
  }

  // ---- communities (mirrors the RLS policies and tg_guard_membership) ------------------------------------------------

  /** Copies of a shelf entry, created on first use from its count (as the migration backfill and first-copies trigger do). */
  private copiesFor(entry: Row): Row[] {
    const db = this.db;
    let rows = db.communityGameCopies.filter((k) => k.community_game_id === entry.id);
    if (!rows.length) {
      rows = Array.from({ length: Number(entry.copies) || 1 }, () => ({
        id: this.id('a300'), community_game_id: entry.id, community_id: entry.community_id, owner_id: entry.added_by ?? null, added_at: entry.added_at,
      }));
      db.communityGameCopies.push(...rows);
    }
    return rows;
  }

  private withOwner(copy: Row): Row {
    const p = this.db.profiles.find((x) => x.id === copy.owner_id);
    return { ...copy, profiles: p ? { id: p.id, display_name: p.display_name } : null };
  }

  private copies(method: string, params: URLSearchParams, body: unknown, uid: string | null): Result {
    const db = this.db;
    const managers = ['owner', 'admin', 'moderator'];
    const sync = (entryId: unknown) => {
      const entry = db.communityGames.find((g) => g.id === entryId);
      if (entry) entry.copies = db.communityGameCopies.filter((k) => k.community_game_id === entryId).length;
    };
    const ownerOk = (communityId: unknown, ownerId: unknown) =>
      ownerId == null || db.memberships.some((m) => m.community_id === communityId && m.user_id === ownerId && m.status === 'active');
    if (method === 'POST') {
      const input = body as Row;
      const entry = db.communityGames.find((g) => g.id === input.community_game_id);
      if (!entry) return { status: 409, body: { code: '23503', message: 'unknown community game', details: null, hint: null } };
      this.copiesFor(entry);
      if (!this.hasRole(entry.community_id, uid, managers) || !ownerOk(entry.community_id, input.owner_id)) return this.forbidden();
      db.communityGameCopies.push({ id: this.id('a300'), added_at: new Date().toISOString(), owner_id: null, ...input, community_id: entry.community_id });
      sync(entry.id);
      return { status: 201 };
    }
    const targets = this.filtered(db.communityGameCopies, params);
    if (targets.some((k) => !this.hasRole(k.community_id, uid, managers))) return this.forbidden();
    if (method === 'PATCH') {
      const patch = body as Row;
      if (targets.some((k) => !ownerOk(k.community_id, patch.owner_id))) return this.forbidden();
      for (const k of targets) k.owner_id = patch.owner_id ?? null;
      return { status: 204 };
    }
    if (method === 'DELETE') {
      for (const k of targets) {
        if (db.communityGameCopies.filter((x) => x.community_game_id === k.community_game_id).length <= 1) {
          return { status: 400, body: { code: '23514', message: 'a game on a community shelf keeps at least one copy; remove the game instead', details: null, hint: null } };
        }
        db.communityGameCopies = db.communityGameCopies.filter((x) => x !== k);
        sync(k.community_game_id);
      }
      return { status: 204 };
    }
    return this.forbidden();
  }

  private static RANK: Record<string, number> = { owner: 4, admin: 3, moderator: 2, member: 1 };

  /** What PostgREST answers anon for a table it has no grant on (as community_memberships in production). */
  private noGrant(table: string): Result {
    return { status: 401, body: { code: '42501', message: `permission denied for table ${table}`, details: null, hint: null } };
  }

  private forbidden(): Result {
    return { status: 403, body: { code: '42501', message: 'new row violates row-level security policy', details: null, hint: null } };
  }

  private duplicate(): Result {
    return { status: 409, body: { code: '23505', message: 'duplicate key value violates unique constraint', details: null, hint: null } };
  }

  private roleOf(communityId: string, uid: string | null): string | null {
    return this.db.memberships.find((m) => m.community_id === communityId && m.user_id === uid && m.status === 'active')?.role ?? null;
  }

  private hasRole(communityId: string, uid: string | null, roles: string[]) {
    const role = this.roleOf(communityId, uid);
    return role !== null && roles.includes(role);
  }

  private canReadCommunity(communityId: string, uid: string | null) {
    const c = this.db.communities.find((x) => x.id === communityId);
    return Boolean(c) && (c!.visibility === 'public' || this.roleOf(communityId, uid) !== null);
  }

  /** can_see_community_shelf(): members always; others only on a public community with a public shelf. */
  private canSeeShelf(communityId: string, uid: string | null) {
    const c = this.db.communities.find((x) => x.id === communityId);
    return Boolean(c) && ((c!.visibility === 'public' && (c!.shelf_visibility ?? 'public') === 'public') || this.roleOf(communityId, uid) !== null);
  }

  private communities(method: string, params: URLSearchParams, body: unknown, uid: string | null, single: boolean, select: string, representation: boolean): Result {
    const db = this.db;
    if (method === 'GET') {
      // anon has no grant on community_memberships: embedding it fails for the whole request, like PostgREST does.
      if (!uid && select.includes('community_memberships')) return this.noGrant('community_memberships');
      const visible = db.communities.filter(
        (c) => c.visibility === 'public' || c.created_by === uid || db.memberships.some((m) => m.community_id === c.id && m.user_id === uid),
      );
      // Computed field public.member_count(communities): active members only, for anon too (rows are already visible).
      const rows = this.filtered(visible, params).map((c) =>
        /\bmember_count\b/.test(select)
          ? { ...c, member_count: db.memberships.filter((m) => m.community_id === c.id && m.status === 'active').length }
          : c,
      );
      return this.rows(rows, single);
    }
    if (method === 'POST') {
      const input = body as Row;
      if (input.created_by !== uid) return this.forbidden();
      if (db.communities.some((c) => c.slug === input.slug)) return this.duplicate();
      const now = new Date().toISOString();
      const row = { id: this.id('a000'), created_at: now, updated_at: now, ...input };
      db.communities.push(row);
      db.memberships.push({ id: this.id('a100'), user_id: uid, community_id: row.id, role: 'owner', status: 'active', joined_at: now });
      this.recompute(uid!); // trigger community_memberships_progress: owning a community unlocks an achievement
      return representation ? this.rows([row], single) : { status: 201 };
    }
    const targets = this.filtered(db.communities, params);
    if (method === 'PATCH') {
      if (targets.some((c) => !this.hasRole(c.id, uid, ['owner', 'admin']))) return this.forbidden();
      for (const c of targets) Object.assign(c, body, { updated_at: new Date().toISOString() });
      return { status: 204 };
    }
    if (method === 'DELETE') {
      if (targets.some((c) => !this.hasRole(c.id, uid, ['owner']))) return this.forbidden();
      const ids = new Set(targets.map((c) => c.id));
      db.communities = db.communities.filter((c) => !ids.has(c.id));
      db.memberships = db.memberships.filter((m) => !ids.has(m.community_id));
      db.communityGames = db.communityGames.filter((g) => !ids.has(g.community_id));
      return { status: 204 };
    }
    return this.forbidden();
  }

  private memberships(method: string, params: URLSearchParams, body: unknown, uid: string | null, single: boolean, select: string, representation: boolean): Result {
    const db = this.db;
    const rank = (r: string) => FakeBackend.RANK[r] ?? 0;
    const managers = ['owner', 'admin', 'moderator'];
    if (!uid) return this.noGrant('community_memberships');
    if (method === 'GET') {
      const readable = db.memberships.filter(
        (m) => m.user_id === uid
          || this.hasRole(m.community_id, uid, managers)
          || (m.status === 'active' && this.canReadCommunity(m.community_id, uid)),
      );
      const rows = this.filtered(readable, params).map((m) => {
        if (!select.includes('profiles(')) return m;
        const p = db.profiles.find((x) => x.id === m.user_id);
        return { ...m, profiles: p ? { id: p.id, display_name: p.display_name, avatar_url: p.avatar_url } : null };
      });
      return this.rows(rows, single);
    }
    if (method === 'POST') {
      const input = body as Row;
      const community = db.communities.find((c) => c.id === input.community_id);
      if (!community || input.user_id !== uid || input.role !== 'member') return this.forbidden();
      if (db.memberships.some((m) => m.user_id === uid && m.community_id === community.id)) return this.duplicate();
      const isPublic = community.visibility === 'public';
      if (!((input.status === 'active' && isPublic) || (input.status === 'pending' && !isPublic))) return this.forbidden();
      const row = { id: this.id('a100'), joined_at: new Date().toISOString(), ...input };
      db.memberships.push(row);
      return representation ? this.rows([row], single) : { status: 201 };
    }
    const targets = this.filtered(db.memberships, params);
    const actorRank = (communityId: string) => rank(this.roleOf(communityId, uid) ?? '');
    if (method === 'PATCH') {
      const patch = body as Row;
      for (const t of targets) {
        const mine = actorRank(t.community_id);
        const bad = mine < rank('moderator') || t.user_id === uid || rank(t.role) >= mine
          || (patch.role !== undefined && patch.role !== t.role && (mine < rank('admin') || rank(patch.role) >= mine));
        if (bad) return this.forbidden();
      }
      for (const t of targets) Object.assign(t, patch);
      return { status: 204 };
    }
    if (method === 'DELETE') {
      for (const t of targets) {
        if (t.user_id === uid) {
          if (t.status === 'suspended') return this.forbidden();
          const others = db.memberships.some((m) => m.community_id === t.community_id && m.id !== t.id && m.role === 'owner' && m.status === 'active');
          if (t.role === 'owner' && t.status === 'active' && !others) {
            return { status: 400, body: { code: '23514', message: 'last_owner: transfer ownership before leaving', details: null, hint: null } };
          }
        } else if (actorRank(t.community_id) < rank('moderator') || rank(t.role) >= actorRank(t.community_id)) {
          return this.forbidden();
        }
      }
      db.memberships = db.memberships.filter((m) => !targets.includes(m));
      return { status: 204 };
    }
    return this.forbidden();
  }

  private gameBrief(gameId: string) {
    const g = this.db.games.find((x) => x.id === gameId);
    return g ? { title: g.title, slug: g.slug } : null;
  }

  private rpc(name: string, uid: string | null, body?: unknown): Result {
    const db = this.db;
    if (!uid) return { status: 401, body: { code: '28000', message: 'not authenticated', details: null, hint: null } };
    if (name === 'my_profile_stats') {
      const m = this.metrics(uid);
      return { status: 200, body: [{ ...m, achievements: db.userAchievements.filter((a) => a.user_id === uid).length }] };
    }
    if (name === 'draw_fate_card') {
      const season = db.seasons.find((s) => s.is_active);
      if (!season) return { status: 400, body: { code: 'P0001', message: 'no active season', details: null, hint: 'no_active_season' } };
      let row = db.identities.find((i) => i.player_id === uid && i.season_id === season.id);
      const already = Boolean(row);
      if (!row) {
        row = { id: this.id('4000'), player_id: uid, season_id: season.id, card_id: this.nextCard.id, faction: this.nextCard.faction, selected_at: new Date().toISOString(), is_active: true };
        db.identities.push(row);
        this.syncFaction(uid);
        this.recompute(uid);
      }
      return { status: 200, body: [{ r_season_id: row.season_id, r_card_id: row.card_id, r_faction: row.faction, r_selected_at: row.selected_at, r_is_active: row.is_active, r_already_drawn: already }] };
    }
    if (name === 'transfer_community_ownership') {
      const { p_community, p_new_owner } = (body ?? {}) as { p_community: string; p_new_owner: string };
      const me = db.memberships.find((m) => m.community_id === p_community && m.user_id === uid && m.role === 'owner' && m.status === 'active');
      const target = db.memberships.find((m) => m.community_id === p_community && m.user_id === p_new_owner && m.status === 'active');
      if (!me || !target || p_new_owner === uid) return this.forbidden();
      target.role = 'owner';
      me.role = 'admin';
      this.recompute(p_new_owner); // trigger community_memberships_progress
      return { status: 204 };
    }
    if (name === 'dev_reset_my_card') {
      db.identities = db.identities.filter((i) => i.player_id !== uid);
      return { status: 204 };
    }
    return { status: 404, body: { code: 'PGRST202', message: `Unhandled rpc ${name}`, details: null, hint: null } };
  }

  // ---- server-side rules the app relies on (mirrors the SQL functions) ---------------------------------------------

  private syncFaction(userId: string) {
    const identity = this.db.identities.find((i) => i.player_id === userId && i.is_active);
    const faction = this.db.factions.find((f) => f.slug === identity?.faction);
    if (identity && faction) this.profile(userId).faction_id = faction.id;
  }

  private metrics(userId: string) {
    const { sessions, gameStatus, participants, games } = this.db;
    const mySessions = sessions.filter((s) => s.user_id === userId);
    const myStatus = gameStatus.filter((s) => s.user_id === userId);
    const played = new Set([...mySessions.map((s) => s.game_id), ...myStatus.filter((s) => s.status !== 'unplayed').map((s) => s.game_id)]);
    const genres = new Set(mySessions.flatMap((s) => games.find((g) => g.id === s.game_id)?.categories ?? []));
    return {
      sessions: mySessions.length,
      games_played: played.size,
      completed: myStatus.filter((s) => s.status === 'completed').length,
      favorites: myStatus.filter((s) => s.is_favorite).length,
      events: participants.filter((p) => p.user_id === userId).length,
      genres: genres.size,
      minutes: mySessions.reduce((sum, s) => sum + (s.duration_minutes ?? games.find((g) => g.id === s.game_id)?.duration_minutes ?? 0), 0),
    };
  }

  /** Mirrors public.recompute_progress(): unlock achievements, then xp = sessions*40 + completed*60 + events*50 + unlocked*25. */
  recompute(userId: string) {
    const db = this.db;
    const m = this.metrics(userId);
    const fateCount = db.identities.filter((i) => i.player_id === userId).length;
    const owned = db.memberships.filter((x) => x.user_id === userId && x.role === 'owner' && x.status === 'active').length;
    const value: Record<string, number> = { sessions: m.sessions, games_played: m.games_played, completed: m.completed, favorites: m.favorites, events: m.events, genres: m.genres, fate_draw: fateCount, community_owner: owned };
    for (const a of db.achievements) {
      const done = (value[a.requirement_type] ?? 0) >= a.requirement_value;
      const has = db.userAchievements.some((u) => u.user_id === userId && u.achievement_id === a.id);
      if (done && !has) db.userAchievements.push({ id: this.id('0100'), user_id: userId, achievement_id: a.id, unlocked_at: new Date().toISOString() });
    }
    const unlocked = db.userAchievements.filter((u) => u.user_id === userId).length;
    const xp = m.sessions * 40 + m.completed * 60 + m.events * 50 + unlocked * 25;
    Object.assign(this.profile(userId), { experience_points: xp, level: Math.floor(xp / 300) + 1 });
  }
}
