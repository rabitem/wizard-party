import type { GlobalStats } from '@shared/domain/stats';

/** `GET /api/stats`. `isMock` marks sample data from a deployment without Redis. */
export interface GlobalStatsResponse extends GlobalStats {
  isMock: boolean;
}
