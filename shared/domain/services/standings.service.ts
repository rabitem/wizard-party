/**
 * Standings Service
 * Single responsibility: rank players by score.
 *
 * Uses standard competition ranking ("1224"): tied players share a rank and the
 * next rank is skipped. Game end, stats and telemetry all read this one ranking,
 * so a co-winner is a winner everywhere.
 */

export interface IStanding {
  playerId: string;
  score: number;
  /** 1-based competition rank; tied scores share a rank. */
  rank: number;
}

interface IScored {
  readonly id: string;
  readonly score: number;
}

/**
 * Standings sorted by score (best first); ties keep seat order.
 */
export function getStandings(players: readonly IScored[]): IStanding[] {
  const sorted = players
    .map((player, seat) => ({ player, seat }))
    .sort((a, b) => b.player.score - a.player.score || a.seat - b.seat);

  const standings: IStanding[] = [];
  sorted.forEach(({ player }, index) => {
    const previous = standings[index - 1];
    const rank = previous && previous.score === player.score ? previous.rank : index + 1;
    standings.push({ playerId: player.id, score: player.score, rank });
  });
  return standings;
}

/**
 * Every player sharing the best score (empty without players).
 */
export function getWinnerIds(players: readonly IScored[]): string[] {
  return getStandings(players)
    .filter((standing) => standing.rank === 1)
    .map((standing) => standing.playerId);
}
