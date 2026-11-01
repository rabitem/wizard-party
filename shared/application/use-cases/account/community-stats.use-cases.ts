import { COMMUNITY_STATS_RULES, sanitizeCommunityStats, type CommunityStats } from '../../../domain/account/community-stats';
import type { ICommunityStatsReader } from '../../ports/account/community-stats.port';

export class GetCommunityStatsUseCase {
  constructor(private readonly reader: ICommunityStatsReader) {}

  async execute(): Promise<CommunityStats> {
    const raw = await this.reader.read({
      liveMinutes: COMMUNITY_STATS_RULES.LIVE_WINDOW_MINUTES,
      todayHours: COMMUNITY_STATS_RULES.TODAY_WINDOW_HOURS,
    });
    return sanitizeCommunityStats(raw);
  }
}
