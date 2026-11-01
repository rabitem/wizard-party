import { describe, expect, it } from 'vitest';

import { HOST_ID, T0, humansOf, pendingMatches, playRound, playToCompletion, reportFor, testDraft, testTournament, userId, withEntrants } from '../tournament.fixtures';
import { recordMatchResult, startTournament } from '../tournament';
import { computeStandings } from '../standings';
import { TOURNAMENT_LIMITS } from '../tournament.constants';
import type { Tournament, TournamentSettings } from '../tournament.types';
import { KNOCKOUT_FORMAT, SERIES_FORMAT, advanceCount } from './index';

function started(count: number, overrides: Parameters<typeof testDraft>[0] = {}): Tournament {
  return startTournament(withEntrants(testTournament(testDraft(overrides)), count), HOST_ID, T0 + 1000);
}

function tableSizes(tournament: Tournament, round = tournament.currentRound): number[] {
  return tournament.matches.filter((match) => match.round === round).map((match) => match.seats.length);
}

describe('Swiss series', () => {
  it('draws round 1 deterministically from the tournament id', () => {
    const a = started(12, { settings: { maxTableSize: 4 } });
    const b = started(12, { settings: { maxTableSize: 4 } });
    expect(a.matches.map(humansOf)).toEqual(b.matches.map(humansOf));
    const other = startTournament(withEntrants(testTournament(testDraft({ settings: { maxTableSize: 4 } }), 'zzzzzzzzzz22'), 12), HOST_ID, T0 + 1000);
    expect(other.matches.map(humansOf)).not.toEqual(a.matches.map(humansOf));
  });

  it('seats every entrant exactly once per round at balanced tables', () => {
    const tournament = started(13, { settings: { maxTableSize: 5 } });
    expect(tableSizes(tournament)).toEqual([5, 4, 4]);
    expect(tournament.matches.flatMap(humansOf).sort()).toEqual(tournament.entrants.map((e) => e.userId).sort());
  });

  it('seats later rounds by standings (Swiss) and completes after the configured rounds', () => {
    let tournament = started(8, { settings: { maxTableSize: 4, rounds: 3 } });
    tournament = playRound(tournament, T0 + 60_000);
    expect(tournament.currentRound).toBe(2);
    // Both round 1 winners (and both runners-up) meet at table 1 in round 2.
    const leaders = computeStandings({ ...tournament, matches: tournament.matches.filter((m) => m.round === 1) })
      .slice(0, 4)
      .map((s) => s.userId)
      .sort();
    const table1 = humansOf(tournament.matches.find((m) => m.round === 2 && m.table === 1)!).sort();
    expect(table1).toEqual(leaders);
    tournament = playToCompletion(tournament);
    expect(tournament.status).toBe('completed');
    expect(tournament.currentRound).toBe(3);
    expect(tournament.matches).toHaveLength(6);
  });

  it('pads a tiny field with bots when allowed', () => {
    const tournament = started(2, { settings: { fillWithBots: true } });
    expect(tournament.matches).toHaveLength(1);
    expect(tournament.matches[0].seats.filter((s) => s.userId === null)).toHaveLength(1);
  });

  it('rejects round counts outside the limits', () => {
    expect(SERIES_FORMAT.validateSettings({ rounds: 0 } as TournamentSettings)).toMatch(/rounds/);
    expect(SERIES_FORMAT.validateSettings({ rounds: TOURNAMENT_LIMITS.MAX_ROUNDS + 1 } as TournamentSettings)).toMatch(/rounds/);
    expect(SERIES_FORMAT.validateSettings({ rounds: 3 } as TournamentSettings)).toBeNull();
  });
});

