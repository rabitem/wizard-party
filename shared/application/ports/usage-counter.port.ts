/**
 * Shared fixed-window counter used for abuse and volume budgets (e.g. Redis). Implementations must
 * set the counter and its expiry atomically so a counter can never outlive its window.
 */
export interface IUsageCounter {
  /**
   * Adds `amount` to the counter `key`, which expires `windowSeconds` after it was created.
   * Returns the new total, or null when the counter is unavailable; callers then fail open.
   */
  add(key: string, amount: number, windowSeconds: number): Promise<number | null>;
}
