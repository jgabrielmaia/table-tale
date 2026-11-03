import type { CardArtKey } from '@/assets/cards';
import { LOGOS } from '@/assets/brand';
import { FRAME_THEMES, type FrameTheme } from '@/components/identity/frameThemes';
import { getLocale, t } from '@/i18n';
import { env } from '@/lib/env';
import { cardLore, cardTitle, getFaction, type FateCardData } from '../cards';
import { POSTER_FORMATS, type PosterFormat } from './formats';

export interface PosterInput {
  card: FateCardData;
  playerName: string;
  avatarUrl: string | null;
  seasonName: string;
  /** ISO timestamp of the draw. */
  discoveredAt?: string;
}

export interface PosterResult {
  canvas: HTMLCanvasElement;
  /** False when the profile photo could not be read (e.g. the host blocks cross-origin use) and initials were drawn. */
  avatarDrawn: boolean;
}

interface Layout {
  logoW: number; logoY: number; eyebrowY: number; eyebrowSize: number;
  cardW: number; cardX: number; cardY: number;
  portraitD: number; portraitCx: number; portraitCy: number;
  titleGap: number; titleSize: number; mottoSize: number; bodySize: number; bodyW: number; footerSymbolH: number;
}

const LAYOUTS: Record<PosterFormat, Layout> = {
  story: { logoW: 400, logoY: 96, eyebrowY: 372, eyebrowSize: 28, cardW: 520, cardX: 84, cardY: 420, portraitD: 280, portraitCx: 830, portraitCy: 640, titleGap: 64, titleSize: 104, mottoSize: 46, bodySize: 38, bodyW: 900, footerSymbolH: 84 },
  feed: { logoW: 300, logoY: 62, eyebrowY: 262, eyebrowSize: 24, cardW: 390, cardX: 76, cardY: 312, portraitD: 240, portraitCx: 790, portraitCy: 480, titleGap: 44, titleSize: 80, mottoSize: 38, bodySize: 31, bodyW: 920, footerSymbolH: 60 },
  whatsapp: { logoW: 320, logoY: 70, eyebrowY: 290, eyebrowSize: 25, cardW: 420, cardX: 76, cardY: 340, portraitD: 250, portraitCx: 790, portraitCy: 520, titleGap: 50, titleSize: 84, mottoSize: 40, bodySize: 33, bodyW: 920, footerSymbolH: 64 },
};

const DISPLAY = (px: number) => `700 ${px}px Cinzel, 'Trajan Pro', Georgia, serif`;
const SERIF_ITALIC = (px: number) => `italic 500 ${px}px 'Cormorant Garamond', Georgia, serif`;
const SANS = (px: number, weight = 500) => `${weight} ${px}px Inter, system-ui, sans-serif`;

