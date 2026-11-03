(function () {
  'use strict';

  const D = window.TT_DATA;
  const STORE_KEY = 'tabletale:v4';
  const XP_PER_LEVEL = 300;
  const STATUS = { 'por-jogar': 'Por jogar', 'em-progresso': 'Em progresso', 'concluido': 'Concluído' };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const main = document.getElementById('main');
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const gameMeta = Object.fromEntries(D.games.map((g) => [g.id, g]));
  const factionById = Object.fromEntries(D.factions.map((f) => [f.id, f]));
  const toneOf = (g) => D.tones[g.tone] || D.tones.petrol;

  /* ---------- Ícones ---------- */
  const UI = {
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.6.8 2.7 2.5 3 5.2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    heart: '<path d="M12 20s-7.5-4.6-8.8-9.4C2.4 7.5 4.4 5 7.3 5c2 0 3.4 1.2 4.7 3 1.3-1.8 2.7-3 4.7-3 2.9 0 4.9 2.5 4.1 5.6C19.5 15.4 12 20 12 20z"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    pin: '<path d="M12 21s-6.5-6.2-6.5-11A6.5 6.5 0 0 1 12 3.5 6.5 6.5 0 0 1 18.5 10c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.2 4.2-6.5 8-6.5s7 2.3 8 6.5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5L12 13l8.5-6.5"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
    sparkle: '<path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z"/><path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
    reset: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>'
  };
  const ui = (name, cls) => `<svg class="ui-icon ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${UI[name]}</g></svg>`;
  const sym = (name, cls) => `<svg class="sym ${cls || ''}" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${D.symbols[name]}</g></svg>`;

  const CASTLE = 'M0 200V150H40V120L50 100L60 120V150H90V110H96V96L104 70L112 96V110H118V150H150V130L160 115L170 130V150H200V90H206V70L216 30L226 70V90H232V150H260V120H268V105L276 85L284 105V120H292V150H330V100H336V80L346 45L356 80V100H362V150H400V130L410 112L420 130V150H460V115H466V100L474 78L482 100V115H488V150H530V135L540 120L550 135V150H600V200Z';

  const EMBLEM_INNER = `<circle cx="32" cy="32" r="20" fill="none" stroke="url(#tt-gold)" stroke-width="2.4"/>
    <path d="M32 2 L36.5 27.5 L62 32 L36.5 36.5 L32 62 L27.5 36.5 L2 32 L27.5 27.5 Z" fill="url(#tt-gold)"/>
    <path d="M32 17 C30 26 26 30 17 32 C26 34 30 38 32 47 C34 38 38 34 47 32 C38 30 34 26 32 17 Z" fill="#0B1E2D"/>
    <path d="M32 23 L35 32 L32 41 L29 32 Z" fill="url(#tt-core)"/>`;
  const emblem = (cls) => `<svg class="emblem ${cls || ''}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${EMBLEM_INNER}</svg>`;

  // Silhueta de castelo, janelas acesas e brasas a subir — o "cenário" do guia de marca
  function scenery() {
    let embers = '';
    for (let i = 0; i < 16; i++) {
      embers += `<span style="--x:${(i * 61) % 100}%;--d:${6 + (i % 5) * 1.6}s;--delay:${-(i * 1.3) % 9}s;--s:${2 + (i % 3)}px"></span>`;
    }
    return `<div class="scenery" aria-hidden="true">
      <div class="embers">${embers}</div>
      <svg class="castle" viewBox="0 0 600 200" preserveAspectRatio="xMaxYMax meet"><path d="${CASTLE}"/>
        <g class="castle-lights"><rect x="214" y="62" width="4" height="7" rx="2"/><rect x="344" y="78" width="4" height="7" rx="2"/><rect x="102" y="98" width="3" height="6" rx="1.5"/><rect x="274" y="108" width="3" height="6" rx="1.5"/><rect x="472" y="104" width="3" height="6" rx="1.5"/><rect x="300" y="132" width="4" height="8" rx="2"/></g></svg>
    </div>`;
  }

  /* ---------- Estado ---------- */
  function freshState() {
    const games = {};
    D.games.forEach((g) => {
      games[g.id] = { status: g.status, favorite: !!g.favorite, sessions: g.sessions.map((s) => Object.assign({}, s)) };
    });
    const events = {};
    D.events.forEach((e) => { events[e.id] = !!e.attended; });
    return { games, events, profile: Object.assign({}, D.profile), user: null };
  }

  function load() {
    const base = freshState();
    try {
      const stored = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (stored && stored.games && stored.profile) {
        Object.keys(base.games).forEach((id) => { if (stored.games[id]) base.games[id] = stored.games[id]; });
        Object.assign(base.events, stored.events || {});
        Object.assign(base.profile, stored.profile);
        base.user = stored.user || null;
      }
    } catch (e) { /* dados corrompidos: usa o estado inicial */ }
    return base;
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* armazenamento indisponível */ }
  }

  let state = load();
  const filters = { q: '', genre: '', players: '', duration: '', status: '', fav: false };
  let libraryLoaded = false;
  let lastProfileStats = null;
  let firstRender = true;

  const game = (id) => (gameMeta[id] ? Object.assign({}, gameMeta[id], state.games[id]) : null);
  const allGames = () => D.games.map((g) => game(g.id));

  function computeStats() {
    const games = allGames();
    const sessions = [];
    games.forEach((g) => g.sessions.forEach((s) => sessions.push(Object.assign({ game: g }, s))));
    sessions.sort((a, b) => b.date.localeCompare(a.date));
    const completed = games.filter((g) => g.status === 'concluido').length;
    const ctx = {
      sessions: sessions.length,
      played: games.filter((g) => g.sessions.length || g.status === 'concluido').length,
      completed,
      favorites: games.filter((g) => g.favorite).length,
      events: D.events.filter((e) => state.events[e.id]).length,
      genres: new Set(sessions.map((s) => s.game.genre)).size
    };
    const achievements = D.achievements.map((a) => Object.assign({}, a, { value: Math.min(ctx[a.metric], a.goal), unlocked: ctx[a.metric] >= a.goal }));
    const unlocked = achievements.filter((a) => a.unlocked).length;
    const minutes = sessions.reduce((sum, s) => sum + s.game.duration, 0);
    const xp = state.profile.baseXp + ctx.sessions * 40 + completed * 60 + ctx.events * 50 + unlocked * 25;
    const level = Math.floor(xp / XP_PER_LEVEL) + 1;
    return Object.assign(ctx, {
      sessionsList: sessions,
      achievements,
      unlocked,
      hours: state.profile.baseHours + Math.round(minutes / 60),
      xp,
      level,
      into: xp % XP_PER_LEVEL,
      title: D.levelTitles[Math.min(level, D.levelTitles.length) - 1]
    });
  }

  // Aplica uma alteração, guarda e anuncia conquistas ou subidas de nível
  function commit(mutator) {
    const before = computeStats();
    mutator();
    save();
    const after = computeStats();
    after.achievements.forEach((a, i) => {
      if (a.unlocked && !before.achievements[i].unlocked) toast(`Conquista desbloqueada: ${a.name}`, 'sparkle');
    });
    if (after.level > before.level) toast(`Subiste para o nível ${after.level} — ${after.title}!`, 'sparkle');
  }

  /* ---------- Utilitários ---------- */
  const today = () => new Date().toLocaleDateString('sv-SE');
  const fmtDate = (d, opts) => new Date(d + 'T12:00:00').toLocaleDateString('pt-PT', opts || { day: 'numeric', month: 'long', year: 'numeric' });
  const players = (g) => (g.minPlayers === g.maxPlayers ? `${g.minPlayers} jogadores` : `${g.minPlayers}–${g.maxPlayers} jogadores`);
  const initials = (name) => name.trim().split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?';
  const uid = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  function hash(str) {
    let h = 7;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 233280;
    return h;
  }

  function coverURI(g) {
    const el = toneOf(g);
    let seed = hash(g.id);
    const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    let embers = '';
    for (let i = 0; i < 34; i++) {
      const x = (rnd() * 600).toFixed(1);
      const y = (rnd() * 330).toFixed(1);
      const warm = rnd() > 0.35;
      embers += `<circle cx="${x}" cy="${y}" r="${(rnd() * 1.8 + 0.5).toFixed(2)}" fill="${warm ? '#E76F3C' : '#F4EBD0'}" opacity="${(rnd() * 0.6 + 0.25).toFixed(2)}"/>`;
    }
    let sparkles = '';
    for (let i = 0; i < 4; i++) {
      const x = 60 + rnd() * 480;
      const y = 40 + rnd() * 140;
      const s = 4 + rnd() * 5;
      sparkles += `<path d="M${x} ${y - s}L${x + s * 0.25} ${y}L${x} ${y + s}L${x - s * 0.25} ${y}ZM${x - s} ${y}L${x} ${y + s * 0.25}L${x + s} ${y}L${x} ${y - s * 0.25}Z" fill="#D4A85A" opacity=".8"/>`;
    }
    const rot = Math.round(rnd() * 45);
    const corner = (x, y) => `<path d="M${x} ${y - 7}L${x + 7} ${y}L${x} ${y + 7}L${x - 7} ${y}Z" fill="#D4A85A"/>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400">
<defs>
<linearGradient id="g" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="${el.cover[0]}"/><stop offset="1" stop-color="${el.cover[1]}"/></linearGradient>
<radialGradient id="glow" cx=".5" cy=".46" r=".5"><stop offset="0" stop-color="#E76F3C" stop-opacity=".55"/><stop offset=".45" stop-color="#B23A2E" stop-opacity=".18"/><stop offset="1" stop-color="#B23A2E" stop-opacity="0"/></radialGradient>
<radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#050d14" stop-opacity="0"/><stop offset="1" stop-color="#050d14" stop-opacity=".85"/></radialGradient>
<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3d9a0"/><stop offset=".55" stop-color="#D4A85A"/><stop offset="1" stop-color="#a8742f"/></linearGradient>
<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050d14" stop-opacity="0"/><stop offset="1" stop-color="#050d14" stop-opacity=".9"/></linearGradient>
<filter id="blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>
</defs>
<rect width="600" height="400" fill="url(#g)"/>
<circle cx="300" cy="185" r="230" fill="url(#glow)"/>
<path d="M300 20L318 167L465 185L318 203L300 350L282 203L135 185L282 167Z" fill="#D4A85A" opacity=".08"/>
${embers}${sparkles}
<g transform="translate(0 255) scale(1 .72)" opacity=".92"><path d="${CASTLE}" fill="#050d14"/></g>
<rect y="250" width="600" height="150" fill="url(#fade)"/>
<g fill="none" stroke="url(#gold)" transform="rotate(${rot} 300 170)"><circle cx="300" cy="170" r="96" stroke-width="2.2"/><circle cx="300" cy="170" r="84" stroke-width="1" stroke-dasharray="2 6" opacity=".7"/><path d="M300 62v16M300 262v16M192 170h16M392 170h16" stroke-width="2.2"/></g>
<g transform="translate(246 116) scale(2.25)" fill="none" stroke="#E76F3C" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" filter="url(#blur)" opacity=".7">${D.symbols[g.symbol]}</g>
<g transform="translate(246 116) scale(2.25)" fill="none" stroke="url(#gold)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${D.symbols[g.symbol]}</g>
<rect width="600" height="400" fill="url(#vig)"/>
<rect x="12" y="12" width="576" height="376" rx="10" fill="none" stroke="#D4A85A" stroke-opacity=".7" stroke-width="1.5"/>
<rect x="20" y="20" width="560" height="360" rx="6" fill="none" stroke="#D4A85A" stroke-opacity=".3"/>
${corner(12, 12)}${corner(588, 12)}${corner(12, 388)}${corner(588, 388)}
<text x="300" y="342" text-anchor="middle" font-family="Cinzel, 'Trajan Pro', Georgia, serif" font-weight="700" font-size="28" letter-spacing="3" fill="url(#gold)">${esc(g.title.toUpperCase())}</text>
</svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  const coverAlt = (g) => `Capa ilustrada de ${g.title}: símbolo dourado sobre fundo ${toneOf(g).name}`;

  function toast(message, icon) {
    const region = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `${ui(icon || 'check')}<span>${esc(message)}</span>`;
    region.appendChild(el);
    setTimeout(() => { el.classList.add('leaving'); setTimeout(() => el.remove(), 300); }, 3400);
  }

  /* ---------- Cabeçalho ---------- */
  function renderAuth() {
    const slot = document.getElementById('auth-slot');
    if (state.user) {
      slot.innerHTML = `
        <a class="auth-user" href="#/perfil" aria-label="O teu perfil (${esc(state.user.email)})">
          <span class="avatar avatar-sm" style="--avatar:${esc(state.profile.avatarColor)}" aria-hidden="true">${esc(initials(state.profile.name))}</span>
          <span class="auth-email">${esc(state.user.email)}</span>
        </a>
        <button type="button" class="btn btn-outline-light btn-sm" data-action="logout">Sair</button>`;
    } else {
      slot.innerHTML = `<a class="btn btn-gold btn-sm" href="#/entrar" data-nav="entrar">${ui('lock')}Entrar</a>`;
    }
  }

  function setNav(page) {
    $$('[data-nav]').forEach((a) => {
      if (a.dataset.nav === page) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  function closeNav() {
    const btn = $('.nav-toggle');
    btn.setAttribute('aria-expanded', 'false');
    $('.sr-only', btn).textContent = 'Abrir menu';
    document.getElementById('site-nav').classList.remove('open');
  }

  /* ---------- Componentes ---------- */
  function gameCard(g, headingLevel) {
    const h = headingLevel || 3;
    return `
      <li class="game-card" style="--accent:${toneOf(g).accent}">
        <a class="game-card-link" href="#/jogo/${g.id}">
          <div class="game-card-media">
            <img src="${coverURI(g)}" alt="${esc(coverAlt(g))}" width="600" height="400" loading="lazy">
            <span class="status-badge status-${g.status}">${STATUS[g.status]}</span>
            ${g.favorite ? `<span class="fav-badge">${ui('heart')}<span class="sr-only">Favorito</span></span>` : ''}
          </div>
          <div class="game-card-body">
            <p class="game-card-genre"><span class="dot" aria-hidden="true"></span>${esc(g.genre)} · ${esc(g.complexity)}</p>
            <h${h} class="game-card-title">${esc(g.title)}</h${h}>
            <ul class="meta-list">
              <li>${ui('users')}${players(g)}</li>
              <li>${ui('clock')}~${g.duration} min</li>
            </ul>
            <p class="owner"><span class="avatar avatar-xs" aria-hidden="true">${esc(initials(g.owner))}</span><span><span class="sr-only">Proprietário: </span>${esc(g.owner)}${g.copies > 1 ? ` · ${g.copies} exemplares` : ''}</span></p>
          </div>
        </a>
      </li>`;
  }

  function skeletonCards(n) {
    let out = '';
    for (let i = 0; i < n; i++) {
      out += `<li class="game-card skeleton" aria-hidden="true"><div class="game-card-media sk-block"></div><div class="game-card-body"><span class="sk-line w40"></span><span class="sk-line w80 tall"></span><span class="sk-line w60"></span><span class="sk-line w50"></span></div></li>`;
    }
    return out;
  }

  /* ---------- Biblioteca ---------- */
  function renderLibrary() {
    const genres = Array.from(new Set(D.games.map((g) => g.genre))).sort((a, b) => a.localeCompare(b, 'pt'));
    const stats = computeStats();
    const opt = (value, label, current) => `<option value="${esc(value)}"${value === current ? ' selected' : ''}>${esc(label)}</option>`;

    main.innerHTML = `
      <section class="hero">
        ${scenery()}
        <div class="container hero-inner">
          <div class="hero-copy">
            <p class="eyebrow eyebrow-light">Make stories. Play them.</p>
            <h1 tabindex="-1" data-focus>Cada jogo guarda uma história. Cada partida escreve outra.</h1>
            <p class="lead">A Table Tale é uma biblioteca viva de jogos e histórias — um portal entre a mesa e o mundo. Explora a coleção, regista as tuas sessões e descobre as duas filosofias — Arcanos e Elementais — que dividem o mundo de Table Tale.</p>
            <div class="hero-actions">
              <a class="btn btn-primary" href="#colecao">Explorar a coleção</a>
              <a class="btn btn-outline-light" href="#/arcanos">Conhecer o universo</a>
            </div>
          </div>
          <div class="hero-art">
            <div class="hero-emblem">${emblem()}</div>
            <dl class="hero-stats" aria-label="A biblioteca em números">
              <div><dt>Jogos na estante</dt><dd>${D.games.length}</dd></div>
              <div><dt>Sessões registadas</dt><dd>${stats.sessions}</dd></div>
              <div><dt>Favoritos</dt><dd>${stats.favorites}</dd></div>
            </dl>
          </div>
        </div>
      </section>

      <section class="container section" id="colecao" aria-labelledby="colecao-title">
        <div class="section-head">
          <div>
            <p class="eyebrow">A estante de Gabriel Maia</p>
            <h2 id="colecao-title">Coleção</h2>
          </div>
          <p id="results-count" class="results-count" aria-live="polite"></p>
        </div>

        <form class="filters" id="filters" role="search" aria-label="Pesquisar e filtrar jogos">
          <div class="field field-search">
            <label for="f-q">Pesquisar</label>
            <div class="input-icon">${ui('search')}<input id="f-q" name="q" type="search" placeholder="Nome, género ou tema…" value="${esc(filters.q)}" autocomplete="off"></div>
          </div>
          <div class="field">
            <label for="f-genre">Género</label>
            <select id="f-genre" name="genre">${opt('', 'Todos', filters.genre)}${genres.map((g) => opt(g, g, filters.genre)).join('')}</select>
          </div>
          <div class="field">
            <label for="f-players">Jogadores</label>
            <select id="f-players" name="players">
              ${opt('', 'Qualquer número', filters.players)}${opt('1', 'Solo (1)', filters.players)}${opt('2', '2 jogadores', filters.players)}${opt('3-4', '3–4 jogadores', filters.players)}${opt('5+', '5 ou mais', filters.players)}
            </select>
          </div>
          <div class="field">
            <label for="f-duration">Duração</label>
            <select id="f-duration" name="duration">
              ${opt('', 'Qualquer duração', filters.duration)}${opt('curta', 'Até 30 min', filters.duration)}${opt('media', '31–60 min', filters.duration)}${opt('longa', '61–120 min', filters.duration)}${opt('epica', 'Mais de 2 h', filters.duration)}
            </select>
          </div>
          <div class="field">
            <label for="f-status">Estado</label>
            <select id="f-status" name="status">
              ${opt('', 'Todos os estados', filters.status)}${Object.keys(STATUS).map((k) => opt(k, STATUS[k], filters.status)).join('')}
            </select>
          </div>
          <div class="filters-extra">
            <label class="check"><input type="checkbox" name="fav"${filters.fav ? ' checked' : ''}><span>${ui('heart')}Só favoritos</span></label>
            <button type="button" class="btn btn-ghost btn-sm" data-action="clear-filters">Limpar filtros</button>
          </div>
        </form>

        <div id="results" aria-busy="true"><ul class="game-grid" role="list">${skeletonCards(6)}</ul><p class="sr-only">A carregar a coleção…</p></div>
      </section>`;

    if (libraryLoaded) {
      renderResults();
    } else {
      setTimeout(() => { libraryLoaded = true; if ($('#results')) renderResults(); }, 650);
    }
  }

  function matchesFilters(g) {
    const q = filters.q.trim().toLowerCase();
    if (q) {
      const hay = [g.title, g.genre, g.complexity, g.description].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.genre && g.genre !== filters.genre) return false;
    if (filters.status && g.status !== filters.status) return false;
    if (filters.fav && !g.favorite) return false;
    switch (filters.players) {
      case '1': if (g.minPlayers > 1) return false; break;
      case '2': if (g.minPlayers > 2 || g.maxPlayers < 2) return false; break;
      case '3-4': if (g.minPlayers > 4 || g.maxPlayers < 3) return false; break;
      case '5+': if (g.maxPlayers < 5) return false; break;
    }
    switch (filters.duration) {
      case 'curta': if (g.duration > 30) return false; break;
      case 'media': if (g.duration <= 30 || g.duration > 60) return false; break;
      case 'longa': if (g.duration <= 60 || g.duration > 120) return false; break;
      case 'epica': if (g.duration <= 120) return false; break;
    }
    return true;
  }

  function renderResults() {
    const box = $('#results');
    if (!box) return;
    const list = allGames().filter(matchesFilters);
    box.setAttribute('aria-busy', 'false');
    $('#results-count').textContent = list.length === 1 ? '1 jogo encontrado' : `${list.length} jogos encontrados`;
    if (!list.length) {
      const q = filters.q.trim();
      box.innerHTML = `
        <div class="empty-state">
          ${sym('compass', 'empty-sym')}
          <h3>Nenhum jogo encontrado nesta estante</h3>
          <p>${q ? `Não encontrámos nada para «${esc(q)}». ` : ''}Nenhum caminho encontrado com estes filtros. Experimenta outra pesquisa ou limpa os filtros.</p>
          <button type="button" class="btn btn-secondary" data-action="clear-filters">Limpar filtros</button>
        </div>`;
      return;
    }
    box.innerHTML = `<ul class="game-grid" role="list">${list.map((g) => gameCard(g)).join('')}</ul>`;
  }

  /* ---------- Detalhe ---------- */
  function renderGame(id) {
    const g = game(id);
    if (!g) return renderNotFound();
    const tone = toneOf(g);
    const sessions = g.sessions.slice().sort((a, b) => b.date.localeCompare(a.date));
    const recs = allGames()
      .filter((o) => o.id !== g.id)
      .map((o) => ({ o, score: (o.genre === g.genre ? 3 : 0) + (o.tone === g.tone ? 2 : 0) + (o.complexity === g.complexity ? 1 : 0) + (Math.abs(o.duration - g.duration) <= 30 ? 1 : 0) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((r) => r.o);

    main.innerHTML = `
      <div class="detail-backdrop" style="--accent:${tone.accent}">
        <div class="container section">
          <a class="back-link" href="#/biblioteca">${ui('back')}Voltar à biblioteca</a>
          <article class="detail-grid" aria-labelledby="game-title">
            <figure class="detail-media">
              <img src="${coverURI(g)}" alt="${esc(coverAlt(g))}" width="600" height="400">
              <figcaption>
                <span class="chip" style="--c:${tone.accent}">${sym(g.symbol)}${esc(g.genre)}</span>
              </figcaption>
            </figure>
            <div class="detail-info">
              <p class="eyebrow">${esc(g.genre)} · ${esc(g.complexity)}</p>
              <h1 id="game-title" tabindex="-1" data-focus>${esc(g.title)}</h1>
              <p class="lead">${esc(g.description)}</p>
              <dl class="facts">
                <div><dt>Jogadores</dt><dd>${players(g)}</dd></div>
                <div><dt>Duração média</dt><dd>~${g.duration} min</dd></div>
                <div><dt>Complexidade</dt><dd>${esc(g.complexity)}</dd></div>
                <div><dt>Proprietário</dt><dd><span class="avatar avatar-xs" aria-hidden="true">${esc(initials(g.owner))}</span> ${esc(g.owner)}</dd></div>
                <div><dt>Sessões</dt><dd>${g.sessions.length}</dd></div>
                <div><dt>Exemplares</dt><dd>${g.copies}</dd></div>
              </dl>

              <fieldset class="status-group">
                <legend>Estado de jogo</legend>
                <div class="segmented">
                  ${Object.keys(STATUS).map((k) => `
                    <label class="segment">
                      <input type="radio" name="status" value="${k}" data-id="${g.id}"${g.status === k ? ' checked' : ''}>
                      <span>${STATUS[k]}</span>
                    </label>`).join('')}
                </div>
              </fieldset>

              <div class="detail-actions">
                <button type="button" class="btn btn-primary" data-action="mark-played" data-id="${g.id}">${ui('check')}Marcar como jogado hoje</button>
                <button type="button" class="btn btn-secondary btn-fav" data-action="toggle-fav" data-id="${g.id}" aria-pressed="${g.favorite}">
                  ${ui('heart')}<span>${g.favorite ? 'Nos favoritos' : 'Adicionar aos favoritos'}</span>
                </button>
              </div>
            </div>
          </article>
        </div>
      </div>

      <div class="container section detail-lower">
        <section class="panel sessions" aria-labelledby="sessions-title">
          <div class="panel-head">
            <h2 id="sessions-title" tabindex="-1">Diário de sessões</h2>
            <p class="muted">Cada partida registada acrescenta uma página à tua história.</p>
          </div>
          <form id="session-form" class="session-form" data-id="${g.id}" novalidate>
            <div class="field">
              <label for="s-date">Data</label>
              <input id="s-date" name="date" type="date" value="${today()}" max="${today()}" required aria-describedby="s-date-error">
              <p class="field-error" id="s-date-error" hidden>Indica a data da sessão.</p>
            </div>
            <div class="field">
              <label for="s-people">Participantes</label>
              <input id="s-people" name="participants" type="text" value="${esc(state.profile.name)}" maxlength="120" placeholder="Separados por vírgulas" required aria-describedby="s-people-error">
              <p class="field-error" id="s-people-error" hidden>Indica pelo menos um participante.</p>
            </div>
            <div class="field field-wide">
              <label for="s-notes">Notas <span class="optional">(opcional)</span></label>
              <textarea id="s-notes" name="notes" rows="3" maxlength="400" placeholder="Momentos marcantes, pontuações, regras da casa…"></textarea>
            </div>
            <div class="field-wide form-actions">
              <button type="submit" class="btn btn-primary">${ui('plus')}Registar sessão</button>
            </div>
          </form>

          ${sessions.length ? `
            <ol class="session-list">
              ${sessions.map((s) => `
                <li class="session-item">
                  <div class="session-date">${ui('calendar')}<time datetime="${esc(s.date)}">${fmtDate(s.date)}</time></div>
                  <p class="session-people">${ui('users')}${esc(s.participants)}</p>
                  ${s.notes ? `<p class="session-notes">${esc(s.notes)}</p>` : ''}
                  <button type="button" class="icon-btn" data-action="delete-session" data-id="${g.id}" data-session="${esc(s.id)}" aria-label="Remover sessão de ${fmtDate(s.date)}">${ui('trash')}</button>
                </li>`).join('')}
            </ol>` : `
            <div class="empty-state empty-compact">
              ${sym('scroll', 'empty-sym')}
              <h3>Ainda não há sessões registadas</h3>
              <p>Este jogo espera pela sua primeira história. Regista uma sessão acima ou marca-o como jogado.</p>
            </div>`}
        </section>

        <section class="recs" aria-labelledby="recs-title">
          <h2 id="recs-title">Jogos semelhantes</h2>
          ${recs.length ? `<ul class="game-grid game-grid-compact" role="list">${recs.map((r) => gameCard(r)).join('')}</ul>` : '<p class="muted">Ainda não há recomendações para este jogo.</p>'}
        </section>
      </div>`;
    return { title: g.title };
  }

  /* ---------- Arcanos & Elementais (fonte de verdade: S1) ---------- */
  function balanceFigure() {
    const [a, e] = D.factions;
    const medal = (f, cx) => `
      <circle cx="${cx}" cy="100" r="50" fill="#0B1E2D" stroke="${f.color}" stroke-width="2"/>
      <circle cx="${cx}" cy="100" r="42" fill="none" stroke="${f.color}" stroke-opacity=".35" stroke-dasharray="2 5"/>
      <g transform="translate(${cx - 24} 76)" fill="none" stroke="${f.color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${D.symbols[f.symbol]}</g>
      <text x="${cx}" y="180" text-anchor="middle" class="balance-name" fill="${f.color}">${esc(f.name)}</text>
      <text x="${cx}" y="198" text-anchor="middle" class="balance-sub">${f.priorities.replace(/\.$/, '').split(', ').map((w, i) => `<tspan x="${cx}" dy="${i ? 13 : 0}">${esc(w)}</tspan>`).join('')}</text>`;
    return `
      <figure class="balance">
        <svg viewBox="0 0 440 220" role="img" aria-labelledby="balance-title balance-desc">
          <title id="balance-title">Duas filosofias, um mundo</title>
          <desc id="balance-desc">De um lado os Arcanos — questionar, compreender e evoluir. Do outro os Elementais — preservar, resistir e sustentar. Ao centro, o emblema de Table Tale, que pertence igualmente a ambos.</desc>
          <path d="M115 100 H325" stroke="#D4A85A" stroke-opacity=".6" stroke-width="1.5" stroke-dasharray="4 6"/>
          ${medal(a, 75)}
          ${medal(e, 365)}
          <circle cx="220" cy="100" r="40" fill="#07131d" stroke="#D4A85A" stroke-opacity=".7"/>
          <svg x="188" y="68" width="64" height="64" viewBox="0 0 64 64">${EMBLEM_INNER}</svg>
          <text x="220" y="165" text-anchor="middle" class="balance-sub">O verso neutro</text>
        </svg>
        <figcaption>${esc(D.lore.neutral)}</figcaption>
      </figure>`;
  }

  function factionSection(f, chapter) {
    const [lead, ...more] = f.worldview;
    return `
      <section id="${f.id}" class="lore-section faction" style="--c:${f.color};--c2:${f.color2}" aria-labelledby="${f.id}-title">
        <p class="eyebrow">Capítulo ${chapter}</p>
        <header class="faction-hero">
          <span class="faction-sigil">${sym(f.symbol)}</span>
          <div>
            <h2 id="${f.id}-title">Os ${esc(f.name)}</h2>
            <p class="faction-motto">${esc(f.motto)}</p>
            <p class="faction-latin"><span lang="la">${esc(f.latin)}</span> — ${esc(f.latinMeaning)}</p>
          </div>
        </header>
        <ul class="keyword-list" role="list" aria-label="Palavras-chave">${f.keywords.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>

        <h3 class="sub-title">Visão de mundo</h3>
        <div class="prose"><p>${esc(lead)}</p></div>
        <button type="button" class="btn-link" data-action="toggle-story" data-label="Ler a visão completa" aria-expanded="false" aria-controls="story-${f.id}"><span>Ler a visão completa</span></button>
        <div class="lore-story" id="story-${f.id}" hidden>
          ${more.map((p) => `<p>${esc(p)}</p>`).join('')}
          <p class="story-label">Personalidade</p>
          ${f.personality.map((p) => `<p>${esc(p)}</p>`).join('')}
        </div>

        <h3 class="sub-title">Valores centrais</h3>
        <ul class="value-grid" role="list">
          ${f.values.map(([n, t]) => `<li class="value-card"><h4>${esc(n)}</h4><p>${esc(t)}</p></li>`).join('')}
        </ul>

        <h3 class="sub-title">Virtudes e contradições</h3>
        <ul class="vr-list" role="list">
          ${f.tensions.map(([v, r]) => `
            <li>
              <p class="vr-virtue"><span>Virtude</span>${esc(v)}</p>
              <p class="vr-risk"><span>Risco</span>${esc(r)}</p>
            </li>`).join('')}
        </ul>

        <blockquote class="principle">
          <p>${esc(f.principle)}</p>
          <footer>Princípio ${esc(f.member)}</footer>
        </blockquote>

        <div class="visual-id">
          <h3 class="sub-title">Expressão visual</h3>
          <ul class="palette" role="list">${f.visual.palette.map(([c, n]) => `<li><span class="swatch-lg" style="--sw:${c}" aria-hidden="true"></span>${esc(n)}</li>`).join('')}</ul>
          <dl class="lore-traits">
            <div><dt>Linguagem</dt><dd>${esc(f.visual.language)}</dd></div>
            <div><dt>Sensação</dt><dd>${esc(f.visual.feeling)}</dd></div>
          </dl>
        </div>

        ${f.id === 'elementais' ? `
          <h3 class="sub-title">As forças naturais</h3>
          <ul class="lore-grid lore-grid-4" role="list">
            ${D.elements.map((el) => `
              <li class="lore-card element-card" style="--c:${el.color}">
                <span class="lore-symbol">${sym(el.symbol)}</span>
                <h4>${esc(el.name)}</h4>
                <p class="lore-color"><span class="swatch" aria-hidden="true"></span>${esc(el.colorName)}</p>
                <p class="element-keys">${el.keywords.map(esc).join(' · ')}</p>
              </li>`).join('')}
          </ul>` : ''}
      </section>`;
  }

  function renderArcanos() {
    const L = D.lore;
    const [arc, ele] = D.factions;
    const mine = state.profile.faction;
    main.innerHTML = `
      <section class="hero hero-lore">
        ${scenery()}
        <div class="container hero-lore-inner">
          <div class="hero-lore-emblem">${emblem()}</div>
          <p class="eyebrow eyebrow-light">${esc(L.intro.title)}</p>
          <h1 tabindex="-1" data-focus>Arcanos &amp; Elementais</h1>
          <p class="lead">${esc(L.intro.text)}</p>
          <p class="hero-note">${esc(L.intro.note)}</p>
        </div>
      </section>

      <div class="container lore-layout">
        <nav class="lore-toc" aria-label="Nesta página">
          <p class="lore-toc-title">Nesta página</p>
          <ol>
            <li><a href="#premissa">Premissa</a></li>
            <li><a href="#arcanos">Os Arcanos</a></li>
            <li><a href="#elementais">Os Elementais</a></li>
            <li><a href="#tensao">Ponto de tensão</a></li>
            <li><a href="#escolha">A tua escolha</a></li>
          </ol>
        </nav>

        <div class="lore-content">
          <section id="premissa" class="lore-section" aria-labelledby="premissa-title">
            <p class="eyebrow">Capítulo I</p>
            <h2 id="premissa-title">Premissa do conflito</h2>
            <div class="origin-grid">
              <div class="prose">
                <p class="dropcap">${esc(L.premise[0])}</p>
                <p>${esc(L.premise[1])}</p>
                <ul class="priorities" role="list">
                  <li style="--c:${arc.color}"><strong>${esc(arc.name)}:</strong> ${esc(arc.priorities.toLowerCase())}</li>
                  <li style="--c:${ele.color}"><strong>${esc(ele.name)}:</strong> ${esc(ele.priorities.toLowerCase())}</li>
                </ul>
                <p>${esc(L.premise[2])}</p>
                <p>${esc(L.premise[3])}</p>
              </div>
              ${balanceFigure()}
            </div>
          </section>

          ${factionSection(arc, 'II')}
          ${factionSection(ele, 'III')}

          <section id="tensao" class="lore-section" aria-labelledby="tensao-title">
            <p class="eyebrow">Capítulo IV</p>
            <h2 id="tensao-title">O ponto de tensão</h2>
            <div class="prose">${L.tension.intro.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
            <div class="tension-wrap">
              <table class="tension-table" style="--ca:${arc.color};--ce:${ele.color}">
                <caption class="sr-only">Perspetivas Arcana e Elemental sobre as questões centrais</caption>
                <thead>
                  <tr><th scope="col">Questão</th><th scope="col" class="t-arc">${sym(arc.symbol)}Perspetiva Arcana</th><th scope="col" class="t-ele">${sym(ele.symbol)}Perspetiva Elemental</th></tr>
                </thead>
                <tbody>
                  ${L.tension.rows.map(([q, a, e]) => `<tr><th scope="row">${esc(q)}</th><td class="t-arc">${esc(a)}</td><td class="t-ele">${esc(e)}</td></tr>`).join('')}
                </tbody>
              </table>
            </div>
            <p class="callout">${esc(L.tension.outro)}</p>

            <h3 class="sub-title">Equilíbrio entre as facções</h3>
            <p class="section-intro">${esc(L.balance.lead)}</p>
            <div class="without-grid">
              ${L.balance.without.map(([id, t]) => `<p class="without-card" style="--c:${factionById[id].color}">${sym(factionById[id].symbol)}<span>${esc(t)}</span></p>`).join('')}
            </div>
            <blockquote class="principle principle-neutral"><p>${esc(L.balance.warning)}</p></blockquote>
            <p class="muted">${esc(L.balance.closing)}</p>
          </section>

          <section id="escolha" class="lore-section" aria-labelledby="escolha-title">
            <p class="eyebrow">Capítulo V</p>
            <h2 id="escolha-title">A tua escolha</h2>
            <p class="section-intro">${esc(L.choice.intro)}</p>
            <blockquote class="central-question"><p>${esc(L.choice.question)}</p></blockquote>
            <div class="choice-grid">
              ${D.factions.map((f) => `
                <article class="choice-card${mine === f.id ? ' chosen' : ''}" style="--c:${f.color}" aria-labelledby="choice-${f.id}">
                  <span class="faction-sigil faction-sigil-sm">${sym(f.symbol)}</span>
                  <h3 id="choice-${f.id}">Escolhe os ${esc(f.name)} se acreditas que:</h3>
                  <ul>${f.chooseIf.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
                  <p class="choice-latin" lang="la">${esc(f.latin)}</p>
                  <button type="button" class="btn ${mine === f.id ? 'btn-secondary' : 'btn-primary'}" data-action="choose-faction" data-id="${f.id}" aria-pressed="${mine === f.id}">
                    ${mine === f.id ? `${ui('check')}A tua facção` : `Declarar-me ${esc(f.member)}`}
                  </button>
                </article>`).join('')}
            </div>
            <p class="muted center">${esc(L.choice.answer)}</p>
            <div class="lore-cta">
              <div>
                <p class="cta-title">${esc(L.outro.title)}</p>
                <p class="cta-text">${esc(L.outro.text)}</p>
              </div>
              <a class="btn btn-primary" href="#/biblioteca">Explorar a biblioteca</a>
            </div>
          </section>
        </div>
      </div>`;
    observeToc();
  }

  let tocObserver = null;
  function observeToc() {
    if (tocObserver) tocObserver.disconnect();
    if (!('IntersectionObserver' in window)) return;
    const links = $$('.lore-toc a');
    tocObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === '#' + entry.target.id));
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    $$('.lore-section').forEach((s) => tocObserver.observe(s));
  }

  /* ---------- Perfil ---------- */
  function renderProfile() {
    const p = state.profile;
    const fac = factionById[p.faction] || D.factions[0];
    const s = computeStats();
    const prev = lastProfileStats;
    const bump = (key) => (prev && prev[key] !== s[key] ? ' bump' : '');
    const delta = (key) => {
      if (!prev || prev[key] === s[key]) return '';
      const d = s[key] - prev[key];
      return `<span class="stat-delta">${d > 0 ? '+' : ''}${d}</span>`;
    };
    lastProfileStats = { played: s.played, events: s.events, unlocked: s.unlocked, hours: s.hours };
    const pct = Math.round((s.into / XP_PER_LEVEL) * 100);
    const recent = s.sessionsList.slice(0, 5);
    const events = D.events.slice().sort((a, b) => b.date.localeCompare(a.date));
    const now = today();

    main.innerHTML = `
      <div class="profile-banner">${scenery()}</div>
      <div class="container profile">
        ${state.user ? '' : `
          <div class="notice" role="note">
            ${ui('user')}<p>Estás a ver o perfil de demonstração. <a href="#/entrar">Entra com o teu e-mail</a> para o associar à tua conta.</p>
          </div>`}
        <section class="profile-card" aria-labelledby="profile-name">
          <div class="avatar avatar-xl" style="--avatar:${esc(p.avatarColor)}" role="img" aria-label="Avatar de ${esc(p.name)}"><span aria-hidden="true">${esc(initials(p.name))}</span></div>
          <div class="profile-id">
            <p class="eyebrow">Membro desde ${esc(p.memberSince)}</p>
            <h1 id="profile-name" tabindex="-1" data-focus>${esc(p.name)}</h1>
            <p class="profile-level"><span class="level-badge">Nível ${s.level}</span><span>${esc(s.title)}</span></p>
            <p class="profile-faction" style="--c:${fac.color}">${sym(fac.symbol)}<span><span class="sr-only">Facção: </span>${esc(fac.name)} <span class="profile-latin" lang="la">· ${esc(fac.latin)}</span></span></p>
            ${p.bio ? `<p class="profile-bio">${esc(p.bio)}</p>` : ''}
          </div>
          <button type="button" class="btn btn-secondary profile-edit" data-action="edit-profile">${ui('edit')}Editar perfil</button>
          <div class="xp">
            <div class="xp-head">
              <span id="xp-label">Progresso para o nível ${s.level + 1} — ${esc(D.levelTitles[Math.min(s.level, D.levelTitles.length - 1)])}</span>
              <span class="xp-value">${s.into} / ${XP_PER_LEVEL} XP</span>
            </div>
            <div class="xp-bar" role="progressbar" aria-labelledby="xp-label" aria-valuemin="0" aria-valuemax="${XP_PER_LEVEL}" aria-valuenow="${s.into}" aria-valuetext="${pct}%">
              <span style="width:${pct}%"></span>
            </div>
            <p class="xp-hint">Ganha XP ao registar sessões (+40), concluir jogos (+60), participar em eventos (+50) e desbloquear conquistas (+25).</p>
          </div>
        </section>

        <ul class="stats" role="list" aria-label="Estatísticas">
          <li class="stat${bump('played')}">${sym('dice')}<span class="stat-value">${s.played}${delta('played')}</span><span class="stat-label">Jogos jogados</span></li>
          <li class="stat${bump('events')}">${sym('shield')}<span class="stat-value">${s.events}${delta('events')}</span><span class="stat-label">Eventos frequentados</span></li>
          <li class="stat${bump('unlocked')}">${sym('trophy')}<span class="stat-value">${s.unlocked}<small>/${s.achievements.length}</small>${delta('unlocked')}</span><span class="stat-label">Conquistas desbloqueadas</span></li>
          <li class="stat${bump('hours')}">${sym('constellation')}<span class="stat-value">${s.hours}<small> h</small>${delta('hours')}</span><span class="stat-label">Horas de jogo</span></li>
        </ul>

        <div class="profile-columns">
          <section class="panel" aria-labelledby="recent-title">
            <div class="panel-head"><h2 id="recent-title">Jogados recentemente</h2></div>
            ${recent.length ? `
              <ul class="recent-list" role="list">
                ${recent.map((r) => `
                  <li>
                    <a class="recent-item" href="#/jogo/${r.game.id}">
                      <img src="${coverURI(r.game)}" alt="" width="96" height="64" loading="lazy">
                      <span class="recent-text">
                        <span class="recent-title">${esc(r.game.title)}</span>
                        <span class="recent-meta"><time datetime="${esc(r.date)}">${fmtDate(r.date, { day: 'numeric', month: 'short' })}</time> · ${esc(r.participants)}</span>
                      </span>
                      <span class="status-badge status-${r.game.status}">${STATUS[r.game.status]}</span>
                    </a>
                  </li>`).join('')}
              </ul>` : `
              <div class="empty-state empty-compact">
                ${sym('dice', 'empty-sym')}
                <h3>Nenhuma partida registada</h3>
                <p>Escolhe um jogo na biblioteca e regista a tua primeira sessão.</p>
                <a class="btn btn-secondary" href="#/biblioteca">Ir para a biblioteca</a>
              </div>`}
          </section>

          <section class="panel" aria-labelledby="events-title">
            <div class="panel-head"><h2 id="events-title">Eventos</h2></div>
            <ul class="event-list" role="list">
              ${events.map((e) => {
                const going = !!state.events[e.id];
                const future = e.date > now;
                const d = new Date(e.date + 'T12:00:00');
                return `
                  <li class="event${going ? ' attended' : ''}">
                    <div class="event-date" aria-hidden="true"><span>${d.getDate()}</span><small>${d.toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '')}</small></div>
                    <div class="event-body">
                      <h3>${esc(e.name)}</h3>
                      <p class="event-meta"><time datetime="${e.date}">${fmtDate(e.date)}</time><span class="event-place">${ui('pin')}${esc(e.place)}</span></p>
                      <p class="event-text">${esc(e.text)}</p>
                    </div>
                    <button type="button" class="btn btn-sm ${going ? 'btn-secondary' : 'btn-ghost'}" data-action="toggle-event" data-id="${e.id}" aria-pressed="${going}" aria-label="${future ? 'Vou participar' : 'Participei'}: ${esc(e.name)}">
                      ${going ? ui('check') : ''}${future ? (going ? 'Inscrito' : 'Vou participar') : (going ? 'Participei' : 'Marcar presença')}
                    </button>
                  </li>`;
              }).join('')}
            </ul>
          </section>
        </div>

        <section class="panel achievements" aria-labelledby="ach-title">
          <div class="panel-head">
            <h2 id="ach-title">Medalhas &amp; conquistas</h2>
            <p class="muted">${s.unlocked} de ${s.achievements.length} desbloqueadas</p>
          </div>
          <ul class="medal-grid" role="list">
            ${s.achievements.map((a) => `
              <li class="medal${a.unlocked ? ' unlocked' : ''}">
                <span class="medal-icon">${sym(a.symbol)}</span>
                <h3>${esc(a.name)}</h3>
                <p>${esc(a.text)}</p>
                ${a.unlocked
                  ? `<p class="medal-state">${ui('check')}Desbloqueada</p>`
                  : `<div class="medal-progress" role="progressbar" aria-label="Progresso de ${esc(a.name)}" aria-valuemin="0" aria-valuemax="${a.goal}" aria-valuenow="${a.value}"><span style="width:${Math.round((a.value / a.goal) * 100)}%"></span></div><p class="medal-state locked">${ui('lock')}${a.value} / ${a.goal}</p>`}
              </li>`).join('')}
          </ul>
        </section>
      </div>`;
  }

  function openProfileDialog() {
    const dlg = document.getElementById('profile-dialog');
    const p = state.profile;
    dlg.innerHTML = `
      <form id="profile-form" class="dialog-form" novalidate>
        <div class="dialog-head">
          <h2 id="profile-dialog-title">Editar perfil</h2>
          <button type="button" class="icon-btn" data-action="close-dialog" aria-label="Fechar">${ui('plus', 'rot45')}</button>
        </div>
        <div class="field">
          <label for="p-name">Nome</label>
          <input id="p-name" name="name" type="text" value="${esc(p.name)}" maxlength="40" required aria-describedby="p-name-error">
          <p class="field-error" id="p-name-error" hidden>O nome não pode ficar vazio.</p>
        </div>
        <div class="field">
          <label for="p-faction">Facção</label>
          <select id="p-faction" name="faction" aria-describedby="p-faction-hint">${D.factions.map((f) => `<option value="${f.id}"${f.id === p.faction ? ' selected' : ''}>${esc(f.name)} — ${esc(f.latin)}</option>`).join('')}</select>
          <p class="field-hint" id="p-faction-hint">Nenhuma facção é superior à outra: escolhe a filosofia que mais te representa.</p>
        </div>
        <div class="field">
          <label for="p-bio">Sobre ti</label>
          <textarea id="p-bio" name="bio" rows="3" maxlength="160">${esc(p.bio)}</textarea>
        </div>
        <fieldset class="field swatches">
          <legend>Cor do avatar</legend>
          ${D.avatarColors.map((c) => `
            <label class="swatch-option" style="--sw:${c.value}">
              <input type="radio" name="avatarColor" value="${c.value}"${c.value === p.avatarColor ? ' checked' : ''}>
              <span class="sr-only">${esc(c.label)}</span>
            </label>`).join('')}
        </fieldset>
        <div class="dialog-actions">
          <button type="button" class="btn btn-ghost" data-action="close-dialog">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar alterações</button>
        </div>
      </form>`;
    dlg.showModal();
    $('#p-name', dlg).focus();
  }

  /* ---------- Login ---------- */
  function renderLogin() {
    main.innerHTML = `
      <section class="auth-page">
        ${scenery()}
        <div class="auth-card">
          <span class="auth-seal">${emblem()}</span>
          ${state.user ? `
            <h1 tabindex="-1" data-focus>Já estás à mesa</h1>
            <p class="muted">Sessão iniciada como <strong>${esc(state.user.email)}</strong>.</p>
            <div class="auth-actions">
              <a class="btn btn-primary" href="#/perfil">Ver o meu perfil</a>
              <button type="button" class="btn btn-ghost" data-action="logout">Terminar sessão</button>
            </div>` : `
            <div id="login-step">
              <h1 tabindex="-1" data-focus>Entrar na Table Tale</h1>
              <p class="muted">Sem palavras-passe. Envia-nos o teu e-mail e recebes um link mágico para abrir a biblioteca.</p>
              <form id="login-form" class="auth-form" novalidate>
                <div class="field">
                  <label for="login-email">E-mail</label>
                  <div class="input-icon">${ui('mail')}<input id="login-email" name="email" type="email" autocomplete="email" placeholder="nome@exemplo.pt" required aria-describedby="login-error"></div>
                  <p class="field-error" id="login-error" hidden></p>
                </div>
                <button type="submit" class="btn btn-primary btn-block">Continuar</button>
              </form>
            </div>`}
          <a class="back-link back-center" href="#/biblioteca">${ui('back')}Voltar à biblioteca</a>
        </div>
      </section>`;
  }

  function showLoginConfirmation(email) {
    const step = $('#login-step');
    step.innerHTML = `
      <div class="auth-confirm" role="status">
        <h1 tabindex="-1">Verifica o teu correio</h1>
        <p>Enviámos um link de acesso para <strong>${esc(email)}</strong>. O link é válido durante 15 minutos.</p>
        <p class="muted small">Este é um protótipo: nenhum e-mail foi realmente enviado.</p>
        <div class="auth-actions">
          <button type="button" class="btn btn-primary" data-action="open-magic-link" data-email="${esc(email)}">${ui('sparkle')}Abrir link de demonstração</button>
          <button type="button" class="btn btn-ghost" data-action="login-again">Usar outro e-mail</button>
        </div>
      </div>`;
    $('h1', step).focus();
  }

  function renderNotFound() {
    main.innerHTML = `
      <section class="container section">
        <div class="empty-state">
          ${sym('compass', 'empty-sym')}
          <h1 tabindex="-1" data-focus>Esta página não consta do mapa</h1>
          <p>O caminho que seguiste perdeu-se no Véu. Regressa à biblioteca para continuar a explorar.</p>
          <a class="btn btn-primary" href="#/biblioteca">Voltar à biblioteca</a>
        </div>
      </section>`;
    return { title: 'Página não encontrada' };
  }

  /* ---------- Router ---------- */
  function render() {
    const h = location.hash || '#/biblioteca';
    let page = '';
    let title = '';
    let m;
    if (h === '#/' || h === '#/biblioteca' || !h.startsWith('#/')) {
      page = 'biblioteca'; title = 'Biblioteca'; renderLibrary();
    } else if ((m = h.match(/^#\/jogo\/([a-z0-9-]+)$/))) {
      page = 'biblioteca'; const r = renderGame(m[1]); title = r ? r.title : '';
    } else if (h === '#/arcanos') {
      page = 'arcanos'; title = 'Arcanos & Elementais'; renderArcanos();
    } else if (h === '#/perfil') {
      page = 'perfil'; title = 'Perfil'; renderProfile();
    } else if (h === '#/entrar') {
      page = 'entrar'; title = 'Entrar'; renderLogin();
    } else {
      title = renderNotFound().title;
    }
    renderAuth();
    setNav(page);
    document.title = `${title} · Table Tale`;
  }

  function onRoute() {
    closeNav();
    render();
    window.scrollTo(0, 0);
    if (!firstRender) {
      const target = $('[data-focus]', main) || main;
      target.focus({ preventScroll: true });
    }
    firstRender = false;
  }

  // Re-renderiza a vista atual mantendo a posição e o foco
  function refresh(focusSelector) {
    const y = window.scrollY;
    render();
    window.scrollTo(0, y);
    if (focusSelector) {
      const el = $(focusSelector);
      if (el) el.focus({ preventScroll: true });
    }
  }

  /* ---------- Eventos ---------- */
  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a[href^="#"]');
    if (anchor) {
      const href = anchor.getAttribute('href');
      if (!href.startsWith('#/')) {
        const target = document.getElementById(href.slice(1));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
          if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
        }
      }
      return;
    }

    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;

    switch (btn.dataset.action) {
      case 'toggle-nav': {
        const open = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', String(open));
        $('.sr-only', btn).textContent = open ? 'Fechar menu' : 'Abrir menu';
        document.getElementById('site-nav').classList.toggle('open', open);
        break;
      }
      case 'clear-filters': {
        Object.assign(filters, { q: '', genre: '', players: '', duration: '', status: '', fav: false });
        const form = $('#filters');
        form.reset();
        $$('select', form).forEach((s) => { s.value = ''; });
        $('#f-q').value = '';
        renderResults();
        $('#f-q').focus();
        break;
      }
      case 'toggle-fav': {
        let fav;
        commit(() => { fav = state.games[id].favorite = !state.games[id].favorite; });
        refresh(`[data-action="toggle-fav"][data-id="${id}"]`);
        toast(fav ? 'Adicionado aos favoritos' : 'Removido dos favoritos', 'heart');
        break;
      }
      case 'mark-played': {
        commit(() => {
          const g = state.games[id];
          g.sessions.push({ id: uid(), date: today(), participants: state.profile.name, notes: '' });
          if (g.status === 'por-jogar') g.status = 'em-progresso';
        });
        refresh(`[data-action="mark-played"][data-id="${id}"]`);
        toast('Sessão de hoje registada');
        break;
      }
      case 'delete-session': {
        const sid = btn.dataset.session;
        commit(() => { state.games[id].sessions = state.games[id].sessions.filter((s) => s.id !== sid); });
        refresh('#sessions-title');
        toast('Sessão removida', 'trash');
        break;
      }
      case 'toggle-story': {
        const open = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', String(open));
        $('span', btn).textContent = open ? 'Recolher' : (btn.dataset.label || 'Ler mais');
        document.getElementById(btn.getAttribute('aria-controls')).hidden = !open;
        break;
      }
      case 'choose-faction': {
        const f = factionById[id];
        if (!f) break;
        commit(() => { state.profile.faction = f.id; });
        refresh(`[data-action="choose-faction"][data-id="${id}"]`);
        toast(`Agora és ${f.member}. ${f.latin}.`, 'sparkle');
        break;
      }
      case 'toggle-event': {
        let going;
        commit(() => { going = state.events[id] = !state.events[id]; });
        refresh(`[data-action="toggle-event"][data-id="${id}"]`);
        toast(going ? 'Presença registada' : 'Presença removida', going ? 'check' : 'calendar');
        break;
      }
      case 'edit-profile':
        openProfileDialog();
        break;
      case 'close-dialog':
        document.getElementById('profile-dialog').close();
        break;
      case 'open-magic-link':
        state.user = { email: btn.dataset.email };
        save();
        toast(`Bem-vindo de volta, ${state.profile.name.split(' ')[0]}!`, 'sparkle');
        location.hash = '#/perfil';
        break;
      case 'login-again':
        render();
        $('#login-email').focus();
        break;
      case 'logout':
        state.user = null;
        save();
        toast('Sessão terminada');
        if (location.hash === '#/entrar') refresh('[data-focus]');
        else renderAuth();
        break;
      case 'reset-demo':
        if (window.confirm('Repor todos os dados de demonstração? As alterações feitas neste navegador serão perdidas.')) {
          state = freshState();
          save();
          lastProfileStats = null;
          refresh();
          toast('Dados de demonstração repostos', 'reset');
        }
        break;
    }
  });

  document.addEventListener('input', (e) => {
    const form = e.target.closest('#filters');
    if (!form) return;
    const t = e.target;
    filters[t.name] = t.type === 'checkbox' ? t.checked : t.value;
    if (libraryLoaded) renderResults();
  });

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'status' && t.dataset.id) {
      commit(() => { state.games[t.dataset.id].status = t.value; });
      refresh(`input[name="status"][value="${t.value}"]`);
      toast(`Estado atualizado: ${STATUS[t.value]}`);
    }
  });

  function setError(input, errEl, message) {
    if (message) {
      errEl.textContent = message;
      errEl.hidden = false;
      input.setAttribute('aria-invalid', 'true');
    } else {
      errEl.hidden = true;
      input.removeAttribute('aria-invalid');
    }
    return !message;
  }

  document.addEventListener('submit', (e) => {
    const form = e.target;

    if (form.id === 'filters') {
      e.preventDefault();
      return;
    }

    if (form.id === 'session-form') {
      e.preventDefault();
      const id = form.dataset.id;
      const date = form.date.value;
      const participants = form.participants.value.trim();
      const notes = form.notes.value.trim();
      const okDate = setError(form.date, $('#s-date-error'), date ? '' : 'Indica a data da sessão.');
      const okPeople = setError(form.participants, $('#s-people-error'), participants ? '' : 'Indica pelo menos um participante.');
      if (!okDate) { form.date.focus(); return; }
      if (!okPeople) { form.participants.focus(); return; }
      commit(() => {
        const g = state.games[id];
        g.sessions.push({ id: uid(), date, participants, notes });
        if (g.status === 'por-jogar') g.status = 'em-progresso';
      });
      refresh('#sessions-title');
      toast('Sessão registada no diário');
      return;
    }

    if (form.id === 'login-form') {
      e.preventDefault();
      const input = form.email;
      const email = input.value.trim();
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
      if (!setError(input, $('#login-error'), !email ? 'Indica o teu e-mail.' : (valid ? '' : 'Este e-mail não parece válido. Ex.: nome@exemplo.pt'))) {
        input.focus();
        return;
      }
      const btn = $('button[type="submit"]', form);
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      btn.innerHTML = '<span class="spinner" aria-hidden="true"></span>A enviar link…';
      input.readOnly = true;
      setTimeout(() => { if ($('#login-step')) showLoginConfirmation(email); }, 1100);
      return;
    }

    if (form.id === 'profile-form') {
      e.preventDefault();
      const f = form.elements;
      const name = f.namedItem('name').value.trim();
      if (!setError(f.namedItem('name'), $('#p-name-error'), name ? '' : 'O nome não pode ficar vazio.')) {
        f.namedItem('name').focus();
        return;
      }
      const color = f.namedItem('avatarColor').value;
      const faction = f.namedItem('faction').value;
      state.profile = Object.assign({}, state.profile, {
        name,
        faction: factionById[faction] ? faction : state.profile.faction,
        bio: f.namedItem('bio').value.trim(),
        avatarColor: D.avatarColors.some((c) => c.value === color) ? color : state.profile.avatarColor
      });
      save();
      document.getElementById('profile-dialog').close();
      refresh('[data-action="edit-profile"]');
      toast('Perfil atualizado');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('site-nav').classList.contains('open')) {
      closeNav();
      $('.nav-toggle').focus();
    }
  });

  document.getElementById('profile-dialog').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.close();
  });

  window.addEventListener('hashchange', onRoute);
  onRoute();
})();
