import type { FrameTimingStats } from '@/presentation/components/sandbox/sandbox.types';
import type { ClockMode, VirtualClockStats } from './virtual-clock';

export type { FrameTimingStats };

const BUDGET_120HZ_MS = 1000 / 120;
const BUDGET_60HZ_MS = 1000 / 60;

function percentile(sorted: number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(fraction * sorted.length))];
}

export function summarizeFrameTimes(deltas: number[]): FrameTimingStats {
  const sorted = [...deltas].sort((a, b) => a - b);
  const durationMs = deltas.reduce((sum, delta) => sum + delta, 0);
  const round = (value: number) => Math.round(value * 100) / 100;
  return {
    frames: deltas.length,
    durationMs: round(durationMs),
    fps: durationMs > 0 ? round((deltas.length * 1000) / durationMs) : 0,
    p50Ms: round(percentile(sorted, 0.5)),
    p95Ms: round(percentile(sorted, 0.95)),
    p99Ms: round(percentile(sorted, 0.99)),
    maxMs: round(sorted.at(-1) ?? 0),
    over120HzBudget: deltas.length ? round(deltas.filter((delta) => delta > BUDGET_120HZ_MS * 1.05).length / deltas.length) : 0,
    over60HzBudget: deltas.length ? round(deltas.filter((delta) => delta > BUDGET_60HZ_MS * 1.05).length / deltas.length) : 0,
  };
}

type FrameListener = (now: number, frame: number) => void;

/**
 * Wall-clock implementation of the sandbox clock, for performance runs.
 *
 * Same contract as VirtualClock, but time is real and frames come from the browser's own
 * requestAnimationFrame, so frame timing reflects what a player's browser achieves.
 * Replays are not deterministic in this mode; use the virtual clock for correctness audits.
 */
export class RealClock {
  private frame = 0;
  private readonly listeners = new Set<FrameListener>();
  private lastFrameAt: number | null = null;
  private deltas: number[] = [];
  private lastDelta = 0;
  private maxDelta = 0;
  private running = false;

  install(): void {
    if (this.running || typeof window === 'undefined') return;
    this.running = true;
    const loop = (timestamp: number) => {
      if (this.lastFrameAt !== null) {
        this.lastDelta = timestamp - this.lastFrameAt;
        this.maxDelta = Math.max(this.maxDelta, this.lastDelta);
        this.deltas.push(this.lastDelta);
      }
      this.lastFrameAt = timestamp;
      this.frame++;
      for (const listener of [...this.listeners]) listener(performance.now(), this.frame);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  now(): number {
    return performance.now();
  }

  realNow(): number {
    return performance.now();
  }

  onFrame(listener: FrameListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  waitUntil(predicate: () => boolean, timeoutMs: number): Promise<boolean> {
    if (predicate()) return Promise.resolve(true);
    const deadline = performance.now() + timeoutMs;
    return new Promise((resolve) => {
      const unsubscribe = this.onFrame((now) => {
        if (predicate()) {
          unsubscribe();
          resolve(true);
        } else if (now >= deadline) {
          unsubscribe();
          resolve(false);
        }
      });
    });
  }

  waitUntilReal(predicate: () => boolean, realTimeoutMs: number): Promise<boolean> {
    return this.waitUntil(predicate, realTimeoutMs);
  }

  async advance(ms: number): Promise<void> {
    const target = performance.now() + ms;
    await this.waitUntil(() => performance.now() >= target, Number.POSITIVE_INFINITY);
  }

  realDelay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  async step(count = 1): Promise<void> {
    const target = this.frame + count;
    await this.waitUntil(() => this.frame >= target, Number.POSITIVE_INFINITY);
  }

  /** Real time cannot be paused or sped up; the mode is fixed. */
  setMode(): void {}

  stats(): VirtualClockStats {
    return { now: performance.now(), frame: this.frame, mode: 'play' as ClockMode, speed: 1, lastFrameCostMs: this.lastDelta, maxFrameCostMs: this.maxDelta };
  }

  resetFrameCostStats(): void {
    this.maxDelta = 0;
    this.deltas = [];
  }

  /** Frame times since the last reset (one run). */
  frameTiming(): FrameTimingStats {
    return summarizeFrameTimes(this.deltas);
  }
}