type Ctx = CanvasRenderingContext2D & { letterSpacing: string };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src.slice(0, 40)}`));
    img.src = src;
  });
}

/** Providers serve small thumbnails by default; ask for a size that stays sharp inside a 280 px portrait. */
function highResolution(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith('googleusercontent.com')) return url.replace(/=s\d+(-c)?$/, '=s512-c');
    if (u.hostname === 'avatars.githubusercontent.com') {
      u.searchParams.set('s', '512');
      return u.toString();
    }
  } catch {
    // Not a URL we can adjust; use it as it is.
  }
  return url;
}

/** Reads the profile photo without tainting the canvas; resolves null when the host does not allow it. */
async function loadAvatar(url: string | null): Promise<ImageBitmap | null> {
  if (!url) return null;
  try {
    const res = await fetch(highResolution(url), { mode: 'cors', referrerPolicy: 'no-referrer', cache: 'reload' });
    if (!res.ok) return null;
    return await createImageBitmap(await res.blob());
  } catch {
    return null;
  }
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t0 = Math.imul(a ^ (a >>> 15), 1 | a);
    t0 = (t0 + Math.imul(t0 ^ (t0 >>> 7), 61 | t0)) ^ t0;
    return ((t0 ^ (t0 >>> 14)) >>> 0) / 4294967296;
  };
}

const withAlpha = (hex: string, alpha: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

function roundedRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx: Ctx, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxW) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function fit(ctx: Ctx, text: string, maxW: number, start: number, font: (px: number) => string): number {
  let px = start;
  ctx.font = font(px);
  while (px > 20 && ctx.measureText(text).width > maxW) {
    px -= 2;
    ctx.font = font(px);
  }
  return px;
}

function drawBackground(ctx: Ctx, w: number, h: number, theme: FrameTheme, glow: string, cx: number, cy: number, random: () => number) {
  ctx.fillStyle = '#050508';
  ctx.fillRect(0, 0, w, h);

  const lamp = (x: number, y: number, r: number, color: string, a: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, withAlpha(color, a));
    g.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  };
  lamp(w * 0.1, h * 0.06, w * 1.1, glow, 0.22);
  lamp(w * 0.95, h * 0.92, w * 1.1, theme.b, 0.2);
  lamp(cx, cy, w * 0.8, glow, 0.26);

  // Light rays behind the card.
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Math.PI * 2 + random() * 0.2;
    const len = w * (0.8 + random() * 0.5);
    const g = ctx.createLinearGradient(0, 0, Math.cos(angle) * len, Math.sin(angle) * len);
    g.addColorStop(0, withAlpha(glow, 0.2));
    g.addColorStop(1, withAlpha(glow, 0));
    ctx.strokeStyle = g;
    ctx.lineWidth = 1 + random() * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
    ctx.stroke();
  }
  // Esoteric geometry: concentric rings, a triangle and a square.
  ctx.strokeStyle = withAlpha(theme.a, 0.16);
  ctx.lineWidth = 2;
  [0.52, 0.74, 0.98].forEach((k) => {
    ctx.beginPath();
    ctx.arc(0, 0, w * k, 0, Math.PI * 2);
    ctx.stroke();
  });
  const poly = (n: number, r: number, rot: number) => {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2;
      ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.stroke();
  };
  ctx.strokeStyle = withAlpha(theme.b, 0.14);
  poly(3, w * 0.62, -Math.PI / 2 + random() * 0.4);
  poly(4, w * 0.5, Math.PI / 4 + random() * 0.4);
  ctx.restore();

  // Stars, laid out differently for every player.
  for (let i = 0; i < 160; i++) {
    const x = random() * w;
    const y = random() * h;
    const r = 0.5 + random() * 1.7;
    ctx.fillStyle = withAlpha(random() > 0.5 ? '#ffffff' : random() > 0.5 ? theme.a : theme.b, 0.2 + random() * 0.6);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Vignette.
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.72)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);

  // Border with corner diamonds.
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, theme.a);
  g.addColorStop(1, theme.b);
  ctx.strokeStyle = g;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 2;
  roundedRect(ctx, 30, 30, w - 60, h - 60, 18);
  ctx.stroke();
  ctx.globalAlpha = 0.22;
  roundedRect(ctx, 42, 42, w - 84, h - 84, 12);
  ctx.stroke();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = g;
  for (const [x, y] of [[30, 30], [w - 30, 30], [30, h - 30], [w - 30, h - 30]] as const) {
    ctx.beginPath();
    ctx.moveTo(x, y - 12);
    ctx.lineTo(x + 12, y);
    ctx.lineTo(x, y + 12);
    ctx.lineTo(x - 12, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPlate(ctx: Ctx, cx: number, top: number, text: string, theme: FrameTheme, card: FateCardData, fs: number) {
  ctx.font = DISPLAY(fs);
  ctx.letterSpacing = `${fs * 0.06}px`;
  const label = text.toUpperCase();
  const w = ctx.measureText(label).width + fs * 2;
  const h = fs * 1.75;
  const x = cx - w / 2;
  const c = h * 0.32;
  ctx.beginPath();
  if (card.faction === 'arcanos') {
    ctx.moveTo(x + c, top); ctx.lineTo(x + w - c, top); ctx.lineTo(x + w, top + h / 2); ctx.lineTo(x + w - c, top + h); ctx.lineTo(x + c, top + h); ctx.lineTo(x, top + h / 2); ctx.closePath();
  } else if (card.id === 'water') roundedRect(ctx, x, top, w, h, h / 2);
  else if (card.id === 'fire') {
    ctx.moveTo(x + c, top); ctx.lineTo(x + w, top); ctx.lineTo(x + w - c, top + h); ctx.lineTo(x, top + h); ctx.closePath();
  } else roundedRect(ctx, x, top, w, h, h * (card.id === 'earth' ? 0.18 : 0.08));
  ctx.fillStyle = '#07080e';
  ctx.fill();
  const g = ctx.createLinearGradient(x, top, x + w, top);
  g.addColorStop(0, theme.a);
  g.addColorStop(1, theme.b);
  ctx.strokeStyle = g;
  ctx.lineWidth = Math.max(2, fs * 0.09);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = theme.a;
  ctx.shadowBlur = fs * 0.4;
  ctx.fillText(label, cx + (fs * 0.06) / 2, top + h / 2 + fs * 0.04);
  ctx.shadowBlur = 0;
  ctx.letterSpacing = '0px';
  return h;
}

async function drawPortrait(ctx: Ctx, cx: number, cy: number, d: number, avatar: ImageBitmap | null, name: string, card: FateCardData, theme: FrameTheme) {
  const { frameSvgMarkup } = await import('@/components/identity/frameSvg');
  const frame = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(frameSvgMarkup(theme))}`);

  ctx.save();
  ctx.shadowColor = theme.a;
  ctx.shadowBlur = d * 0.12;
  ctx.drawImage(frame, cx - d * 0.66, cy - d * 0.66, d * 1.32, d * 1.32);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, d / 2, 0, Math.PI * 2);
  ctx.clip();
  if (avatar) {
    const s = Math.max(d / avatar.width, d / avatar.height);
    ctx.drawImage(avatar, cx - (avatar.width * s) / 2, cy - (avatar.height * s) / 2, avatar.width * s, avatar.height * s);
  } else {
    ctx.fillStyle = '#0F4C5C';
    ctx.fillRect(cx - d / 2, cy - d / 2, d, d);
    ctx.fillStyle = '#F4EBD0';
    ctx.font = DISPLAY(d * 0.38);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initials = name.trim().split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?';
    ctx.fillText(initials, cx, cy + d * 0.02);
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, d / 2, 0, Math.PI * 2);
  ctx.stroke();

  return drawPlate(ctx, cx, cy + d / 2 + d * 0.02, cardTitle(card), theme, card, d * 0.12);
}

