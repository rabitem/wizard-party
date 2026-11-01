import { describe, expect, it } from 'vitest';
import { QUALITY_GOVERNOR as G, type RenderQualityTier } from '@/presentation/config/render-quality.config';
import { QualityGovernor } from './quality-governor';

/** Feeds `windows` full evaluation windows; returns every tier change with the time it happened. */
function feed(
  governor: QualityGovernor,
  startTier: RenderQualityTier,
  windows: number,
  frameMs: (i: number) => number,
  startAt = 0,
): { tier: RenderQualityTier; changes: { tier: RenderQualityTier; at: number }[]; now: number } {
  let tier = startTier;
  let now = startAt;
  const changes: { tier: RenderQualityTier; at: number }[] = [];
  for (let i = 0; i < windows * G.WINDOW_FRAMES; i++) {
    const interval = frameMs(i);
    now += interval;
    const next = governor.addFrame(interval, tier, now);
    if (next) {
      tier = next;
      changes.push({ tier: next, at: now });
    }
  }
  return { tier, changes, now };
}

const AT_60_HZ = 1000 / 60;
const AT_120_HZ = 1000 / 120;

describe('QualityGovernor', () => {
  it('should step down after consecutive slow windows', () => {
    const result = feed(new QualityGovernor(), 'high', G.DOWN_WINDOWS, () => 30);
    expect(result.changes.map((c) => c.tier)).toEqual(['medium']);
  });

  it('should not step down for isolated hitches such as a shader compile or GC pause', () => {
    const result = feed(new QualityGovernor(), 'high', 4, (i) => (i % 15 === 0 ? 120 : AT_60_HZ));
    expect(result.changes).toEqual([]);
  });

  it('should ignore pauses longer than a plausible frame', () => {
    const result = feed(new QualityGovernor(), 'high', 4, () => G.MAX_SAMPLE_MS + 1);
    expect(result.changes).toEqual([]);
  });

  it('should ignore frames while settling after a mount or tier change', () => {
    const governor = new QualityGovernor();
    governor.settle(0);
    const settling = feed(governor, 'high', 1, () => 30);
    expect(settling.now).toBeLessThan(G.SETTLE_MS);
    expect(settling.changes).toEqual([]);

    const after = feed(governor, 'high', G.DOWN_WINDOWS, () => 30, G.SETTLE_MS);
    expect(after.changes.map((c) => c.tier)).toEqual(['medium']);
  });

  it('should step up after a sustained run at the display refresh rate', () => {
    const result = feed(new QualityGovernor(), 'medium', G.UP_WINDOWS, () => AT_120_HZ);
    expect(result.changes.map((c) => c.tier)).toEqual(['high']);
  });

  it('should not step up while frames take clearly longer than the display refresh', () => {
    const governor = new QualityGovernor();
    feed(governor, 'medium', 1, () => AT_120_HZ);
    const result = feed(governor, 'medium', G.UP_WINDOWS * 2, () => AT_60_HZ);
    expect(result.changes).toEqual([]);
  });

  it('should not return to a tier it just left until the cool-down has passed', () => {
    const governor = new QualityGovernor();
    const down = feed(governor, 'high', G.DOWN_WINDOWS, () => 30);
    expect(down.tier).toBe('medium');

    const soon = feed(governor, 'medium', G.UP_WINDOWS, () => AT_60_HZ, down.now);
    expect(soon.changes).toEqual([]);

    const later = feed(governor, 'medium', G.UP_WINDOWS, () => AT_60_HZ, down.now + G.UP_COOLDOWN_MS);
    expect(later.changes.map((c) => c.tier)).toEqual(['high']);
  });
});
