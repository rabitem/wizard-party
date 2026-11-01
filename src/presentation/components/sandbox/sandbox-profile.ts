import { SANDBOX_PERF_PROFILE } from '../../config/sandbox-budgets.config';
import type { SandboxProfileName } from './sandbox-report.types';

/**
 * How much the sandbox instruments a run.
 *
 * - audit (default): the probe samples every card every frame; motion checks see every step.
 * - perf (`?perf=1`): the probe samples cards every Nth frame and skips motion checks, so frame
 *   timing measures the game rather than the probe. Render counters stay per frame (they are O(1)).
 */
export interface SandboxProfile {
  name: SandboxProfileName;
  /** Card transforms are sampled on every Nth frame. */
  probeStride: number;
  /** Per-frame motion invariants (teleport, kinks, pops) need every frame; strided sampling skips them. */
  motionChecks: boolean;
}

const AUDIT_PROFILE: SandboxProfile = { name: 'audit', probeStride: 1, motionChecks: true };

/** Reads the profile from a query string such as `?clock=real&perf=1&probe=20`. */
export function parseSandboxProfile(search: string): SandboxProfile {
  const params = new URLSearchParams(search);
  const perf = params.get(SANDBOX_PERF_PROFILE.PARAM);
  if (perf !== '1' && perf !== 'true') return AUDIT_PROFILE;

  const requested = Number(params.get(SANDBOX_PERF_PROFILE.STRIDE_PARAM));
  const probeStride = Number.isInteger(requested) && requested >= 1
    ? Math.min(requested, SANDBOX_PERF_PROFILE.MAX_PROBE_SAMPLE_STRIDE)
    : SANDBOX_PERF_PROFILE.PROBE_SAMPLE_STRIDE;
  return { name: 'perf', probeStride, motionChecks: probeStride === 1 };
}

let cached: SandboxProfile | null = null;

/** The profile of the current page (fixed for its lifetime, like the clock). */
export function currentSandboxProfile(): SandboxProfile {
  if (typeof window === 'undefined') return AUDIT_PROFILE;
  cached ??= parseSandboxProfile(window.location.search);
  return cached;
}