/** Draws the personal identity poster for the signed-in player. Everything shown comes from their real data. */
export async function renderPoster(input: PosterInput, format: PosterFormat): Promise<PosterResult> {
  const { card } = input;
  const spec = POSTER_FORMATS[format];
  const L = LAYOUTS[format];
  const theme = FRAME_THEMES[card.id as CardArtKey];
  const faction = getFaction(card.faction);

  await Promise.all([
    document.fonts.load(DISPLAY(40)),
    document.fonts.load(SERIF_ITALIC(40)),
    document.fonts.load(SANS(30, 500)),
    document.fonts.load(SANS(30, 600)),
  ]).catch(() => undefined);

  const [art, logo, symbol, avatar] = await Promise.all([loadImage(card.image), loadImage(LOGOS.primary.ivory.src), loadImage(LOGOS.symbol.ivory.src), loadAvatar(input.avatarUrl)]);

  const canvas = document.createElement('canvas');
  canvas.width = spec.width;
  canvas.height = spec.height;
  const ctx = canvas.getContext('2d') as Ctx | null;
  if (!ctx) throw new Error('Canvas is not available');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const W = spec.width;
  const H = spec.height;
  const random = rng(hash(`${card.id}|${input.playerName}`));
  // Card artwork keeps its native proportion: only the width is chosen.
  const cardH = L.cardW * (art.naturalHeight / art.naturalWidth);
  const cardCx = L.cardX + L.cardW / 2;
  const cardCy = L.cardY + cardH / 2;

  drawBackground(ctx, W, H, theme, card.glow, cardCx, cardCy, random);

  // Official logo, drawn untouched.
  const logoH = L.logoW * (logo.naturalHeight / logo.naturalWidth);
  ctx.drawImage(logo, (W - L.logoW) / 2, L.logoY, L.logoW, logoH);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = withAlpha('#F4EBD0', 0.85);
  ctx.font = SANS(L.eyebrowSize, 600);
  ctx.letterSpacing = `${L.eyebrowSize * 0.28}px`;
  ctx.fillText(t('idp.title').toUpperCase(), W / 2 + (L.eyebrowSize * 0.28) / 2, L.eyebrowY);
  ctx.letterSpacing = '0px';

  // Card: glow behind, then the untouched artwork.
  ctx.save();
  ctx.shadowColor = card.glow;
  ctx.shadowBlur = 80;
  ctx.fillStyle = '#000';
  roundedRect(ctx, L.cardX, L.cardY, L.cardW, cardH, L.cardW * 0.054);
  ctx.fill();
  ctx.restore();
  ctx.drawImage(art, L.cardX, L.cardY, L.cardW, cardH);

  // Player portrait with the seasonal frame and card title.
  const plateH = await drawPortrait(ctx, L.portraitCx, L.portraitCy, L.portraitD, avatar, input.playerName, card, theme);
  let ry = L.portraitCy + L.portraitD / 2 + plateH + L.portraitD * 0.2;
  const colW = W - (L.cardX + L.cardW) - L.cardX - 30;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  const nameSize = fit(ctx, input.playerName, colW, 40, DISPLAY);
  ctx.fillText(input.playerName, L.portraitCx, ry);
  ry += nameSize * 0.5 + 34;

  // Faction chip.
  ctx.font = SANS(24, 600);
  ctx.letterSpacing = '4px';
  const chipLabel = faction.name.toUpperCase();
  const chipW = ctx.measureText(chipLabel).width + 56;
  const chipG = ctx.createLinearGradient(L.portraitCx - chipW / 2, 0, L.portraitCx + chipW / 2, 0);
  chipG.addColorStop(0, theme.a);
  chipG.addColorStop(1, theme.b);
  ctx.fillStyle = chipG;
  roundedRect(ctx, L.portraitCx - chipW / 2, ry - 30, chipW, 48, 24);
  ctx.fill();
  ctx.fillStyle = '#05060a';
  ctx.textBaseline = 'middle';
  ctx.fillText(chipLabel, L.portraitCx + 2, ry - 6);
  ctx.letterSpacing = '0px';
  ctx.textBaseline = 'alphabetic';
  ry += 62;

  ctx.fillStyle = withAlpha('#F4EBD0', 0.8);
  ctx.font = SANS(25, 500);
  ctx.fillText(input.seasonName, L.portraitCx, ry);
  if (input.discoveredAt) {
    ry += 38;
    ctx.fillStyle = withAlpha('#F4EBD0', 0.55);
    const date = new Date(input.discoveredAt).toLocaleDateString(getLocale(), { day: 'numeric', month: 'long', year: 'numeric' });
    const discovered = t('idp.discovered', { date });
    fit(ctx, discovered, colW, 22, (px) => SANS(px, 400));
    ctx.fillText(discovered, L.portraitCx, ry);
  }

  // Title block: numeral and faction, exact card title, motto, lore.
  let y = L.cardY + cardH + L.titleGap;
  ctx.fillStyle = withAlpha(card.glow, 0.95);
  ctx.font = SANS(L.eyebrowSize + 2, 600);
  ctx.letterSpacing = '7px';
  ctx.fillText(`${card.numeral ? `${card.numeral} · ` : ''}${faction.name.toUpperCase()}`, W / 2 + 3, y);
  ctx.letterSpacing = '0px';
  y += L.titleSize + 8;

  ctx.fillStyle = '#F4EBD0';
  const titleText = cardTitle(card).toUpperCase();
  const titlePx = fit(ctx, titleText, W - 160, L.titleSize, DISPLAY);
  ctx.shadowColor = withAlpha(card.glow, 0.7);
  ctx.shadowBlur = 36;
  ctx.fillText(titleText, W / 2, y);
  ctx.shadowBlur = 0;
  y += titlePx * 0.1 + L.mottoSize + 6;

  ctx.fillStyle = withAlpha('#ffffff', 0.92);
  ctx.font = SERIF_ITALIC(L.mottoSize);
  ctx.fillText(faction.motto, W / 2, y);
  y += 38;

  // Divider with a diamond.
  const dg = ctx.createLinearGradient(W * 0.25, 0, W * 0.75, 0);
  dg.addColorStop(0, withAlpha(theme.a, 0));
  dg.addColorStop(0.5, withAlpha(theme.a, 0.9));
  dg.addColorStop(1, withAlpha(theme.b, 0));
  ctx.strokeStyle = dg;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W * 0.25, y);
  ctx.lineTo(W * 0.75, y);
  ctx.stroke();
  ctx.fillStyle = theme.a;
  ctx.beginPath();
  ctx.moveTo(W / 2, y - 9); ctx.lineTo(W / 2 + 9, y); ctx.lineTo(W / 2, y + 9); ctx.lineTo(W / 2 - 9, y);
  ctx.closePath();
  ctx.fill();
  y += 20;

  // Lore: shrink the type a little if the text would run into the footer.
  const footerTop = H - 70 - L.footerSymbolH - 36;
  const lore = cardLore(card.id);
  let size = L.bodySize;
  let lines: string[] = [];
  for (;;) {
    ctx.font = SANS(size, 400);
    lines = wrap(ctx, lore, L.bodyW);
    if (y + size + lines.length * size * 1.4 <= footerTop || size <= 24) break;
    size -= 2;
  }
  ctx.fillStyle = withAlpha('#E4E9F4', 0.92);
  lines.forEach((line, i) => ctx.fillText(line, W / 2, y + size + i * size * 1.4));

  // Footer: official symbol and address.
  const sh = L.footerSymbolH;
  const sw = sh * (symbol.naturalWidth / symbol.naturalHeight);
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.drawImage(symbol, (W - sw) / 2, H - 70 - sh, sw, sh);
  ctx.restore();
  ctx.fillStyle = withAlpha('#F4EBD0', 0.55);
  ctx.font = SANS(22, 500);
  ctx.letterSpacing = '3px';
  try {
    const u = new URL(env.siteUrl);
    ctx.fillText(`${u.host}${u.pathname.replace(/\/$/, '')}`, W / 2, H - 52);
  } catch {
    // The address is decorative; skip it if the site URL is not absolute.
  }
  ctx.letterSpacing = '0px';

  return { canvas, avatarDrawn: Boolean(avatar) || !input.avatarUrl };
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: 'image/jpeg' | 'image/png', quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the image'))), type, quality));
}
