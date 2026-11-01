import 'server-only';

import { TOURNAMENT_RATE_LIMITS, type TournamentRateLimitedAction } from '@shared/domain/tournament';
import type { IUsageCounter } from '@shared/application';
import type { ITournamentThrottle } from '@shared/application/ports/tournament';

import { FixedWindowRateLimiter } from '../rate-limit/fixed-window-rate-limiter';
import { rateLimitKeySecret } from '../rate-limit/rate-limit-key-secret';
import { TOURNAMENT_INFRASTRUCTURE } from './tournament-config';

/** One fixed-window limiter per tournament action, on the shared Redis usage counter. Fails open. */
export class RedisTournamentThrottle implements ITournamentThrottle {
  private readonly limiters: Record<TournamentRateLimitedAction, FixedWindowRateLimiter>;

  constructor(counter: IUsageCounter, keySecret = rateLimitKeySecret()) {
    this.limiters = Object.fromEntries(
      Object.entries(TOURNAMENT_RATE_LIMITS).map(([action, { limit, windowSeconds }]) => [
        action,
        new FixedWindowRateLimiter({ prefix: `${TOURNAMENT_INFRASTRUCTURE.RATE_LIMIT_PREFIX}:${action}`, limit, windowSeconds, counter, keySecret }),
      ])
    ) as Record<TournamentRateLimitedAction, FixedWindowRateLimiter>;
  }

  allow(action: TournamentRateLimitedAction, subject: string): Promise<boolean> {
    return this.limiters[action].allow(subject);
  }
}
