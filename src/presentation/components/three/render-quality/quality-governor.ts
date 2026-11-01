import { QUALITY_GOVERNOR, type RenderQualityTier } from '@/presentation/config/render-quality.config';
import { stepTier } from './quality-profile';

type GovernorConfig = typeof QUALITY_GOVERNOR;

function percentile(sorted: readonly number[], fraction: number): number {
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(fraction * (sorted.length - 1))));
  return sorted[index];
}

/**
 * Frame-time governor with hysteresis. Fed with the intervals of consecutive full-rate frames
 * (idle ambient frames say nothing about GPU headroom); returns a new tier when the table has
 * been too slow, or comfortably at the display rate, for several windows in a row.
 *
 * - The window percentile (not the mean or max) ignores isolated hitches such as a shader
 *   compile or GC pause, which a lower tier would not fix.
 * - After stepping down from a tier the governor does not return to it during a cool-down, so
 *   a machine at the edge settles instead of oscillating.
 */
export class QualityGovernor {
  private samples: number[] = [];
  private slowWindows = 0;
  private fastWindows = 0;
  private refreshMs = Number.POSITIVE_INFINITY;
  private ignoreUntil = Number.NEGATIVE_INFINITY;
  private readonly blockedUntil = new Map<RenderQualityTier, number>();

  constructor(private readonly config: GovernorConfig = QUALITY_GOVERNOR) {}

  /** Estimated display refresh interval (smallest steady frame interval seen). */
  get refreshIntervalMs(): number {
    return this.refreshMs;
  }

  /** Records one frame interval; returns the tier to switch to, or null to stay. */
  addFrame(frameMs: number, tier: RenderQualityTier, now: number): RenderQualityTier | null {
    if (!(frameMs > 0) || frameMs > this.config.MAX_SAMPLE_MS || now < this.ignoreUntil) return null;
    this.samples.push(frameMs);
    if (this.samples.length < this.config.WINDOW_FRAMES) return null;
    const sorted = [...this.samples].sort((a, b) => a - b);
    this.samples = [];
    return this.evaluate(sorted, tier, now);
  }

  /** Forget partial windows (after a tier change, tab switch or context restore). */
  reset(): void {
    this.samples = [];
    this.slowWindows = 0;
    this.fastWindows = 0;
  }

  /** Reset and ignore frames for SETTLE_MS (the table just mounted or changed tier). */
  settle(now: number): void {
    this.reset();
    this.ignoreUntil = now + this.config.SETTLE_MS;
  }

  private evaluate(sorted: readonly number[], tier: RenderQualityTier, now: number): RenderQualityTier | null {
    const refreshSample = Math.max(this.config.MIN_REFRESH_MS, percentile(sorted, 0.1));
    this.refreshMs = Math.min(this.refreshMs, refreshSample);
    const frameMs = percentile(sorted, this.config.PERCENTILE);

    if (frameMs > this.config.DOWN_FRAME_MS) {
      this.fastWindows = 0;
      this.slowWindows++;
      if (this.slowWindows < this.config.DOWN_WINDOWS) return null;
      return this.change(tier, -1, now);
    }
    this.slowWindows = 0;
    if (frameMs > this.refreshMs * this.config.UP_REFRESH_FACTOR) {
      this.fastWindows = 0;
      return null;
    }
    this.fastWindows++;
    if (this.fastWindows < this.config.UP_WINDOWS) return null;
    const next = stepTier(tier, 1);
    if (!next || (this.blockedUntil.get(next) ?? 0) > now) {
      this.fastWindows = 0;
      return null;
    }
    return this.change(tier, 1, now);
  }

  private change(tier: RenderQualityTier, direction: -1 | 1, now: number): RenderQualityTier | null {
    const next = stepTier(tier, direction);
    this.reset();
    if (!next) return null;
    if (direction < 0) this.blockedUntil.set(tier, now + this.config.UP_COOLDOWN_MS);
    return next;
  }
}
