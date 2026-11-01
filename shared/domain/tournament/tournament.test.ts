import { describe, expect, it } from 'vitest';

import { isTournamentError } from './tournament-error';
import { HOST_ID, T0, humansOf, pendingMatches, playRound, playToCompletion, reportFor, testDraft, testTournament, userId, withEntrants } from './tournament.fixtures';
import {
  applyDueTransitions,
  cancelTournament,
  isFinalRound,
  matchLabel,
  pendingMatchFor,
  recordMatchResult,
  registerEntrant,
  registrationDueAt,
  resolveStaleMatch,
  startTournament,
  updateTournament,
  withdrawEntrant,
} from './tournament';
import { matchStaleAt } from './match-activity';
import { involvedUserIds, participationOf, tournamentAwardXp } from './participation';
import { TOURNAMENT_TIMING } from './tournament.constants';
import { placementPoints } from './match-records';

const player = (id: string, level = 1) => ({ userId: id, username: id, displayName: id.toUpperCase(), level });

function expectCode(fn: () => unknown, code: Parameters<typeof isTournamentError>[1]) {
  try {
    fn();
  } catch (error) {
    expect(isTournamentError(error, code), String(error)).toBe(true);
    return;
  }
  throw new Error(`expected TournamentError ${code}`);
}

describe('registration', () => {
  it('registers players in join order and rejects duplicates and overflow', () => {
    let tournament = testTournament(testDraft({ settings: { maxEntrants: 3 } }));
    tournament = withEntrants(tournament, 3);
    expect(tournament.entrants.map((e) => [e.userId, e.seed, e.status])).toEqual([
      [userId(1), 1, 'registered'],
      [userId(2), 2, 'registered'],
      [userId(3), 3, 'registered'],
    ]);
    expectCode(() => registerEntrant(tournament, player(userId(1)), { now: T0 }), 'already_registered');
    expectCode(() => registerEntrant(tournament, player('late'), { now: T0 }), 'full');
  });

  it('requires the invite code for private tournaments, except for the host', () => {
    const tournament = testTournament(testDraft({ visibility: 'private' }));
    expect(tournament.inviteCode).toBe('zxcvbnm2');
    expectCode(() => registerEntrant(tournament, player('a'), { now: T0 }), 'forbidden');
    expectCode(() => registerEntrant(tournament, player('a'), { now: T0, inviteCode: 'wrongone' }), 'forbidden');
    expect(registerEntrant(tournament, player('a'), { now: T0, inviteCode: ' ZXCVBNM2 ' }).entrants).toHaveLength(1);
    expect(registerEntrant(tournament, player(HOST_ID), { now: T0 }).entrants).toHaveLength(1);
  });

  it('withdraws by removing the entry and renumbering seeds', () => {
    const tournament = withdrawEntrant(withEntrants(testTournament(), 3), userId(1));
    expect(tournament.entrants.map((e) => [e.userId, e.seed])).toEqual([
      [userId(2), 1],
      [userId(3), 2],
    ]);
    expectCode(() => withdrawEntrant(tournament, userId(1)), 'not_registered');
  });

  it('lets only the host edit, and only before the start', () => {
    const tournament = withEntrants(testTournament(), 4);
    expectCode(() => updateTournament(tournament, userId(1), testDraft(), 'newcode2'), 'forbidden');
    expectCode(() => updateTournament(tournament, HOST_ID, testDraft({ settings: { maxEntrants: 3 } }), 'newcode2'), 'invalid_input');
    const privateOne = updateTournament(tournament, HOST_ID, testDraft({ visibility: 'private', name: 'Renamed' }), 'newcode2');
    expect(privateOne.name).toBe('Renamed');
    expect(privateOne.inviteCode).toBe('newcode2');
    expect(updateTournament(privateOne, HOST_ID, testDraft({ visibility: 'public' }), 'other222').inviteCode).toBeNull();
    const running = startTournament(tournament, HOST_ID, T0 + 10);
    expectCode(() => updateTournament(running, HOST_ID, testDraft(), 'x'), 'invalid_state');
    expectCode(() => registerEntrant(running, player('late'), { now: T0 }), 'invalid_state');
    expectCode(() => withdrawEntrant(running, userId(1)), 'invalid_state');
  });
});

