import { describe, expect, it } from 'vitest';

import { isTournamentError } from './tournament-error';
import { HOST_ID, T0, humansOf, reportFor, testDraft, testTournament, withEntrants } from './tournament.fixtures';
import { applyDueTransitions, canResolveMatch, cancelTournament, recordMatchResult, resolveStaleMatch, startTournament } from './tournament';
import { isMatchActive, matchActiveUntil, matchResolvableAt, matchStaleAt, recordMatchProgress } from './match-activity';
import { TOURNAMENT_TIMING } from './tournament.constants';
import type { MatchProgress, Tournament, TournamentMatch } from './tournament.types';

const GRACE = TOURNAMENT_TIMING.MATCH_ACTIVITY_GRACE_MS;

const running = () => startTournament(withEntrants(testTournament(testDraft({ settings: { rounds: 2 } })), 3), HOST_ID, T0);

function progressOf(match: TournamentMatch, overrides: Partial<MatchProgress> = {}): MatchProgress {
  return { matchId: match.id, roomCode: match.roomCode, round: 1, maxRounds: 20, at: T0 + 1000, ...overrides };
}

function only(tournament: Tournament): TournamentMatch {
  return tournament.matches[0];
}

function expectCode(fn: () => unknown, code: Parameters<typeof isTournamentError>[1]) {
  try {
    fn();
  } catch (error) {
    expect(isTournamentError(error, code), String(error)).toBe(true);
    return;
  }
  throw new Error(`expected TournamentError ${code}`);
}

describe('recordMatchProgress', () => {
  it('should keep the worker heartbeat well inside the activity grace (a lost ping never opens a table in play)', () => {
    expect(TOURNAMENT_TIMING.MATCH_PROGRESS_HEARTBEAT_MS * 3).toBeLessThanOrEqual(GRACE);
  });

  it('stores the live state of a pending table', () => {
    const tournament = running();
    const { tournament: next, outcome } = recordMatchProgress(tournament, progressOf(only(tournament), { round: 4, maxRounds: 20 }), T0 + 2000);
    expect(outcome).toBe('recorded');
    expect(only(next).live).toEqual({ round: 4, maxRounds: 20, lastActivityAt: T0 + 1000 });
    expect(only(tournament).live).toBeNull();
  });

  it('never dates activity after the moment the server saw it', () => {
    const tournament = running();
    const ahead = recordMatchProgress(tournament, progressOf(only(tournament), { at: T0 + 60_000 }), T0 + 2000).tournament;
    expect(only(ahead).live?.lastActivityAt).toBe(T0 + 2000);
  });

  it('ignores pings that are not newer than the stored state, without a new object', () => {
    const tournament = running();
    const first = recordMatchProgress(tournament, progressOf(only(tournament), { round: 3, at: T0 + 5000 }), T0 + 5000).tournament;
    const older = recordMatchProgress(first, progressOf(only(first), { round: 2, at: T0 + 4000 }), T0 + 6000);
    expect(older).toEqual({ tournament: first, outcome: 'ignored' });
    expect(older.tournament).toBe(first);
    expect(recordMatchProgress(first, progressOf(only(first), { round: 3, at: T0 + 5000 }), T0 + 6000).outcome).toBe('ignored');
    expect(recordMatchProgress(first, progressOf(only(first), { round: 2, at: T0 + 7000 }), T0 + 7000).outcome).toBe('ignored');
    expect(recordMatchProgress(first, progressOf(only(first), { round: 4, at: T0 + 7000 }), T0 + 7000).outcome).toBe('recorded');
  });

  it('ignores pings for decided tables and tournaments that are no longer running', () => {
    const tournament = running();
    const match = only(tournament);
    const played = recordMatchResult(tournament, reportFor(match, humansOf(match).sort()), T0 + 1000).tournament;
    expect(recordMatchProgress(played, progressOf(match), T0 + 2000).outcome).toBe('ignored');

    const voided = applyDueTransitions(tournament, match.deadlineAt);
    expect(recordMatchProgress(voided, progressOf(match), match.deadlineAt + 1).outcome).toBe('ignored');

    const cancelled = cancelTournament(tournament, HOST_ID, T0 + 500);
    expect(recordMatchProgress(cancelled, progressOf(match), T0 + 2000).outcome).toBe('ignored');
  });

  it('rejects pings for another room or an unknown match', () => {
    const tournament = running();
    const match = only(tournament);
    expectCode(() => recordMatchProgress(tournament, progressOf(match, { roomCode: 't-otherroom2345' }), T0), 'invalid_input');
    expectCode(() => recordMatchProgress(tournament, progressOf(match, { round: 5, maxRounds: 4 }), T0), 'invalid_input');
    expectCode(() => recordMatchProgress(tournament, progressOf(match, { matchId: 'abcdefghjk23-9-9' }), T0), 'not_found');
  });
});

describe('activity and resolving', () => {
  it('keeps a table active for the grace period after its last ping', () => {
    const tournament = running();
    const match = only(recordMatchProgress(tournament, progressOf(only(tournament), { at: T0 + 1000 }), T0 + 1000).tournament);
    expect(matchActiveUntil(only(tournament))).toBeNull();
    expect(isMatchActive(only(tournament), T0)).toBe(false);
    expect(matchActiveUntil(match)).toBe(T0 + 1000 + GRACE);
    expect(isMatchActive(match, T0 + 1000 + GRACE - 1)).toBe(true);
    expect(isMatchActive(match, T0 + 1000 + GRACE)).toBe(false);
  });

  it('lets the host resolve a stale table only once it went quiet', () => {
    const tournament = running();
    const stale = matchStaleAt(only(tournament));
    const lastPing = stale - 60_000;
    const playing = recordMatchProgress(tournament, progressOf(only(tournament), { round: 7, at: lastPing }), lastPing).tournament;
    const match = only(playing);

    expect(matchResolvableAt(match)).toBe(lastPing + GRACE);
    expect(canResolveMatch(playing, HOST_ID, match, stale)).toBe(false);
    expectCode(() => resolveStaleMatch(playing, HOST_ID, match.id, stale), 'invalid_state');

    expect(canResolveMatch(playing, HOST_ID, match, lastPing + GRACE)).toBe(true);
    expect(only(resolveStaleMatch(playing, HOST_ID, match.id, lastPing + GRACE)).status).toBe('void');
  });

  it('keeps the plain stale rule for tables that never reported progress', () => {
    const tournament = running();
    const match = only(tournament);
    expect(matchResolvableAt(match)).toBe(matchStaleAt(match));
    expect(canResolveMatch(tournament, HOST_ID, match, matchStaleAt(match))).toBe(true);
  });

  it('still voids an active table at its hard deadline', () => {
    const tournament = running();
    const match = only(tournament);
    const ping = match.deadlineAt - 1000;
    const playing = recordMatchProgress(tournament, progressOf(match, { at: ping }), ping).tournament;
    expect(only(applyDueTransitions(playing, match.deadlineAt)).status).toBe('void');
  });
});
