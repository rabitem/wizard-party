import { describe, expect, it } from 'vitest';

import { isRoomCode } from '../social/presence';
import { BotDifficulty } from '../bot-ai/types';
import { assignSeatNames, toSeatName } from './seat-names';
import {
  TOURNAMENT_ID_LENGTH,
  isInviteCode,
  isMatchId,
  isTournamentId,
  isTournamentRoomCode,
  matchIdFor,
  matchRoomCode,
  normalizeInviteCode,
  parseMatchId,
  randomIdFrom,
} from './tournament-ids';
import { isTournamentError } from './tournament-error';
import { DEFAULT_TOURNAMENT_SETTINGS, parseStartsAt, parseTournamentChanges, parseTournamentDraft, sanitizeTournamentDescription, sanitizeTournamentName } from './tournament-validation';
import { T0 } from './tournament.fixtures';
import { rankMatchSeats } from './match-room';

function codeOf(fn: () => unknown): string | null {
  try {
    fn();
    return null;
  } catch (error) {
    return isTournamentError(error) ? error.code : 'other';
  }
}

describe('ids and room codes', () => {
  it('derives match ids and room codes deterministically', () => {
    const id = matchIdFor('abcdefghjk23', 2, 3);
    expect(id).toBe('abcdefghjk23-2-3');
    expect(isMatchId(id)).toBe(true);
    expect(parseMatchId(id)).toEqual({ tournamentId: 'abcdefghjk23', round: 2, table: 3 });
    expect(parseMatchId('nope')).toBeNull();
    const room = matchRoomCode(id);
    expect(room).toBe(matchRoomCode(id));
    expect(room).not.toBe(matchRoomCode(matchIdFor('abcdefghjk23', 2, 4)));
    expect(isTournamentRoomCode(room)).toBe(true);
    // Valid for the social features (presence, invites), never a casual 4–8 character code.
    expect(isRoomCode(room)).toBe(true);
    expect(isTournamentRoomCode('abcd23')).toBe(false);
  });

  it('spreads room codes without collisions over many matches', () => {
    const codes = new Set<string>();
    for (let t = 0; t < 400; t++) for (let r = 1; r <= 5; r++) for (let table = 1; table <= 5; table++) codes.add(matchRoomCode(matchIdFor(`tourn${String(t).padStart(6, '0')}`, r, table)));
    expect(codes.size).toBe(400 * 25);
  });

  it('validates ids and invite codes', () => {
    expect(isTournamentId('abcdefghjk23')).toBe(true);
    expect(isTournamentId('ABC')).toBe(false);
    expect(isInviteCode('abcdefgh')).toBe(true);
    expect(normalizeInviteCode(' ABCDEFGH ')).toBe('abcdefgh');
    expect(normalizeInviteCode('abc')).toBeNull();
  });

  it('builds unbiased ids from random bytes', () => {
    let counter = 0;
    const bytes = (n: number) => Uint8Array.from({ length: n }, () => counter++ % 256);
    const id = randomIdFrom(bytes, TOURNAMENT_ID_LENGTH);
    expect(id).toHaveLength(TOURNAMENT_ID_LENGTH);
    expect(isTournamentId(id)).toBe(true);
    // Bytes above the rejection limit are skipped.
    expect(randomIdFrom(() => new Uint8Array([255, 255, 0, 1]), 2)).toBe('ab');
  });
});

describe('seat names', () => {
  it('produces valid, unique names for a table', () => {
    const names = assignSeatNames([
      { userId: 'a', username: 'merlin', displayName: 'Merlin' },
      { userId: 'b', username: 'merlin.two', displayName: 'merlin' },
      { userId: 'c', username: 'x', displayName: '🙂' },
      { userId: 'd', username: null, displayName: '!' },
      { userId: 'e', username: null, displayName: 'Merlin' },
    ]);
    expect(names.get('a')).toBe('Merlin');
    expect(names.get('b')).toBe('merlin_two');
    expect(names.get('c')).toBe('Mage');
    expect(names.get('d')).toBe('Mage 2');
    expect(names.get('e')).toBe('Merlin 2');
    expect(new Set([...names.values()].map((n) => n.toLowerCase())).size).toBe(5);
  });

  it('trims long names to the game limit', () => {
    expect(toSeatName('A very long display name indeed')!.length).toBeLessThanOrEqual(20);
  });
});

