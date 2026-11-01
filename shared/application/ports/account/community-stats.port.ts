import type { CommunityStats } from '../../../domain/account/community-stats';

/** Aggregate counts for the home page; implementations may return raw, unsanitized numbers. */
export interface ICommunityStatsReader {
  read(window: { liveMinutes: number; todayHours: number }): Promise<Partial<Record<keyof CommunityStats, unknown>>>;
}
