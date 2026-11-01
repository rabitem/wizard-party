import type { TournamentParticipation } from '../tournament/participation';
import { countCorrectBids, type GameResult, type RoundResult } from './game-result';

/** Tuning of the achievement rules that is not already spelled out in a definition's target. */
export const ACHIEVEMENT_RULES = {
  /** Rounds a game needs for "every bid" style achievements to count. */
  MIN_ROUNDS_FOR_BID_FEATS: 5,
  /** Running score a phoenix must have fallen to (or below) before winning. */
  PHOENIX_LOW_POINT: -50,
  /** Running score Icarus must have reached before finishing below zero. */
  ICARUS_HIGH_POINT: 100,
  /** Tricks a bid must be missed by for Overreach. */
  OVERREACH_MISS: 4,
  /** Rounds and share of exact bids a game needs to count for Keen Eye. */
  KEEN_EYE_MIN_ROUNDS: 10,
  KEEN_EYE_ACCURACY: 0.8,
  /** Rounds of a perfect game that fulfils the prophecy. */
  PROPHECY_ROUNDS: 15,
  /** Days without a game before the next one counts as a return. */
  RETURN_AFTER_DAYS: 30,
  /** Table sizes the table hopper must have won at. */
  TABLE_HOPPER_SIZES: [3, 4, 5, 6],
  /** Length of a calendar day for day based achievements (days are counted in UTC). */
  UTC_DAY_MS: 24 * 60 * 60 * 1000,
} as const;

// --- Game facts -------------------------------------------------------------------------------

export const isWin = (result: GameResult) => result.placement === 1;

export const isLast = (result: GameResult) => result.placement === result.playerCount;

const isExact = (round: RoundResult) => round.bid === round.tricksWon;

const hasBidFeatRounds = (result: GameResult) => result.rounds.length >= ACHIEVEMENT_RULES.MIN_ROUNDS_FOR_BID_FEATS;

export const isPerfectGame = (result: GameResult) => hasBidFeatRounds(result) && countCorrectBids(result) === result.rounds.length;

export const isBlindGame = (result: GameResult) => hasBidFeatRounds(result) && countCorrectBids(result) === 0;

export const bidAccuracy = (result: GameResult) => (result.rounds.length === 0 ? 0 : countCorrectBids(result) / result.rounds.length);

export const zeroBidsHit = (result: GameResult) => result.rounds.filter((round) => round.bid === 0 && round.tricksWon === 0).length;

/** Highest bid the player hit exactly in this game (0 when none). */
export const highestBidHit = (result: GameResult) =>
  result.rounds.reduce((best, round) => (isExact(round) ? Math.max(best, round.bid) : best), 0);

/** Most tricks a bid was missed by in this game (0 when every bid was hit). */
export const widestMiss = (result: GameResult) => result.rounds.reduce((widest, round) => Math.max(widest, Math.abs(round.bid - round.tricksWon)), 0);

/** Longest run of consecutive rounds with an exact bid. */
export function longestCorrectBidRun(result: Pick<GameResult, 'rounds'>): number {
  let longest = 0;
  let current = 0;
  for (const round of result.rounds) {
    current = isExact(round) ? current + 1 : 0;
    longest = Math.max(longest, current);
  }
  return longest;
}

/** Lowest and highest running total over the rounds (both start from 0). */
export function runningScoreRange(result: Pick<GameResult, 'rounds'>): { lowest: number; highest: number } {
  let running = 0;
  let lowest = 0;
  let highest = 0;
  for (const round of result.rounds) {
    running += round.roundScore;
    lowest = Math.min(lowest, running);
    highest = Math.max(highest, running);
  }
  return { lowest, highest };
}

/** Longest run of consecutive games (results oldest first) that match the predicate. */
export function longestGameRun(results: readonly GameResult[], predicate: (result: GameResult) => boolean): number {
  let longest = 0;
  let current = 0;
  for (const result of results) {
    current = predicate(result) ? current + 1 : 0;
    longest = Math.max(longest, current);
  }
  return longest;
}

// --- Calendar facts (UTC days) ----------------------------------------------------------------

const utcDay = (playedAt: number) => Math.floor(playedAt / ACHIEVEMENT_RULES.UTC_DAY_MS);

/** Distinct UTC days on which the player finished a game, ascending. */
function daysPlayed(results: readonly Pick<GameResult, 'playedAt'>[]): number[] {
  return [...new Set(results.map((result) => utcDay(result.playedAt)))].sort((a, b) => a - b);
}

export const distinctDaysPlayed = (results: readonly Pick<GameResult, 'playedAt'>[]) => daysPlayed(results).length;

/** Longest run of consecutive UTC days with at least one finished game. */
export function longestDailyRun(results: readonly Pick<GameResult, 'playedAt'>[]): number {
  const days = daysPlayed(results);
  let longest = 0;
  let current = 0;
  days.forEach((day, index) => {
    current = index > 0 && day === days[index - 1] + 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
  });
  return longest;
}

/** Most games finished on a single UTC day. */
export function mostGamesInOneDay(results: readonly Pick<GameResult, 'playedAt'>[]): number {
  const perDay = new Map<number, number>();
  for (const result of results) {
    const day = utcDay(result.playedAt);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }
  return Math.max(0, ...perDay.values());
}

/** Longest break, in whole UTC days, between two days with a game. */
export function longestBreakInDays(results: readonly Pick<GameResult, 'playedAt'>[]): number {
  const days = daysPlayed(results);
  return days.reduce((longest, day, index) => (index === 0 ? longest : Math.max(longest, day - days[index - 1])), 0);
}

// --- Tournament facts -------------------------------------------------------------------------

/** Sat at least one table (a no-show for every match does not count as playing). */
export const playedTournament = (participation: TournamentParticipation) => participation.wasEntrant && participation.matchesPlayed > 0;

export const wonTournament = (participation: TournamentParticipation) => playedTournament(participation) && participation.finalRank === 1;

export const reachedPodium = (participation: TournamentParticipation) =>
  playedTournament(participation) && participation.finalRank !== null && participation.finalRank <= 3;

export const earnedAward = (awardId: string) => (participation: TournamentParticipation) =>
  participation.awards.some((award) => award.awardId === awardId);

/** Award ids (TOURNAMENT_AWARDS) that achievements look for. */
export const ACHIEVEMENT_AWARD_IDS = { COMEBACK: 'comeback', ORACLE: 'oracle', IRON_MAGE: 'iron-mage' } as const;
