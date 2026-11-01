import { describe, expect, it } from 'vitest';
import { SANDBOX_PERF_PROFILE } from '../../config/sandbox-budgets.config';
import { parseSandboxProfile } from './sandbox-profile';

describe('parseSandboxProfile', () => {
  it('should audit every frame by default', () => {
    expect(parseSandboxProfile('?clock=fast&ui=0')).toEqual({ name: 'audit', probeStride: 1, motionChecks: true });
  });

  it('should sample every Nth frame and skip motion checks in perf mode', () => {
    expect(parseSandboxProfile('?clock=real&perf=1')).toEqual({
      name: 'perf',
      probeStride: SANDBOX_PERF_PROFILE.PROBE_SAMPLE_STRIDE,
      motionChecks: false,
    });
  });

  it('should honour an explicit stride within bounds', () => {
    expect(parseSandboxProfile('?perf=true&probe=20').probeStride).toBe(20);
    expect(parseSandboxProfile('?perf=1&probe=100000').probeStride).toBe(SANDBOX_PERF_PROFILE.MAX_PROBE_SAMPLE_STRIDE);
    expect(parseSandboxProfile('?perf=1&probe=0').probeStride).toBe(SANDBOX_PERF_PROFILE.PROBE_SAMPLE_STRIDE);
  });

  it('should keep motion checks when perf mode still samples every frame', () => {
    expect(parseSandboxProfile('?perf=1&probe=1')).toEqual({ name: 'perf', probeStride: 1, motionChecks: true });
  });
});
