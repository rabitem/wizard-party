import { INITIAL_TIER_DETECTION as D, type RenderQualityTier } from '@/presentation/config/render-quality.config';

export type GpuClass = 'software' | 'integrated' | 'discrete' | 'unknown';

/** What the initial tier is chosen from; read once per page by readRenderDeviceSignals(). */
export interface RenderDeviceSignals {
  /** Unmasked GPU renderer string; null or a brand name when the browser masks it (Brave, Firefox RFP). */
  renderer: string | null;
  /** WebGL2 only works with failIfMajorPerformanceCaveat off: a software or blocklisted GPU. */
  majorPerformanceCaveat: boolean;
  /** navigator.hardwareConcurrency (0 when unknown) */
  cores: number;
  /** navigator.deviceMemory in GB (0 when unknown, e.g. Safari) */
  memoryGb: number;
  /** Primary input is touch (phones, tablets) */
  coarsePointer: boolean;
  devicePixelRatio: number;
}

const matchesAny = (patterns: readonly RegExp[], value: string) => patterns.some((pattern) => pattern.test(value));

export function classifyGpu(renderer: string | null): GpuClass {
  if (!renderer) return 'unknown';
  if (matchesAny(D.SOFTWARE_RENDERER_PATTERNS, renderer)) return 'software';
  if (matchesAny(D.DISCRETE_RENDERER_PATTERNS, renderer)) return 'discrete';
  if (matchesAny(D.INTEGRATED_RENDERER_PATTERNS, renderer)) return 'integrated';
  return 'unknown';
}

function selectTouchTier(signals: RenderDeviceSignals, gpu: GpuClass): RenderQualityTier {
  const lowMemory = signals.memoryGb > 0 && signals.memoryGb <= D.LOW_MEMORY_GB;
  // Capable phones and tablets get DPR 2: at 1.5 a 3x screen upscales card art by 2x.
  if (gpu === 'discrete' || (signals.cores >= D.HIGH_CORES && !lowMemory)) return 'high';
  return 'medium';
}

/**
 * Starting tier from device signals. Renderer strings can be masked, so they only refine the
 * choice; the runtime governor corrects whatever this gets wrong.
 */
export function selectInitialTier(signals: RenderDeviceSignals): RenderQualityTier {
  const gpu = classifyGpu(signals.renderer);
  if (gpu === 'software' || signals.majorPerformanceCaveat) return 'low';
  if (signals.coarsePointer) return selectTouchTier(signals, gpu);

  const fewCores = signals.cores > 0 && signals.cores <= D.LOW_CORES;
  const lowMemory = signals.memoryGb > 0 && signals.memoryGb <= D.LOW_MEMORY_GB;
  if (gpu === 'integrated' || fewCores || lowMemory) return 'medium';
  if (gpu === 'discrete') return signals.devicePixelRatio > D.HIGH_DPR ? 'high' : 'ultra';
  return 'high';
}
