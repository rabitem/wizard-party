/**
 * All-time totals of the "Chronicles of the Realm" panel. The server adds every completed game
 * from the game worker's own records (telemetry); browsers only read them.
 */
export interface GlobalStats {
  gamesPlayed: number;
  roundsPlayed: number;
  wizardsPlayed: number;
  jestersPlayed: number;
  cardsPlayed: number;
  /** Tricks won by a player (a trick destroyed by the Bomb is won by nobody). */
  tricksPlayed: number;
  perfectBids: number;
  totalBids: number;
  highestScore: number;
  comebackWins: number;
}

export const EMPTY_GLOBAL_STATS: GlobalStats = Object.freeze({
  gamesPlayed: 0,
  roundsPlayed: 0,
  wizardsPlayed: 0,
  jestersPlayed: 0,
  cardsPlayed: 0,
  tricksPlayed: 0,
  perfectBids: 0,
  totalBids: 0,
  highestScore: 0,
  comebackWins: 0,
});

/** What one completed game adds to the totals. */
export interface GameStatsContribution {
  roundsPlayed: number;
  wizardsPlayed: number;
  jestersPlayed: number;
  cardsPlayed: number;
  tricksPlayed: number;
  perfectBids: number;
  totalBids: number;
  highestScore: number;
  hadComeback: boolean;
}

export interface CompletedRoundResult {
  playerId: string;
  /** Null when the player never bid (left before bidding). */
  bid: number | null;
  tricksWon: number;
  totalScore: number;
}

/** A completed game as the game server recorded it. */
export interface CompletedGameFacts {
  maxRounds: number;
  winnerId: string;
  finalScores: { playerId: string; score: number }[];
  /** Results of every completed round, in round order. */
  rounds: CompletedRoundResult[][];
  cards: { total: number; wizards: number; jesters: number };
}

/** The winner was in last place after half of the game's rounds. */
function isComeback({ maxRounds, winnerId, rounds }: CompletedGameFacts): boolean {
  const halfway = Math.floor(maxRounds / 2);
  const standings = rounds[halfway - 1];
  if (halfway < 1 || !standings || standings.length < 2) return false;
  const winner = standings.find((result) => result.playerId === winnerId);
  if (!winner) return false;
  return standings.every((result) => result.totalScore >= winner.totalScore);
}

export function summarizeCompletedGame(facts: CompletedGameFacts): GameStatsContribution {
  const results = facts.rounds.flat();
  const bids = results.filter((result) => result.bid !== null);
  return {
    roundsPlayed: facts.rounds.length,
    wizardsPlayed: facts.cards.wizards,
    jestersPlayed: facts.cards.jesters,
    cardsPlayed: facts.cards.total,
    tricksPlayed: results.reduce((sum, result) => sum + result.tricksWon, 0),
    perfectBids: bids.filter((result) => result.bid === result.tricksWon).length,
    totalBids: bids.length,
    highestScore: Math.max(0, ...facts.finalScores.map((entry) => entry.score)),
    hadComeback: isComeback(facts),
  };
}

/** Guards against missing, negative or non-integer values from storage. */
export function sanitizeGlobalStats(value: Partial<Record<keyof GlobalStats, unknown>>): GlobalStats {
  const count = (raw: unknown) => {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  };
  const stats = { ...EMPTY_GLOBAL_STATS };
  for (const key of Object.keys(EMPTY_GLOBAL_STATS) as (keyof GlobalStats)[]) stats[key] = count(value[key]);
  return stats;
}