describe('start and cancel', () => {
  it('needs the host and enough entrants', () => {
    expectCode(() => startTournament(withEntrants(testTournament(), 3), userId(1), T0), 'forbidden');
    expectCode(() => startTournament(withEntrants(testTournament(), 2), HOST_ID, T0), 'too_few_entrants');
    expect(startTournament(withEntrants(testTournament(testDraft({ settings: { fillWithBots: true } })), 2), HOST_ID, T0).status).toBe('running');
  });

  it('refuses a field that cannot be seated without bots', () => {
    expectCode(() => startTournament(withEntrants(testTournament(testDraft({ settings: { maxTableSize: 3 } })), 4), HOST_ID, T0), 'invalid_state');
  });

  it('seeds by level, then registration order, and seats round 1', () => {
    const levels = [5, 9, 5, 20];
    const tournament = startTournament(withEntrants(testTournament(), 4, (i) => levels[i - 1]), HOST_ID, T0 + 100);
    expect([...tournament.entrants].sort((a, b) => a.seed - b.seed).map((e) => e.userId)).toEqual([userId(4), userId(2), userId(1), userId(3)]);
    expect(tournament.entrants.every((e) => e.status === 'active')).toBe(true);
    expect(tournament.status).toBe('running');
    expect(tournament.currentRound).toBe(1);
    const [match] = tournament.matches;
    expect(match.deadlineAt).toBe(T0 + 100 + TOURNAMENT_TIMING.MATCH_HARD_TIMEOUT_MS);
    expect(match.roomCode).toMatch(/^t-/);
    expect(pendingMatchFor(tournament, userId(1))?.id).toBe(match.id);
    expect(pendingMatchFor(tournament, 'stranger')).toBeNull();
    expect(matchLabel(tournament, match)).toBe('Spring Cup · Round 1');
  });

  it('cancels while registration or running, never twice', () => {
    const cancelled = cancelTournament(withEntrants(testTournament(), 3), HOST_ID, T0 + 5);
    expect(cancelled).toMatchObject({ status: 'cancelled', cancelledAt: T0 + 5 });
    expectCode(() => cancelTournament(cancelled, HOST_ID, T0), 'invalid_state');
    expectCode(() => cancelTournament(withEntrants(testTournament(), 3), userId(1), T0), 'forbidden');
  });
});

