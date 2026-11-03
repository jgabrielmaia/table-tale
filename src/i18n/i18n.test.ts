import { afterEach, describe, expect, it } from 'vitest';
import { FATE_CARDS } from '@/features/fate/cards';
import { formatDate } from '@/lib/format';
import { applyLang, getLang, translate, translatePlural } from './core';
import { contentEn } from './content.en';
import { contentPt } from './content.pt';
import { en } from './messages.en';
import { pt } from './messages.pt';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

afterEach(() => applyLang('pt'));

describe('message catalogues', () => {
  it('define the same keys with the same placeholders in both languages', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(pt).sort());
    for (const key of Object.keys(pt) as (keyof typeof pt)[]) {
      expect(en[key].trim(), key).not.toBe('');
      expect(placeholders(en[key]), key).toBe(placeholders(pt[key]));
    }
  });

  it('have a plural form for every counted message', () => {
    for (const catalogue of [pt, en] as Record<string, string>[]) {
      for (const key of Object.keys(catalogue).filter((k) => k.endsWith('.one'))) {
        expect(catalogue[key.replace(/\.one$/, '.other')], key).toBeTruthy();
      }
    }
  });
});

describe('editorial content', () => {
  it('describes every card in both languages', () => {
    for (const card of FATE_CARDS) {
      expect(contentPt.cards[card.id].length).toBeGreaterThan(10);
      expect(contentEn.cards[card.id].length).toBeGreaterThan(10);
    }
  });

  it('keeps the lore structure aligned', () => {
    expect(contentEn.lore.premise).toHaveLength(contentPt.lore.premise.length);
    expect(contentEn.lore.tension.rows).toHaveLength(contentPt.lore.tension.rows.length);
    expect(contentEn.lore.timeline).toHaveLength(contentPt.lore.timeline.length);
    expect(contentEn.lore.chapters.map((c) => c.id)).toEqual(contentPt.lore.chapters.map((c) => c.id));
  });
});

describe('language state', () => {
  it('defaults to Portuguese (Portugal)', () => {
    expect(getLang()).toBe('pt');
    expect(translate('common.signIn')).toBe('Entrar');
  });

  it('switches language, remembers it and updates the document language', () => {
    applyLang('en');
    expect(translate('common.signIn')).toBe('Sign in');
    expect(window.localStorage.getItem('table-tale-lang')).toBe('en');
    expect(document.documentElement.lang).toBe('en-GB');
    applyLang('pt');
    expect(document.documentElement.lang).toBe('pt-PT');
  });

  it('picks the right plural form', () => {
    expect(translatePlural('common.players', 1)).toBe('1 jogador');
    expect(translatePlural('common.players', 3)).toBe('3 jogadores');
    applyLang('en');
    expect(translatePlural('common.players', 1)).toBe('1 player');
    expect(translatePlural('common.players', 3)).toBe('3 players');
  });

  it('formats dates with the active locale', () => {
    expect(formatDate('2026-11-03')).toBe('3 de novembro de 2026');
    applyLang('en');
    expect(formatDate('2026-11-03')).toBe('3 November 2026');
  });
});
