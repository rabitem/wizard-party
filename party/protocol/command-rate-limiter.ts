import type { ClientCommandType } from "../../shared/domain";
import {
  COMMAND_RATE_CLASS,
  COMMAND_RATE_LIMITS,
  MAX_RATE_LIMITED_SENDERS,
  type CommandRateClass,
  type TokenBucketPolicy,
} from "../config/command-rate-limits.config";

interface Bucket {
  tokens: number;
  updatedAt: number;
}

/**
 * Token buckets per (sender, command class) with the configured budgets (COMMAND_RATE_LIMITS).
 * Time is passed in, so the limiter is deterministic under test and needs no timers.
 */
export class CommandRateLimiter {
  /** sender -> class -> bucket; insertion order is the eviction order. */
  private readonly senders = new Map<string, Map<CommandRateClass, Bucket>>();

  /** Takes a token for `type` from `sender`'s bucket; false when the bucket is empty. */
  tryAcquire(sender: string, type: ClientCommandType, now: number): boolean {
    const rateClass = COMMAND_RATE_CLASS[type];
    const policy = COMMAND_RATE_LIMITS[rateClass];
    const bucket = this.bucketFor(sender, rateClass, policy, now);

    const elapsedSeconds = Math.max(0, now - bucket.updatedAt) / 1000;
    bucket.tokens = Math.min(policy.burst, bucket.tokens + elapsedSeconds * policy.refillPerSecond);
    bucket.updatedAt = now;

    if (bucket.tokens < 1) return false;
    bucket.tokens -= 1;
    return true;
  }

  /** Drops a sender's buckets (its connection closed). */
  release(sender: string): void {
    this.senders.delete(sender);
  }

  private bucketFor(sender: string, rateClass: CommandRateClass, policy: TokenBucketPolicy, now: number): Bucket {
    let buckets = this.senders.get(sender);
    if (!buckets) {
      if (this.senders.size >= MAX_RATE_LIMITED_SENDERS) {
        const oldest = this.senders.keys().next().value;
        if (oldest !== undefined) this.senders.delete(oldest);
      }
      buckets = new Map();
      this.senders.set(sender, buckets);
    }

    let bucket = buckets.get(rateClass);
    if (!bucket) {
      bucket = { tokens: policy.burst, updatedAt: now };
      buckets.set(rateClass, bucket);
    }
    return bucket;
  }
}