describe('match results', () => {
  const running = () => startTournament(withEntrants(testTournament(testDraft({ settings: { rounds: 2 } })), 4), HOST_ID, T0 + 100);

  it('records points normalized by table size and is idempotent per match', () => {
    const tournament = running();
    const [match] = tournament.matches;
    const report = reportFor(match, humansOf(match).sort());
    const first = recordMatchResult(tournament, report, T0 + 5000);
    expect(first.outcome).toBe('recorded');
    const recorded = first.tournament.matches.find((m) => m.id === match.id)!;
    expect(recorded.status).toBe('completed');
    expect(recorded.result!.players.find((p) => p.placement === 1)!.points).toBe(placementPoints(1, 4));
    expect(placementPoints(1, 4)).toBe(12);
    expect(placementPoints(4, 4)).toBe(0);
    expect(placementPoints(2, 3)).toBe(5);
    // Round 1 complete: round 2 was seated.
    expect(first.tournament.currentRound).toBe(2);
    const again = recordMatchResult(first.tournament, report, T0 + 6000);
    expect(again.outcome).toBe('duplicate');
    expect(again.tournament).toBe(first.tournament);
  });

  it('rejects results whose roster or room does not match the table', () => {
    const tournament = running();
    const [match] = tournament.matches;
    const order = humansOf(match).sort();
    expectCode(() => recordMatchResult(tournament, { ...reportFor(match, order), roomCode: 't-other' }, T0), 'invalid_input');
    expectCode(() => recordMatchResult(tournament, reportFor(match, [...order.slice(1), 'intruder']), T0), 'invalid_input');
    expectCode(() => recordMatchResult(tournament, reportFor(match, order.slice(1)), T0), 'invalid_input');
    const impossible = reportFor(match, order);
    expectCode(() => recordMatchResult(tournament, { ...impossible, players: impossible.players.map((p) => ({ ...p, placement: 9 })) }, T0), 'invalid_input');
    expectCode(() => recordMatchResult(tournament, { ...impossible, matchId: 'abcdefghjk23-9-9' }, T0), 'not_found');
  });

  it('ignores results of a tournament that was cancelled meanwhile', () => {
    const tournament = running();
    const cancelled = cancelTournament(tournament, HOST_ID, T0 + 200);
    const [match] = cancelled.matches;
    expect(recordMatchResult(cancelled, reportFor(match, humansOf(match)), T0 + 300).outcome).toBe('ignored');
  });

  it('answers a result that arrives after its match was voided as superseded, not as a re-delivery', () => {
    const tournament = running();
    const [match] = tournament.matches;
    const voided = applyDueTransitions(tournament, match.deadlineAt);
    expect(voided.matches[0].status).toBe('void');
    const late = recordMatchResult(voided, reportFor(match, humansOf(match).sort()), match.deadlineAt + 1);
    expect(late.outcome).toBe('superseded');
    expect(late.tournament).toBe(voided);
  });

  it('gives no-shows zero points and ranks them below everyone present', () => {
    const tournament = running();
    const [match] = tournament.matches;
    const order = humansOf(match).sort();
    const { tournament: next } = recordMatchResult(tournament, reportFor(match, order, { noShow: [order[0]] }), T0 + 5000);
    const result = next.matches[0].result!;
    expect(result.players.find((p) => p.userId === order[0])).toMatchObject({ points: 0, noShow: true, placement: 4 });
  });

  it('keeps no result for a seat whose account was deleted meanwhile', () => {
    const tournament = running();
    const [match] = tournament.matches;
    const order = humansOf(match).sort();
    const deleted = { ...tournament, entrants: tournament.entrants.filter((e) => e.userId !== order[1]) };
    const { tournament: next } = recordMatchResult(deleted, reportFor(match, order), T0 + 5000);
    expect(next.matches[0].result!.players.map((p) => p.userId)).toEqual(order.filter((id) => id !== order[1]));
  });

  it('completes with final ranks, awards and participations', () => {
    const done = playToCompletion(running());
    expect(done.status).toBe('completed');
    expect(isFinalRound(done, 2)).toBe(true);
    const champion = done.entrants.find((e) => e.final?.rank === 1)!;
    expect(champion.userId).toBe(userId(1));
    expect(champion.final).toMatchObject({ tableWins: 2, matchesPlayed: 2, roundsPlayed: 2, flawless: true });
    expect(done.awards.filter((a) => a.awardId === 'champion').map((a) => a.userId)).toEqual([userId(1)]);
    // Four entrants plus the host, who did not play.
    expect(involvedUserIds(done)).toHaveLength(5);
    expect(participationOf(done, HOST_ID)).toMatchObject({ wasHost: true, wasEntrant: false, finalRank: null, awards: [] });
    expect(participationOf(done, 'stranger')).toBeNull();
    const mine = [participationOf(done, userId(1))!];
    expect(mine[0]).toMatchObject({ finalRank: 1, flawless: true, entrants: 4, totalRounds: 2, format: 'series' });
    expect(tournamentAwardXp(mine)).toBeGreaterThan(0);
  });
});

