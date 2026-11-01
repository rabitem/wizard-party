import { LEADERBOARD_RULES, buildLeaderboards, type Leaderboards } from '../../../domain/account/leaderboard';
import type { ILeaderboardReader } from '../../ports/account/leaderboard.port';

/** All public boards in one call, so the home page needs a single cacheable request. */
export class GetLeaderboardsUseCase {
  constructor(private readonly reader: ILeaderboardReader) {}

  async execute(): Promise<Leaderboards> {
    return buildLeaderboards(await this.reader.listPublicCandidates(LEADERBOARD_RULES.MAX_CANDIDATES));
  }
}
