import { RENDER_PERFORMANCE_CONFIG as C } from './client-telemetry.config';

export interface FrameStatsSummary {
  frames: number;
  avgFps: number;
  p5Fps: number;
  avgFrameMs: number;
  p95FrameMs: number;
  maxFrameMs: number;
  droppedFrames: number;
}

const DECIMALS = 2;
const round = (value: number) => Number(value.toFixed(DECIMALS));
const MS_PER_SECOND = 1000;

function percentile(sorted: Float32Array, p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))];
}

/**
 * Fixed-capacity frame time recorder: `add` is allocation free so it can run every frame.
 * Dropped frames are estimated against the display refresh interval, approximated by a low
 * percentile of the observed frame times (works for 60, 120 and 144 Hz displays alike).
 */
export class FrameStatsAccumulator {
  private readonly deltas: Float32Array;
  private count = 0;

  constructor(capacity: number = C.MAX_FRAMES_PER_WINDOW) {
    this.deltas = new Float32Array(capacity);
  }

  get frames(): number {
    return this.count;
  }

  add(deltaMs: number): void {
    if (!(deltaMs > 0) || deltaMs > C.MAX_FRAME_DELTA_MS || this.count >= this.deltas.length) return;
    this.deltas[this.count++] = deltaMs;
  }

  reset(): void {
    this.count = 0;
  }

  summarize(): FrameStatsSummary | null {
    if (this.count === 0) return null;
    const sorted = this.deltas.slice(0, this.count).sort();
    let total = 0;
    for (const delta of sorted) total += delta;

    const refreshMs = Math.max(percentile(sorted, C.REFRESH_ESTIMATE_PERCENTILE), C.MIN_REFRESH_INTERVAL_MS);
    let dropped = 0;
    for (const delta of sorted) dropped += Math.max(0, Math.round(delta / refreshMs) - 1);

    const avgFrameMs = total / this.count;
    const p95FrameMs = percentile(sorted, C.SLOW_TAIL_PERCENTILE);
    return {
      frames: this.count,
      avgFps: round(MS_PER_SECOND / avgFrameMs),
      p5Fps: round(MS_PER_SECOND / p95FrameMs),
      avgFrameMs: round(avgFrameMs),
      p95FrameMs: round(p95FrameMs),
      maxFrameMs: round(sorted[sorted.length - 1]),
      droppedFrames: dropped,
    };
  }
}