describe('validation', () => {
  it('fills defaults and sanitizes text', () => {
    const draft = parseTournamentDraft({ name: '  Spring​   Cup ' }, T0);
    expect(draft).toMatchObject({ name: 'Spring Cup', description: '', format: 'series', visibility: 'public', startsAt: null });
    expect(draft.settings).toEqual(DEFAULT_TOURNAMENT_SETTINGS);
    expect(sanitizeTournamentDescription('a\r\n\r\n\r\n\r\nb   c')).toBe('a\n\nb c');
    expect(codeOf(() => sanitizeTournamentName('ab'))).toBe('invalid_input');
    // Counted like the database's char_length: an emoji is one character, not two UTF-16 units.
    expect(codeOf(() => sanitizeTournamentName('A🐉'))).toBe('invalid_input');
    expect(sanitizeTournamentName('🏆'.repeat(48))).toBe('🏆'.repeat(48));
    expect(codeOf(() => sanitizeTournamentDescription('x'.repeat(281)))).toBe('invalid_input');
  });

  it('validates settings and format specific rules', () => {
    const ok = parseTournamentDraft(
      { name: 'Cup', format: 'knockout', settings: { maxEntrants: 32, maxTableSize: 6, advancePerTable: 2, fillWithBots: true, botDifficulty: BotDifficulty.HARD } },
      T0
    );
    expect(ok.settings).toMatchObject({ maxEntrants: 32, maxTableSize: 6, advancePerTable: 2, fillWithBots: true, botDifficulty: BotDifficulty.HARD });
    expect(codeOf(() => parseTournamentDraft({ name: 'Cup', settings: { maxEntrants: 65 } }, T0))).toBe('invalid_input');
    expect(codeOf(() => parseTournamentDraft({ name: 'Cup', settings: { maxTableSize: 7 } }, T0))).toBe('invalid_input');
    expect(codeOf(() => parseTournamentDraft({ name: 'Cup', settings: { rounds: 8 } }, T0))).toBe('invalid_input');
    expect(codeOf(() => parseTournamentDraft({ name: 'Cup', settings: { botDifficulty: 9 } }, T0))).toBe('invalid_input');
    expect(codeOf(() => parseTournamentDraft({ name: 'Cup', format: 'knockout', settings: { maxTableSize: 4, advancePerTable: 4 } }, T0))).toBe('invalid_input');
    expect(codeOf(() => parseTournamentDraft({ name: 'Cup', format: 'league' }, T0))).toBe('invalid_input');
    expect(codeOf(() => parseTournamentDraft({ name: 'Cup', settings: { rulesetConfig: 'nope' } }, T0))).toBe('invalid_input');
    expect(codeOf(() => parseTournamentDraft('nope', T0))).toBe('invalid_input');
  });

  it('bounds the scheduled start', () => {
    expect(parseStartsAt(null, T0)).toBeNull();
    expect(parseStartsAt(T0 + 3_600_000, T0)).toBe(T0 + 3_600_000);
    expect(parseStartsAt(new Date(T0 + 3_600_000).toISOString(), T0)).toBe(T0 + 3_600_000);
    expect(codeOf(() => parseStartsAt(T0 - 1, T0))).toBe('invalid_input');
    expect(codeOf(() => parseStartsAt(T0 + 61 * 24 * 3_600_000, T0))).toBe('invalid_input');
  });

  it('applies partial changes over the current draft', () => {
    const current = parseTournamentDraft({ name: 'Cup', description: 'old', settings: { rounds: 5 } }, T0);
    const next = parseTournamentChanges({ name: 'New Cup', settings: { maxEntrants: 8 } }, current, T0);
    expect(next).toMatchObject({ name: 'New Cup', description: 'old' });
    expect(next.settings).toMatchObject({ rounds: 5, maxEntrants: 8 });
    expect(parseTournamentChanges({ description: null, startsAt: null }, current, T0)).toMatchObject({ description: '', startsAt: null });
  });
});

describe('rankMatchSeats', () => {
  it('ranks by score with shared placements and puts no-shows last', () => {
    const placements = rankMatchSeats([
      { id: 'a', score: 50, noShow: false },
      { id: 'bot', score: 90, noShow: false },
      { id: 'b', score: 50, noShow: false },
      { id: 'gone', score: 200, noShow: true },
      { id: 'c', score: 10, noShow: false },
    ]);
    expect(Object.fromEntries(placements)).toEqual({ bot: 1, a: 2, b: 2, c: 4, gone: 5 });
  });
});