describe('stale matches and lazy transitions', () => {
  it('lets the host void a stale match, not earlier and not anyone else', () => {
    const tournament = startTournament(withEntrants(testTournament(testDraft({ settings: { rounds: 1 } })), 3), HOST_ID, T0);
    const [match] = tournament.matches;
    expectCode(() => resolveStaleMatch(tournament, HOST_ID, match.id, matchStaleAt(match) - 1), 'invalid_state');
    expectCode(() => resolveStaleMatch(tournament, userId(1), match.id, matchStaleAt(match)), 'forbidden');
    const resolved = resolveStaleMatch(tournament, HOST_ID, match.id, matchStaleAt(match));
    expect(resolved.matches[0].status).toBe('void');
    expect(resolved.matches[0].result!.players.every((p) => p.points === 0 && p.placement === 3)).toBe(true);
    // The only round is over: the tournament completed, nobody earned a podium award.
    expect(resolved.status).toBe('completed');
    expect(resolved.awards).toEqual([]);
  });

  it('never lets a host void a table they play at themselves', () => {
    const open = registerEntrant(withEntrants(testTournament(testDraft({ settings: { rounds: 1 } })), 2), player(HOST_ID), { now: T0, inviteCode: null });
    const tournament = startTournament(open, HOST_ID, T0);
    const [match] = tournament.matches;
    expect(humansOf(match)).toContain(HOST_ID);
    expectCode(() => resolveStaleMatch(tournament, HOST_ID, match.id, matchStaleAt(match)), 'forbidden');
    // It is still voided by its own deadline.
    expect(applyDueTransitions(tournament, match.deadlineAt).matches[0].status).toBe('void');
  });

  it('ends a series whose field can no longer be seated instead of getting stuck', () => {
    // 3 players at tables of up to 5, no bots: one account deleted after round 1 leaves 2.
    let tournament = startTournament(withEntrants(testTournament(testDraft({ settings: { rounds: 3, fillWithBots: false } })), 3), HOST_ID, T0);
    const gone = userId(3);
    tournament = { ...tournament, entrants: tournament.entrants.filter((e) => e.userId !== gone) };
    const [match] = pendingMatches(tournament);
    tournament = recordMatchResult(tournament, reportFor(match, humansOf(match).sort()), T0 + 1000).tournament;
    // Round 2 seats the two who are left with a bot.
    const [next] = pendingMatches(tournament);
    expect(humansOf(next).sort()).toEqual([userId(1), userId(2)]);
    expect(next.seats.filter((seat) => seat.userId === null)).toHaveLength(1);
    // Everyone else gone too: the series ends with the standings so far, and cancel still works.
    const lonely = { ...tournament, entrants: tournament.entrants.filter((e) => e.userId === userId(1)) };
    const due = applyDueTransitions(lonely, next.deadlineAt);
    expect(due.status).toBe('completed');
    expect(() => cancelTournament(applyDueTransitions(tournament, next.deadlineAt), HOST_ID, next.deadlineAt)).not.toThrow();
  });

  it('auto-starts a scheduled tournament once due', () => {
    const scheduled = withEntrants(testTournament(testDraft({ startsAt: T0 + 3_600_000 })), 3);
    expect(applyDueTransitions(scheduled, T0 + 3_599_999)).toBe(scheduled);
    expect(applyDueTransitions(scheduled, T0 + 3_600_000).status).toBe('running');
  });

  it('cancels a scheduled tournament that never got enough players', () => {
    const scheduled = withEntrants(testTournament(testDraft({ startsAt: T0 + 1000 })), 2);
    expect(applyDueTransitions(scheduled, T0 + 2000)).toBe(scheduled);
    expect(applyDueTransitions(scheduled, T0 + 1000 + TOURNAMENT_TIMING.UNSTARTED_GRACE_MS).status).toBe('cancelled');
  });

  it('closes an unscheduled registration after the maximum age', () => {
    const open = withEntrants(testTournament(), 1);
    expect(applyDueTransitions(open, T0 + TOURNAMENT_TIMING.REGISTRATION_MAX_AGE_MS - 1)).toBe(open);
    expect(applyDueTransitions(open, T0 + TOURNAMENT_TIMING.REGISTRATION_MAX_AGE_MS).status).toBe('cancelled');
  });

  it('voids overdue matches and advances the round', () => {
    let tournament = startTournament(withEntrants(testTournament(testDraft({ settings: { rounds: 2, maxTableSize: 3 } })), 6), HOST_ID, T0);
    const [first, second] = pendingMatches(tournament);
    tournament = recordMatchResult(tournament, reportFor(first, humansOf(first)), T0 + 1000).tournament;
    const due = applyDueTransitions(tournament, second.deadlineAt);
    expect(due.matches.find((m) => m.id === second.id)!.status).toBe('void');
    expect(due.currentRound).toBe(2);
    expect(pendingMatches(due)).toHaveLength(2);
    expect(applyDueTransitions(due, second.deadlineAt + 1)).toBe(due);
  });

  it('plays through when every round is reported on time', () => {
    const done = playRound(startTournament(withEntrants(testTournament(testDraft({ settings: { rounds: 1 } })), 5), HOST_ID, T0), T0 + 1);
    expect(done.status).toBe('completed');
    expect(applyDueTransitions(done, T0 + 10 * TOURNAMENT_TIMING.MATCH_HARD_TIMEOUT_MS)).toBe(done);
  });
});

describe('registrationDueAt', () => {
  it('is the scheduled start, or the registration expiry when unscheduled', () => {
    expect(registrationDueAt({ status: 'registration', startsAt: T0 + 60_000, createdAt: T0 })).toBe(T0 + 60_000);
    expect(registrationDueAt({ status: 'registration', startsAt: null, createdAt: T0 })).toBe(T0 + TOURNAMENT_TIMING.REGISTRATION_MAX_AGE_MS);
  });

  it('is null once registration is over', () => {
    for (const status of ['running', 'completed', 'cancelled'] as const) {
      expect(registrationDueAt({ status, startsAt: T0, createdAt: T0 })).toBeNull();
    }
  });
});
