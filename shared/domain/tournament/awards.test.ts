import { describe, expect, it } from 'vitest';

import { TOURNAMENT_AWARDS, awardXp, fieldSizeFactor, getTournamentAward } from './awards';
import { TOURNAMENT_XP } from './tournament.constants';
import { HOST_ID, T0, humansOf, pendingMatches, playRound, playToCompletion, reportFor, testDraft, testTournament, userId, withEntrants } from './tournament.fixtures';
import { applyDueTransitions, recordMatchResult, startTournament } from './tournament';
import type { Tournament } from './tournament.types';

function recipients(tournament: Tournament, awardId: string): string[] {
  return tournament.awards.filter((award) => award.awardId === awardId).map((award) => award.userId);
}

/** Plays a series where `rank` orders each table per round. */
function series(count: number, rounds: number, rankByRound: (round: number, humans: string[]) => string[], options: Parameters<typeof reportFor>[2] = {}) {
  let tournament = startTournament(withEntrants(testTournament(testDraft({ settings: { rounds, maxTableSize: 3 } })), count), HOST_ID, T0);
  for (let guard = 0; tournament.status === 'running' && guard < 10; guard++) {
    for (const match of pendingMatches(tournament)) {
      tournament = recordMatchResult(tournament, reportFor(match, rankByRound(match.round, humansOf(match)), options), T0 + guard * 1000 + 1).tournament;
    }
  }
  return tournament;
}

describe('award registry', () => {
  it('has unique ids and positive XP', () => {
    expect(new Set(TOURNAMENT_AWARDS.map((award) => award.id)).size).toBe(TOURNAMENT_AWARDS.length);
    for (const award of TOURNAMENT_AWARDS) expect(award.baseXp).toBeGreaterThan(0);
    expect(getTournamentAward('champion')?.tier).toBe('gold');
    expect(getTournamentAward('nope')).toBeNull();
  });

  it('scales XP with the field size, capped', () => {
    expect(fieldSizeFactor(3)).toBe(1);
    expect(fieldSizeFactor(13)).toBeCloseTo(1.5);
    expect(fieldSizeFactor(64)).toBe(TOURNAMENT_XP.FIELD_FACTOR_MAX);
    expect(awardXp({ baseXp: 100 }, 13)).toBe(150);
  });
});

describe('award rules', () => {
  const byId = (humans: string[]) => [...humans].sort();

  it('gives the podium, finisher and iron mage awards', () => {
    const done = series(6, 2, (_round, humans) => byId(humans));
    expect(recipients(done, 'champion')).toHaveLength(1);
    expect(recipients(done, 'runner-up')).toHaveLength(1);
    expect(recipients(done, 'third-place')).toHaveLength(1);
    expect(new Set([...recipients(done, 'champion'), ...recipients(done, 'runner-up'), ...recipients(done, 'third-place')]).size).toBe(3);
    expect(recipients(done, 'finisher').sort()).toEqual(done.entrants.map((e) => e.userId).sort());
    expect(recipients(done, 'iron-mage').sort()).toEqual(done.entrants.map((e) => e.userId).sort());
    const champion = done.awards.find((award) => award.awardId === 'champion')!;
    expect(champion.xp).toBe(awardXp(getTournamentAward('champion')!, 6));
  });

  it('withholds finisher and iron mage from no-shows', () => {
    const done = series(3, 2, (_round, humans) => byId(humans), { noShow: [userId(3)] });
    expect(recipients(done, 'finisher')).not.toContain(userId(3));
    expect(recipients(done, 'iron-mage')).not.toContain(userId(3));
    expect(recipients(done, 'third-place')).toEqual([]);
  });

  it('crowns the comeback of a champion from the bottom half after round 1', () => {
    // Round 1: u03 loses its table; afterwards u03 wins every table with big scores.
    const rank = (round: number, humans: string[]) => {
      const sorted = byId(humans);
      if (!humans.includes(userId(3))) return sorted;
      const others = sorted.filter((id) => id !== userId(3));
      return round === 1 ? [...others, userId(3)] : [userId(3), ...others];
    };
    const done = series(3, 4, rank);
    expect(recipients(done, 'champion')).toEqual([userId(3)]);
    expect(recipients(done, 'comeback')).toEqual([userId(3)]);
  });

  it('gives the oracle to the best bid accuracy with enough bids, and the high roller to the top score', () => {
    const rounds = (id: string): readonly [number, number][] =>
      id === userId(2) ? Array.from({ length: 10 }, () => [1, 1] as [number, number]) : Array.from({ length: 10 }, (_, i) => [1, i % 2] as [number, number]);
    const score = (id: string, placement: number) => (id === userId(3) ? 500 : 100 - placement);
    let tournament = startTournament(withEntrants(testTournament(testDraft({ settings: { rounds: 1 } })), 3), HOST_ID, T0);
    const [match] = tournament.matches;
    tournament = recordMatchResult(tournament, reportFor(match, [userId(1), userId(2), userId(3)], { rounds, score }), T0 + 1).tournament;
    expect(recipients(tournament, 'oracle')).toEqual([userId(2)]);
    expect(recipients(tournament, 'high-roller')).toEqual([userId(3)]);
  });

  it('needs at least the minimum bids for the oracle', () => {
    const done = playToCompletion(startTournament(withEntrants(testTournament(testDraft({ settings: { rounds: 1 } })), 3), HOST_ID, T0));
    expect(recipients(done, 'oracle')).toEqual([]);
  });

  it('only gives knockout tournaments format-neutral awards', () => {
    const done = playToCompletion(startTournament(withEntrants(testTournament(testDraft({ format: 'knockout', settings: { maxTableSize: 3 } })), 6), HOST_ID, T0));
    expect(recipients(done, 'iron-mage')).toEqual([]);
    expect(recipients(done, 'champion')).toHaveLength(1);
  });

  it('crowns nobody when the knockout final is voided', () => {
    const semis = startTournament(withEntrants(testTournament(testDraft({ format: 'knockout', settings: { maxTableSize: 4 } })), 8), HOST_ID, T0);
    const final = pendingMatches(playRound(semis, T0 + 1000));
    expect(final).toHaveLength(1);
    const done = applyDueTransitions(playRound(semis, T0 + 1000), final[0].deadlineAt);
    expect(done.status).toBe('completed');
    // Points from the semi-finals decide no podium place.
    expect(recipients(done, 'champion')).toEqual([]);
    expect(recipients(done, 'runner-up')).toEqual([]);
  });
});
