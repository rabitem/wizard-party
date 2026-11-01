import { describe, expect, it } from 'vitest';

import { FrameStatsAccumulator } from './frame-stats';

const FRAME_60HZ = 1000 / 60;

describe('FrameStatsAccumulator', () => {
  it('returns null without frames', () => {
    expect(new FrameStatsAccumulator(10).summarize()).toBeNull();
  });

  it('summarizes a smooth 60 Hz window', () => {
    const stats = new FrameStatsAccumulator(1_000);
    for (let i = 0; i < 600; i++) stats.add(FRAME_60HZ);
    expect(stats.summarize()).toEqual({
      frames: 600,
      avgFps: 60,
      p5Fps: 60,
      avgFrameMs: 16.67,
      p95FrameMs: 16.67,
      maxFrameMs: 16.67,
      droppedFrames: 0,
    });
  });

  it('estimates dropped frames from long frames relative to the refresh interval', () => {
    const stats = new FrameStatsAccumulator(1_000);
    for (let i = 0; i < 95; i++) stats.add(FRAME_60HZ);
    for (let i = 0; i < 5; i++) stats.add(FRAME_60HZ * 3);
    const summary = stats.summarize();
    expect(summary?.droppedFrames).toBe(10);
    expect(summary?.maxFrameMs).toBe(50);
    expect(summary?.avgFps).toBeLessThan(60);
  });

  it('ignores pauses, invalid deltas and frames beyond capacity', () => {
    const stats = new FrameStatsAccumulator(3);
    stats.add(5_000);
    stats.add(-1);
    stats.add(Number.NaN);
    for (let i = 0; i < 5; i++) stats.add(FRAME_60HZ);
    expect(stats.frames).toBe(3);
    stats.reset();
    expect(stats.frames).toBe(0);
  });
});
