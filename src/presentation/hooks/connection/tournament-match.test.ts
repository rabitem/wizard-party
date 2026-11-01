import { describe, expect, it } from 'vitest';

import type { TournamentMatchRoomState } from '@shared/domain/tournament';
import { TOURNAMENT_WIRE_LIMITS } from '@shared/tournament/tournament-wire';

import { clockOffsetOf, readTournamentMatch, sameTournamentMatch } from './tournament-match';

const TID = 'abcdefghjk23';

function wireMatch(overrides: Record<string, unknown> = {}) {
  return {
    tournamentId: TID,
    matchId: `${TID}-2-1`,
    label: 'Spring Cup · Round 2 · Table 1',
    round: 2,
    table: 1,
    roster: [
      { name: 'Morgana', seat: 2, joined: false, noShow: false },
      { name: 'Merlin', seat: 0, joined: true, noShow: false },
      { name: 'Gandalf', seat: 1, joined: false, noShow: true },
    ],
    bots: 1,
    autoStartAt: null,
    noShowDeadlineAt: 10_000,
    reported: false,
    ...overrides,
  };
}

const message = (tournamentMatch: unknown) => ({ type: 'GAME_STATE', state: {}, tournamentMatch });

describe('readTournamentMatch', () => {
  it('should return null for casual rooms', () => {
    expect(readTournamentMatch({ type: 'GAME_STATE', state: {} })).toBeNull();
    expect(readTournamentMatch(null)).toBeNull();
    expect(readTournamentMatch('GAME_STATE')).toBeNull();
  });

  it('should read the match with the roster in seat order', () => {
    const match = readTournamentMatch(message(wireMatch()));
    expect(match).toMatchObject({ tournamentId: TID, round: 2, table: 1, bots: 1, autoStartAt: null, noShowDeadlineAt: 10_000, reported: false });
    expect(match?.roster.map((seat) => seat.name)).toEqual(['Merlin', 'Gandalf', 'Morgana']);
  });

  it('should move worker times onto the device clock', () => {
    const match = readTournamentMatch(message(wireMatch({ autoStartAt: 20_000 })), 5_000);
    expect(match?.autoStartAt).toBe(15_000);
    expect(match?.noShowDeadlineAt).toBe(5_000);
    expect(readTournamentMatch(message(wireMatch()), Number.NaN)?.noShowDeadlineAt).toBe(10_000);
  });

  it.each([
    ['an invalid tournament id', { tournamentId: 'nope' }],
    ['an empty match id', { matchId: '' }],
    ['an empty label', { label: '' }],
    ['an over-long label', { label: 'x'.repeat(TOURNAMENT_WIRE_LIMITS.MAX_LABEL_LENGTH + 1) }],
    ['round 0', { round: 0 }],
    ['a fractional table', { table: 1.5 }],
    ['an empty roster', { roster: [] }],
    ['a roster larger than a table', { roster: Array.from({ length: 7 }, (_, seat) => ({ name: `P${seat}`, seat, joined: true, noShow: false })) }],
    ['a malformed seat', { roster: [{ name: 'Merlin', seat: 0, joined: 'yes', noShow: false }] }],
    ['negative bots', { bots: -1 }],
    ['a non-numeric deadline', { noShowDeadlineAt: 'soon' }],
  ])('should reject %s', (_case, overrides) => {
    expect(readTournamentMatch(message(wireMatch(overrides)))).toBeNull();
  });

  it('should treat anything but true as not reported', () => {
    expect(readTournamentMatch(message(wireMatch({ reported: 'true' })))?.reported).toBe(false);
    expect(readTournamentMatch(message(wireMatch({ reported: true })))?.reported).toBe(true);
  });

  it('should read the outcome, the deadline (on the device clock) and the expiry', () => {
    const match = readTournamentMatch(message(wireMatch({ reported: true, reportOutcome: 'superseded', deadlineAt: 90_000, expired: true })), 5_000);
    expect(match).toMatchObject({ reportOutcome: 'superseded', deadlineAt: 85_000, expired: true });
    expect(readTournamentMatch(message(wireMatch({ reported: true, reportOutcome: 'rejected' })))?.reportOutcome).toBe('rejected');
  });

  it('should default what workers from before the deadline do not send', () => {
    expect(readTournamentMatch(message(wireMatch()))).toMatchObject({ reportOutcome: null, deadlineAt: null, expired: false });
    const garbled = readTournamentMatch(message(wireMatch({ reportOutcome: 'won', deadlineAt: 'soon', expired: 'yes' })));
    expect(garbled).toMatchObject({ reportOutcome: null, deadlineAt: null, expired: false });
  });
});

describe('clockOffsetOf', () => {
  it('should be the worker clock minus the device clock', () => {
    expect(clockOffsetOf(1_500, 1_000)).toBe(500);
    expect(clockOffsetOf(undefined, 1_000)).toBe(0);
    expect(clockOffsetOf(Number.POSITIVE_INFINITY, 1_000)).toBe(0);
  });
});

describe('sameTournamentMatch', () => {
  const base = readTournamentMatch(message(wireMatch())) as TournamentMatchRoomState;

  it('should keep matches equal across messages without changes or with clock jitter', () => {
    expect(sameTournamentMatch(base, readTournamentMatch(message(wireMatch())))).toBe(true);
    expect(sameTournamentMatch(base, readTournamentMatch(message(wireMatch()), 400))).toBe(true);
    expect(sameTournamentMatch(null, null)).toBe(true);
  });

  it('should notice joins, no-shows, new deadlines and the report', () => {
    const joined = wireMatch({ roster: [{ name: 'Merlin', seat: 0, joined: true, noShow: false }, { name: 'Gandalf', seat: 1, joined: true, noShow: false }, { name: 'Morgana', seat: 2, joined: false, noShow: false }] });
    expect(sameTournamentMatch(base, readTournamentMatch(message(joined)))).toBe(false);
    expect(sameTournamentMatch(base, readTournamentMatch(message(wireMatch({ autoStartAt: 12_000 }))))).toBe(false);
    expect(sameTournamentMatch(base, readTournamentMatch(message(wireMatch({ reported: true }))))).toBe(false);
    expect(sameTournamentMatch(base, readTournamentMatch(message(wireMatch({ reportOutcome: 'recorded' }))))).toBe(false);
    expect(sameTournamentMatch(base, readTournamentMatch(message(wireMatch({ expired: true }))))).toBe(false);
    expect(sameTournamentMatch(base, readTournamentMatch(message(wireMatch({ deadlineAt: 90_000 }))))).toBe(false);
    expect(sameTournamentMatch(base, null)).toBe(false);
  });
});
