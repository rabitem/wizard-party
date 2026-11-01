import { DEFAULT_TOURNAMENT_SETTINGS, type TournamentDraft } from './tournament-validation';
import { createTournament, recordMatchResult, registerEntrant } from './tournament';
import type { MatchReport, Tournament, TournamentMatch, TournamentSettings } from './tournament.types';

/* Builders for tournament tests (domain and application). Not part of the production barrel. */

export const T0 = 1_800_000_000_000;
export const HOST_ID = 'host';

export function userId(index: number): string {
  return `u${String(index).padStart(2, '0')}`;
}

export function testDraft(overrides: Partial<Omit<TournamentDraft, 'settings'>> & { settings?: Partial<TournamentSettings> } = {}): TournamentDraft {
  return {
    name: 'Spring Cup',
    description: '',
    format: 'series',
    visibility: 'public',
    startsAt: null,
    ...overrides,
    settings: { ...DEFAULT_TOURNAMENT_SETTINGS, ...overrides.settings },
  };
}

export function testTournament(draft: TournamentDraft = testDraft(), id = 'abcdefghjk23'): Tournament {
  return createTournament({
    id,
    inviteCode: 'zxcvbnm2',
    host: { userId: HOST_ID, username: 'host', displayName: 'Host' },
    draft,
    now: T0,
  });
}

/** Registers u01..uNN; levels default to descending so the seed order equals the user order. */
export function withEntrants(tournament: Tournament, count: number, level: (index: number) => number = (index) => 100 - index): Tournament {
  let state = tournament;
  for (let i = 1; i <= count; i++) {
    state = registerEntrant(
      state,
      { userId: userId(i), username: `player${i}`, displayName: `Player ${i}`, level: level(i) },
      { now: T0 + i, inviteCode: tournament.inviteCode }
    );
  }
  return state;
}

export interface ReportOptions {
  noShow?: readonly string[];
  botTakeover?: readonly string[];
  /** Score per user; defaults to a score falling with the placement. */
  score?: (userId: string, placement: number) => number;
  /** Bids per user: [bid, tricksWon] pairs; defaults to one hit bid. */
  rounds?: (userId: string) => readonly [number, number][];
}

/** A worker report placing the table's humans in `order` (best first), bots after them. */
export function reportFor(match: TournamentMatch, order: readonly string[], options: ReportOptions = {}): MatchReport {
  const present = order.filter((id) => !options.noShow?.includes(id));
  const absent = order.filter((id) => options.noShow?.includes(id));
  const bots = match.seats.filter((seat) => seat.userId === null).length;
  return {
    matchId: match.id,
    roomCode: match.roomCode,
    gameId: `game-${match.id}`,
    completedAt: match.createdAt + 1000,
    players: [
      ...present.map((id, index) => ({ id, placement: index + 1 })),
      // No-shows rank below everyone present, bots included.
      ...absent.map((id, index) => ({ id, placement: Math.min(match.seats.length, present.length + bots + index + 1) })),
    ].map(({ id, placement }) => ({
      userId: id,
      placement,
      score: options.score ? options.score(id, placement) : 100 - placement * 10,
      rounds: (options.rounds?.(id) ?? [[1, 1]]).map(([bid, tricksWon]) => ({ bid, tricksWon, roundScore: bid === tricksWon ? 20 + bid * 10 : -10 })),
      noShow: Boolean(options.noShow?.includes(id)),
      botTakeover: Boolean(options.botTakeover?.includes(id)),
    })),
  };
}

export function humansOf(match: TournamentMatch): string[] {
  return match.seats.map((seat) => seat.userId).filter((id): id is string => id !== null);
}

export function pendingMatches(tournament: Tournament): TournamentMatch[] {
  return tournament.matches.filter((match) => match.status === 'pending');
}

/**
 * Reports every pending table. `rank` orders a table's humans best first; by default the lower
 * user id wins (u01 beats u02).
 */
export function playRound(tournament: Tournament, now: number, rank: (humans: string[]) => string[] = (humans) => [...humans].sort()): Tournament {
  let state = tournament;
  for (const match of pendingMatches(tournament)) {
    state = recordMatchResult(state, reportFor(match, rank(humansOf(match))), now).tournament;
  }
  return state;
}

/** Plays rounds until the tournament completes (bounded, to fail loudly on a loop). */
export function playToCompletion(tournament: Tournament, rank?: (humans: string[]) => string[]): Tournament {
  let state = tournament;
  for (let i = 0; i < 20 && state.status === 'running'; i++) state = playRound(state, T0 + (i + 1) * 60_000, rank);
  return state;
}
