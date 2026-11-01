import type { LeaderboardCandidate } from '../../../domain/account/leaderboard';

/** Read model behind the public Hall of Champions. */
export interface ILeaderboardReader {
  /** Players with a claimed username and a public profile, highest XP first, at most `limit`. */
  listPublicCandidates(limit: number): Promise<LeaderboardCandidate[]>;
}
