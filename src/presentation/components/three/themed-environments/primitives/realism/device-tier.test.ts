import { describe, expect, it } from 'vitest';
import type { DeviceTier } from '@/presentation/config/realism.config';
import { resolveDeviceTier, type DeviceSignals } from './device-tier';

describe('resolveDeviceTier', () => {
  it.each<{ device: string; signals: DeviceSignals; tier: DeviceTier }>([
    { device: 'a low-core phone', signals: { cores: 4, memoryGb: 3, coarsePointer: true, devicePixelRatio: 3 }, tier: 'low' },
    { device: 'a mid-range phone with unknown memory', signals: { cores: 6, memoryGb: 0, coarsePointer: true, devicePixelRatio: 3 }, tier: 'low' },
    { device: 'a capable phone', signals: { cores: 8, memoryGb: 8, coarsePointer: true, devicePixelRatio: 3 }, tier: 'medium' },
    { device: 'a many-core desktop', signals: { cores: 12, memoryGb: 16, coarsePointer: false, devicePixelRatio: 1 }, tier: 'high' },
  ])('should rate $device as $tier', ({ signals, tier }) => {
    expect(resolveDeviceTier(signals)).toBe(tier);
  });
});
