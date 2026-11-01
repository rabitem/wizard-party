import 'server-only';

import { SOCIAL_RATE_LIMITS, type SocialRateLimitedAction } from '@shared/domain/social';
import type { IUsageCounter } from '@shared/application';
import type { ISocialThrottle } from '@shared/application/ports/social';

import { FixedWindowRateLimiter } from '../rate-limit/fixed-window-rate-limiter';
import { rateLimitKeySecret } from '../rate-limit/rate-limit-key-secret';

/** One fixed-window limiter per social action, on the shared Redis usage counter. Fails open. */
export class RedisSocialThrottle implements ISocialThrottle {
  private readonly limiters: Record<SocialRateLimitedAction, FixedWindowRateLimiter>;

  constructor(counter: IUsageCounter, keySecret = rateLimitKeySecret()) {
    this.limiters = Object.fromEntries(
      Object.entries(SOCIAL_RATE_LIMITS).map(([action, { limit, windowSeconds }]) => [
        action,
        new FixedWindowRateLimiter({ prefix: `ratelimit:social:${action}`, limit, windowSeconds, counter, keySecret }),
      ])
    ) as Record<SocialRateLimitedAction, FixedWindowRateLimiter>;
  }

  allow(action: SocialRateLimitedAction, subject: string): Promise<boolean> {
    return this.limiters[action].allow(subject);
  }
}
