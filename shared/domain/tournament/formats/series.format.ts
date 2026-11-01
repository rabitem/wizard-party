import { collectEntrantRecords, compareSeries } from '../match-records';
import { seededShuffle } from '../seeded-random';
import { distributeInOrder, planSeating } from '../table-planner';
import { TOURNAMENT_LIMITS } from '../tournament.constants';
import type { Tournament, TournamentSettings } from '../tournament.types';
import type { ITournamentFormat, RoundDecision } from './tournament-format';

/**
 * Swiss Series: a fixed number of rounds, everyone plays every round. Round 1 tables are drawn
 * (seeded by the tournament id, so reproducible); later rounds sort the field by the standings and
 * fill tables in order, so players of similar strength meet. Points are normalized per table size.
 */
export const SERIES_FORMAT: ITournamentFormat = {
  id: 'series',
  name: 'Swiss Series',
  description: 'Everyone plays every round. Tables are re-drawn by standings so equals meet; most points wins.',

  validateSettings(settings: TournamentSettings): string | null {
    const { rounds } = settings;
    if (!Number.isInteger(rounds) || rounds < TOURNAMENT_LIMITS.MIN_ROUNDS || rounds > TOURNAMENT_LIMITS.MAX_ROUNDS) {
      return `A series has ${TOURNAMENT_LIMITS.MIN_ROUNDS}–${TOURNAMENT_LIMITS.MAX_ROUNDS} rounds.`;
    }
    return null;
  },

  expectedRounds(settings: TournamentSettings): number {
    return settings.rounds;
  },

  decideNextRound(tournament: Tournament): RoundDecision {
    const next = tournament.currentRound + 1;
    if (next > tournament.settings.rounds) return { kind: 'complete', eliminated: [] };

    const order =
      next === 1
        ? seededShuffle(
            [...tournament.entrants].sort((a, b) => a.seed - b.seed).map((entrant) => entrant.userId),
            `${tournament.id}:seating`
          )
        : collectEntrantRecords(tournament)
            .sort(compareSeries)
            .map((record) => record.entrant.userId);

    // The field only shrinks after round 1 when accounts are deleted. It was seatable at the start,
    // so a field that no longer splits into tables is padded with bots rather than stranded; with
    // fewer than two players left the series ends with the standings so far.
    if (next > 1 && order.length < 2) return { kind: 'complete', eliminated: [] };
    const seating = planSeating(order.length, tournament.settings.maxTableSize, tournament.settings.fillWithBots || next > 1);
    const tables = distributeInOrder(order, seating.map((table) => table.humans));
    return {
      kind: 'round',
      tables: tables.map((userIds, index) => ({ userIds, bots: seating[index].bots })),
      eliminated: [],
    };
  },

  compare: compareSeries,

  roundLabel(tournament: Tournament, round: number): string {
    return round === tournament.settings.rounds && round > 1 ? 'Final round' : `Round ${round}`;
  },
};
