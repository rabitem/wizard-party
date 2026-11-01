import { describe, expect, it } from 'vitest';

import { RECONNECT_TIMING } from '@shared/domain';
import { RECONNECT_POLICY } from '@/presentation/config/connection.config';

import { reconnectDelay } from './reconnect-policy';

describe('reconnectDelay', () => {
  it('should keep the first retry within the delay the server debounce is derived from', () => {
    for (const random of [0, 0.5, 0.999]) {
      expect(reconnectDelay(1, random)).toBeLessThanOrEqual(RECONNECT_TIMING.CLIENT_FIRST_RETRY_MS);
      expect(reconnectDelay(1, random)).toBeGreaterThanOrEqual(RECONNECT_POLICY.MIN_DELAY_MS);
    }
  });

  it('should double the ceiling per attempt up to the maximum', () => {
    expect(reconnectDelay(2, 1)).toBe(2 * RECONNECT_POLICY.BASE_DELAY_MS);
    expect(reconnectDelay(3, 1)).toBe(4 * RECONNECT_POLICY.BASE_DELAY_MS);
    expect(reconnectDelay(30, 1)).toBe(RECONNECT_POLICY.MAX_DELAY_MS);
  });

  it('should spread clients over the whole window (full jitter), not one schedule for everyone', () => {
    const delays = new Set([0, 0.25, 0.5, 0.75].map((random) => reconnectDelay(4, random)));
    expect(delays.size).toBe(4);
  });
});
