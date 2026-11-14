import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyLang } from '@/i18n/core';
import { relativeDay } from '@/lib/format';
import type { ShelfHighlight } from '@/types/domain';
import { highlightNote, highlightsHeading, highlightsSource } from './highlights';

const TODAY = '2026-11-14';
const h = (partial: Partial<ShelfHighlight>): ShelfHighlight => ({ gameId: 'g', source: 'public', lastPlayedAt: null, players: 0, copies: 1, ...partial });

beforeEach(() => applyLang('en'));
afterEach(() => applyLang('pt'));

describe('highlights heading', () => {
  it('follows the first highlight, so recent games win over the popular ones filling the row', () => {
    expect(highlightsSource([h({ source: 'recent' }), h({ source: 'community' })])).toBe('recent');
    expect(highlightsSource([h({ source: 'community' }), h({ source: 'public' })])).toBe('community');
    expect(highlightsSource([])).toBe('public');
  });

  it('has a title per source', () => {
    expect(highlightsHeading('recent')).toEqual({ eyebrow: 'home.recentEyebrow', title: 'home.highlights.recent' });
    expect(highlightsHeading('community').title).toBe('home.highlights.community');
    expect(highlightsHeading('public')).toEqual({ eyebrow: 'home.weekEyebrow', title: 'home.highlights.public' });
  });
});

describe('highlight note', () => {
  it('says when the player last played their own games', () => {
    expect(highlightNote(h({ source: 'recent', lastPlayedAt: TODAY }), TODAY)).toBe('Played today');
    expect(highlightNote(h({ source: 'recent', lastPlayedAt: '2026-11-13' }), TODAY)).toBe('Played yesterday');
    expect(highlightNote(h({ source: 'recent', lastPlayedAt: '2026-11-11' }), TODAY)).toBe('Played 3 days ago');
    applyLang('pt');
    expect(highlightNote(h({ source: 'recent', lastPlayedAt: '2026-11-11' }), TODAY)).toBe('Jogado há 3 dias');
  });

  it('counts members in the community and players in the public ranking', () => {
    expect(highlightNote(h({ source: 'community', players: 1 }))).toBe('1 member played it lately');
    expect(highlightNote(h({ source: 'community', players: 4 }))).toBe('4 members played it lately');
    expect(highlightNote(h({ source: 'public', players: 2 }))).toBe('2 players played it lately');
  });

  it('says nothing for a game that is only on the shelf', () => {
    expect(highlightNote(h({ source: 'community', players: 0, copies: 3 }))).toBeUndefined();
  });
});

describe('relativeDay', () => {
  it('moves to weeks, months and years as the day gets older', () => {
    expect(relativeDay('2026-10-31', TODAY)).toBe('2 weeks ago');
    expect(relativeDay('2026-08-01', TODAY)).toBe('3 months ago');
    expect(relativeDay('2024-11-01', TODAY)).toBe('2 years ago');
  });

  it('never says "in N days" for a date after today', () => {
    expect(relativeDay('2026-11-15', TODAY)).toBe('today');
  });
});