describe('knockout', () => {
  it('advances half of each table by default and at least leaves one behind', () => {
    expect(advanceCount(3, null)).toBe(2);
    expect(advanceCount(4, null)).toBe(2);
    expect(advanceCount(5, null)).toBe(3);
    expect(advanceCount(6, 9)).toBe(5);
    expect(advanceCount(1, null)).toBe(1);
  });

  it('spreads seeds over the round 1 tables in snake order', () => {
    const tournament = started(9, { format: 'knockout', settings: { maxTableSize: 3 } });
    const tables = tournament.matches.map((match) => humansOf(match).sort());
    expect(tables).toEqual([[userId(1), userId(6), userId(7)], [userId(2), userId(5), userId(8)], [userId(3), userId(4), userId(9)]]);
  });

  it('plays down to a single final table, then completes', () => {
    let tournament = started(9, { format: 'knockout', settings: { maxTableSize: 6 } });
    expect(tableSizes(tournament)).toEqual([5, 4]);
    tournament = playRound(tournament, T0 + 60_000);
    expect(tableSizes(tournament)).toEqual([5]);
    expect(KNOCKOUT_FORMAT.roundLabel(tournament, 2)).toBe('Final');
    expect(tournament.entrants.filter((e) => e.status === 'eliminated')).toHaveLength(4);
    tournament = playRound(tournament, T0 + 120_000);
    expect(tournament.status).toBe('completed');
    const final = tournament.matches.find((m) => m.round === 2)!;
    const finalWinner = final.result!.players.find((p) => p.placement === 1)!.userId;
    expect(tournament.entrants.find((e) => e.final?.rank === 1)!.userId).toBe(finalWinner);
  });

  it('completes for every field size and table size, with a unique ranking', () => {
    for (let max = 3; max <= 6; max++) {
      for (const fillWithBots of [false, true]) {
        for (let count = 3; count <= 64; count += count < 20 ? 1 : 7) {
          let tournament: Tournament;
          try {
            tournament = started(count, { format: 'knockout', settings: { maxTableSize: max, fillWithBots, maxEntrants: 64 } });
          } catch {
            // Unseatable without bots (e.g. 4 players at tables of 3) is refused at the start.
            expect(fillWithBots).toBe(false);
            continue;
          }
          tournament = playToCompletion(tournament);
          expect(tournament.status).toBe('completed');
          const ranks = tournament.entrants.map((e) => e.final?.rank).sort((a, b) => a! - b!);
          expect(ranks).toEqual(Array.from({ length: count }, (_, i) => i + 1));
          // The last round is a single table.
          expect(tournament.matches.filter((m) => m.round === tournament.currentRound)).toHaveLength(1);
          expect(tournament.currentRound).toBeLessThanOrEqual(KNOCKOUT_FORMAT.expectedRounds(tournament.settings, count) + 1);
        }
      }
    }
  });

  it('cuts to the best seatable survivors when tables of 3 cannot hold them', () => {
    // 9 at tables of 3 -> 6 advance -> 2 tables -> 4 advance, which can't be seated at tables of 3.
    let tournament = started(9, { format: 'knockout', settings: { maxTableSize: 3 } });
    tournament = playRound(tournament, T0 + 60_000);
    expect(tableSizes(tournament)).toEqual([3, 3]);
    tournament = playRound(tournament, T0 + 120_000);
    expect(tableSizes(tournament)).toEqual([3]);
    expect(KNOCKOUT_FORMAT.roundLabel(tournament, 3)).toBe('Final');
  });

  it('plays a Final with a bot when only two advance, even without bots', () => {
    let tournament = started(6, { format: 'knockout', settings: { maxTableSize: 3, advancePerTable: 1 } });
    tournament = playRound(tournament, T0 + 60_000);
    const [final] = pendingMatches(tournament);
    expect(pendingMatches(tournament)).toHaveLength(1);
    expect(humansOf(final)).toHaveLength(2);
    expect(final.seats.filter((seat) => seat.userId === null)).toHaveLength(1);
    expect(KNOCKOUT_FORMAT.roundLabel(tournament, 2)).toBe('Final');
    tournament = playRound(tournament, T0 + 120_000);
    expect(tournament.status).toBe('completed');
  });

  it('never advances no-shows, and voided tables advance nobody', () => {
    let tournament = started(8, { format: 'knockout', settings: { maxTableSize: 4 } });
    const [first, second] = pendingMatches(tournament);
    const order = humansOf(first).sort();
    tournament = recordMatchResult(tournament, reportFor(first, order, { noShow: [order[0]] }), T0 + 5000).tournament;
    tournament = recordMatchResult(tournament, reportFor(second, humansOf(second).sort()), T0 + 6000).tournament;
    const finalists = humansOf(pendingMatches(tournament)[0]);
    expect(finalists).not.toContain(order[0]);
    expect(finalists).toContain(order[1]);
  });

  it('validates advancePerTable against the table size', () => {
    expect(KNOCKOUT_FORMAT.validateSettings({ advancePerTable: 4, maxTableSize: 4 } as TournamentSettings)).toMatch(/advance/);
    expect(KNOCKOUT_FORMAT.validateSettings({ advancePerTable: 1, maxTableSize: 4 } as TournamentSettings)).toBeNull();
    expect(KNOCKOUT_FORMAT.validateSettings({ advancePerTable: null, maxTableSize: 4 } as TournamentSettings)).toBeNull();
  });
});
