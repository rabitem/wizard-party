import { round } from './audit-log';
import type {
  DistributionStats,
  ReactCommitTotals,
  RenderMetrics,
  RenderSample,
  RenderWindowStats,
  SceneInventory,
  WindowMetrics,
} from './sandbox-report.types';

function percentile(sorted: number[], fraction: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(fraction * sorted.length))];
}

function summarizeDistribution(values: number[]): DistributionStats | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((total, value) => total + value, 0);
  return {
    samples: values.length,
    mean: round(sum / values.length, 2),
    p50: round(percentile(sorted, 0.5), 2),
    p95: round(percentile(sorted, 0.95), 2),
    max: round(sorted[sorted.length - 1], 2),
  };
}

/** Folds per-frame render samples into the statistics a report and the budgets read. */
class RenderAccumulator {
  private frames = 0;
  private drawCalls = 0;
  private drawCallsMax = 0;
  private shadowDrawCalls = 0;
  private shadowDrawCallsMax = 0;
  private triangles = 0;
  private finiteTriangleFrames = 0;
  private nonFiniteTriangleFrames = 0;
  private textureUploads = 0;
  private uploadBytes = 0;
  private programLinks = 0;
  private probeMs = 0;
  private readonly cpuMs: number[] = [];
  private readonly gpuMs: number[] = [];
  private readonly frameCosts: number[] = [];

  add(sample: RenderSample): void {
    this.frames++;
    this.drawCalls += sample.drawCalls;
    this.drawCallsMax = Math.max(this.drawCallsMax, sample.drawCalls);
    this.shadowDrawCalls += sample.shadowDrawCalls;
    this.shadowDrawCallsMax = Math.max(this.shadowDrawCallsMax, sample.shadowDrawCalls);
    // InstancedBufferGeometry without a bounded instance count reports Infinity; one such frame
    // would turn the whole mean into null in JSON.
    if (Number.isFinite(sample.triangles)) {
      this.triangles += sample.triangles;
      this.finiteTriangleFrames++;
    } else {
      this.nonFiniteTriangleFrames++;
    }
    this.textureUploads += sample.textureUploads;
    this.uploadBytes += sample.uploadBytes;
    this.programLinks += sample.programLinks;
    this.probeMs += sample.probeMs;
    if (sample.cpuMs !== null) this.cpuMs.push(sample.cpuMs);
    if (sample.gpuMs !== null) this.gpuMs.push(sample.gpuMs);
  }

  /**
   * One frame's cost from the clock: the display interval on the real clock (what a player feels),
   * the processing time of a stepped frame on the virtual clock.
   */
  addFrameCost(ms: number): void {
    if (Number.isFinite(ms)) this.frameCosts.push(ms);
  }

  get frameCount(): number {
    return this.frames;
  }

  summary(): RenderWindowStats {
    const per = (total: number) => (this.frames > 0 ? round(total / this.frames, 1) : 0);
    return {
      frames: this.frames,
      drawCallsMean: per(this.drawCalls),
      drawCallsMax: this.drawCallsMax,
      shadowDrawCallsMean: per(this.shadowDrawCalls),
      shadowDrawCallsMax: this.shadowDrawCallsMax,
      trianglesMean: this.finiteTriangleFrames > 0 ? Math.round(this.triangles / this.finiteTriangleFrames) : null,
      nonFiniteTriangleFrames: this.nonFiniteTriangleFrames,
      textureUploads: this.textureUploads,
      uploadBytes: this.uploadBytes,
      programLinks: this.programLinks,
      cpuFrameMs: summarizeDistribution(this.cpuMs),
      gpuFrameMs: summarizeDistribution(this.gpuMs),
      frameCostMs: summarizeDistribution(this.frameCosts),
      probeMsMean: this.frames > 0 ? round(this.probeMs / this.frames, 3) : 0,
    };
  }
}

function difference(end: number | null, start: number | null): number | null {
  return end === null || start === null ? null : end - start;
}

/** React totals between two readings of the cumulative counters. */
export function reactTotalsBetween(start: ReactCommitTotals, end: ReactCommitTotals): ReactCommitTotals {
  return {
    domCommits: difference(end.domCommits, start.domCommits),
    r3fCommits: difference(end.r3fCommits, start.r3fCommits),
    r3fRenders: difference(end.r3fRenders, start.r3fRenders),
    // The per-commit maximum is not cumulative; the end reading holds the maximum since its last reset.
    r3fRendersPerCommitMax: end.r3fRendersPerCommitMax,
  };
}

interface OpenWindow {
  startT: number;
  react: ReactCommitTotals;
  render: RenderAccumulator;
}

/**
 * Named measurement windows (measure-start / measure-end). Windows may nest or overlap; each
 * collects the render samples of the frames drawn while it was open.
 */
class MeasurementWindows {
  private readonly open = new Map<string, OpenWindow>();
  private readonly closed: Record<string, WindowMetrics> = {};

  start(label: string, t: number, react: ReactCommitTotals): void {
    this.open.set(label, { startT: t, react, render: new RenderAccumulator() });
  }

  add(sample: RenderSample): void {
    for (const entry of this.open.values()) entry.render.add(sample);
  }

  addFrameCost(ms: number): void {
    for (const entry of this.open.values()) entry.render.addFrameCost(ms);
  }

  /** Returns false when no window of that name is open. */
  end(label: string, t: number, react: ReactCommitTotals): boolean {
    const entry = this.open.get(label);
    if (!entry) return false;
    this.open.delete(label);
    this.closed[label] = {
      label,
      virtualDurationMs: round(t - entry.startT, 1),
      render: entry.render.summary(),
      react: reactTotalsBetween(entry.react, react),
    };
    return true;
  }

  /** Closes every window still open (the run ended inside it). */
  finish(t: number, react: ReactCommitTotals): void {
    for (const label of [...this.open.keys()]) this.end(label, t, react);
  }

  results(): Record<string, WindowMetrics> {
    return { ...this.closed };
  }
}

/**
 * The render side of one run: per-frame samples from the moment the scene is ready, GPU
 * resources at ready and at the end, the scene inventory and the measurement windows.
 */
export class RunRenderLedger {
  readonly windows = new MeasurementWindows();
  private run = new RenderAccumulator();
  private atReady: RenderSample | null = null;
  private last: RenderSample | null = null;
  private inventory: SceneInventory | null = null;

  sample(sample: RenderSample): void {
    this.last = sample;
    this.run.add(sample);
    this.windows.add(sample);
  }

  frameCost(ms: number): void {
    this.run.addFrameCost(ms);
    this.windows.addFrameCost(ms);
  }

  /** Loading work (first compiles and uploads) is not part of the run's statistics. */
  markReady(inventory: SceneInventory | null): void {
    this.atReady = this.last;
    this.run = new RenderAccumulator();
    this.inventory = inventory;
  }

  lastSample(): RenderSample | null {
    return this.last;
  }

  metrics(): RenderMetrics | undefined {
    const last = this.last;
    if (!last || this.run.frameCount === 0) return undefined;
    const atReady = this.atReady ?? last;
    return {
      ...this.run.summary(),
      texturesAtReady: atReady.textures,
      texturesAtEnd: last.textures,
      geometriesAtReady: atReady.geometries,
      geometriesAtEnd: last.geometries,
      programsAtEnd: last.programs,
      inventory: this.inventory,
    };
  }
}
