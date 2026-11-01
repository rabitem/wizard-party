import { SANDBOX_AUDIT } from '../../config/sandbox.config';
import type { Anomaly, AnomalyCode, AnomalySeverity, TimelineEntry, TimelineKind, Vec3 } from './sandbox.types';

/** Errors are animation or timing bugs; warnings are UX problems; info is diagnostic only. */
export const ANOMALY_SEVERITY: Record<AnomalyCode, AnomalySeverity> = {
  'non-finite-transform': 'error',
  teleport: 'error',
  'handoff-pop': 'error',
  'handoff-gap': 'error',
  'camera-jump': 'warn',
  'render-stall': 'warn',
  'path-kink': 'error',
  'rotation-pop': 'error',
  'double-render': 'error',
  'remount-flicker': 'error',
  'below-table': 'error',
  'hand-offscreen': 'warn',
  'played-offscreen': 'warn',
  'overlapping-play-animations': 'error',
  'premature-all-landed': 'error',
  'collect-before-landed': 'error',
  'premature-collect-complete': 'error',
  'trick-overlap': 'warn',
  'duplicate-land': 'warn',
  'skipped-play-animation': 'error',
  'skipped-collection': 'error',
  'not-settled': 'error',
  'collection-stuck': 'error',
  'trick-state-stuck': 'error',
  'hand-animation-stuck': 'error',
  'hand-count-mismatch': 'error',
  'wait-timeout': 'error',
  'step-failed': 'error',
  'console-error': 'error',
  'page-error': 'error',
  'hud-offscreen': 'warn',
  'page-overflow': 'warn',
  'slow-frame': 'info',
  // Playability: what the player sees and can touch.
  'hud-overlap': 'warn',
  'hud-occludes-scene': 'warn',
  'tap-target-small': 'warn',
  'scene-text-unreadable': 'warn',
  'scene-occluded': 'error',
  'hand-translucent': 'warn',
  'square-particles': 'warn',
  // Environment and faults.
  'webgl-unavailable': 'error',
  // Frame times on a software renderer say nothing about a player's GPU; correctness still holds.
  'software-renderer': 'info',
  'context-not-restored': 'error',
  'hold-timeout': 'error',
};

export function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function roundVec(vec: Vec3): Vec3 {
  return [round(vec[0]), round(vec[1]), round(vec[2])];
}

/** Anomalies (deduplicated by code and subject) and the run timeline, in run-relative time. */
export class AuditLog {
  /** Current probe frame; stamped on every entry. */
  frame = 0;
  private startT = 0;
  private readonly anomalies = new Map<string, Anomaly>();
  private readonly timeline: TimelineEntry[] = [];
  private droppedTimelineEntries = 0;

  rebase(t: number): void {
    this.startT = t;
  }

  relative(t: number): number {
    return round(t - this.startT, 1);
  }

  log(t: number, kind: TimelineKind, label: string, data?: Record<string, unknown>): void {
    if (this.timeline.length >= SANDBOX_AUDIT.MAX_TIMELINE_ENTRIES) {
      this.droppedTimelineEntries++;
      return;
    }
    this.timeline.push({ t: this.relative(t), frame: this.frame, kind, label, ...(data ? { data } : {}) });
  }

  flag(t: number, code: AnomalyCode, message: string, subject?: string, data?: Record<string, unknown>): void {
    const key = `${code}|${subject ?? ''}`;
    const existing = this.anomalies.get(key);
    if (existing) {
      existing.count++;
      return;
    }
    this.anomalies.set(key, {
      code,
      severity: ANOMALY_SEVERITY[code],
      t: this.relative(t),
      frame: this.frame,
      message,
      ...(subject ? { subject } : {}),
      count: 1,
      ...(data ? { data } : {}),
    });
  }

  anomalyList(): Anomaly[] {
    return [...this.anomalies.values()].sort((a, b) => a.t - b.t);
  }

  timelineEntries(endT: number): TimelineEntry[] {
    if (this.droppedTimelineEntries === 0) return this.timeline;
    return [
      ...this.timeline,
      { t: this.relative(endT), frame: this.frame, kind: 'run', label: `timeline truncated (${this.droppedTimelineEntries} entries dropped)` },
    ];
  }
}
