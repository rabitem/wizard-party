import { compareKnockout, matchesOfRound } from '../match-records';
import { canSeat, distributeSnake, largestSeatableCount, planSeating } from '../table-planner';
import { TOURNAMENT_LIMITS } from '../tournament.constants';
import type { Entrant, Tournament, TournamentMatch, TournamentSettings } from '../tournament.types';
import type { ITournamentFormat, RoundDecision } from './tournament-format';

/**
 * Players of a table who advance: the configured number (default: half the humans, rounded up),
 * always leaving at least one player behind so every round shrinks the field.
 */
export function advanceCount(humansAtTable: number, configured: number | null): number {
  if (humansAtTable <= 1) return humansAtTable;
  const wanted = configured ?? Math.ceil(humansAtTable / 2);
  return Math.min(Math.max(1, wanted), humansAtTable - 1);
}

interface Candidate {
  userId: string;
  placementKey: number;
  score: number;
  seed: number;
}

const byResult = (a: Candidate, b: Candidate) => a.placementKey - b.placementKey || b.score - a.score || a.seed - b.seed;

/** Humans of a played table, best first; no-shows can never advance. */
function advancersOf(match: TournamentMatch, seeds: Map<string, number>, configured: number | null): Candidate[] {
  if (match.status !== 'completed' || !match.result) return [];
  const candidates = match.result.players
    .flatMap((player) => {
      const seed = seeds.get(player.userId);
      return player.noShow || seed === undefined ? [] : [{ userId: player.userId, placementKey: player.placement, score: player.score, seed }];
    })
    .sort(byResult);
  const humans = match.seats.filter((seat) => seat.userId !== null).length;
  return candidates.slice(0, advanceCount(humans, configured));
}

function seatRound(order: readonly string[], settings: TournamentSettings, allowBots = settings.fillWithBots): RoundDecision {
  const seating = planSeating(order.length, settings.maxTableSize, allowBots);
  const tables = distributeSnake(order, seating.map((table) => table.humans));
  return { kind: 'round', tables: tables.map((userIds, index) => ({ userIds, bots: seating[index].bots })), eliminated: [] };
}

/**
 * Elimination: every round seats the remaining players and the top of each table advances. Once
 * the field fits one table, that table is the Final. Round 1 deals seeds in snake order so the
 * strongest players don't meet early. When the advancing players can't be split into tables (only
 * possible with tables of 3–4 and no bots), the best of them that can be seated go through; when
 * too few advance to fill even one table (two finalists), the Final is padded with a bot instead,
 * so a champion is always decided at one table, never by comparing scores of different tables.
 */
export const KNOCKOUT_FORMAT: ITournamentFormat = {
  id: 'knockout',
  name: 'Elimination',
  description: 'The top of every table advances until the field fits one table: the Final decides the champion.',

  validateSettings(settings: TournamentSettings): string | null {
    const { advancePerTable, maxTableSize } = settings;
    if (advancePerTable === null) return null;
    if (!Number.isInteger(advancePerTable) || advancePerTable < 1 || advancePerTable >= maxTableSize) {
      return `Between 1 and ${maxTableSize - 1} players can advance per table.`;
    }
    return null;
  },

  expectedRounds(settings: TournamentSettings, entrants: number): number {
    let remaining = entrants;
    let rounds = 1;
    while (remaining > settings.maxTableSize) {
      const seating = planSeating(remaining, settings.maxTableSize, true);
      remaining = seating.reduce((sum, table) => sum + advanceCount(table.humans, settings.advancePerTable), 0);
      rounds += 1;
    }
    return rounds;
  },

  decideNextRound(tournament: Tournament): RoundDecision {
    const { settings } = tournament;
    if (tournament.currentRound === 0) {
      const bySeed = [...tournament.entrants].sort((a, b) => a.seed - b.seed).map((entrant) => entrant.userId);
      return seatRound(bySeed, settings);
    }

    const played = matchesOfRound(tournament, tournament.currentRound);
    // A round at a single table is the Final.
    if (played.length <= 1) return { kind: 'complete', eliminated: [] };

    const seeds = new Map(tournament.entrants.map((entrant: Entrant) => [entrant.userId, entrant.seed]));
    const seatedNow = played.flatMap((match) => match.seats.map((seat) => seat.userId).filter((id): id is string => id !== null && seeds.has(id)));
    let survivors = played.flatMap((match) => advancersOf(match, seeds, settings.advancePerTable)).sort(byResult);

    const bounds = { min: TOURNAMENT_LIMITS.MIN_TABLE_SIZE, max: settings.maxTableSize };
    // Too few for one table without bots (two finalists): the Final is padded with a bot anyway.
    const paddedFinal = !settings.fillWithBots && survivors.length > 1 && survivors.length < bounds.min;
    if (!settings.fillWithBots && !paddedFinal && !canSeat(survivors.length, bounds)) {
      survivors = survivors.slice(0, largestSeatableCount(survivors.length, bounds));
    }
    const advancing = new Set(survivors.map((candidate) => candidate.userId));
    const eliminated = seatedNow.filter((userId) => !advancing.has(userId));
    // Nobody (or one player) left to seat: the round just played decided the tournament. A lone
    // survivor wins; with nobody advancing, the standings of that round are final.
    if (survivors.length <= 1) return { kind: 'complete', eliminated: survivors.length === 1 ? eliminated : [] };

    const next = seatRound(survivors.map((candidate) => candidate.userId), settings, settings.fillWithBots || paddedFinal);
    return { ...next, eliminated };
  },

  compare: compareKnockout,

  roundLabel(tournament: Tournament, round: number): string {
    const tables = matchesOfRound(tournament, round).length;
    return tables === 1 ? 'Final' : `Round ${round}`;
  },
};
