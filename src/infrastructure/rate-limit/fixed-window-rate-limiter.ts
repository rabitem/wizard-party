import 'server-only';

import { createHmac } from 'node:crypto';

import type { IUsageCounter } from '@shared/application';

export interface RateLimiter {
  /** True when the caller identified by `key` may spend `cost` units (default 1). */
  allow(key: string, cost?: number): Promise<boolean>;
}

export interface FixedWindowRateLimitConfig {
  /** Redis key namespace, e.g. `ratelimit:client-telemetry`. */
  prefix: string;
  /** Units (requests, events) per window. */
  limit: number;
  windowSeconds: number;
  counter: IUsageCounter;
  /**
   * Secret for the keyed hash of the caller key. A plain hash of an IPv4 address is reversible by
   * enumerating all 2^32 addresses; an HMAC with a server secret is not.
   */
  keySecret: string;
  now?: () => number;
}

/** Characters of the HMAC hex digest kept in the key: plenty to avoid collisions. */
const KEY_HASH_CHARS = 32;
const MS_PER_SECOND = 1000;

/**
 * Fixed-window limiter on a shared usage counter. The caller key (derived from an IP address) is
 * HMAC'd together with the window index, so a stored key is neither reversible nor linkable across
 * windows, and it expires with its window. Fails open: losing abuse protection must never break
 * the app.
 */
export class FixedWindowRateLimiter implements RateLimiter {
  private readonly now: () => number;

  constructor(private readonly config: FixedWindowRateLimitConfig) {
    this.now = config.now ?? Date.now;
  }

  async allow(key: string, cost = 1): Promise<boolean> {
    const window = Math.floor(this.now() / (this.config.windowSeconds * MS_PER_SECOND));
    const hashed = createHmac('sha256', this.config.keySecret)
      .update(`${this.config.prefix}:${window}:${key}`)
      .digest('hex')
      .slice(0, KEY_HASH_CHARS);
    const total = await this.config.counter.add(`${this.config.prefix}:${window}:${hashed}`, cost, this.config.windowSeconds);
    return total === null || total <= this.config.limit;
  }
}
