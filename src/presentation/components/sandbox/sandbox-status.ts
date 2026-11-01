import type { SandboxHold } from './sandbox-hold';
import type { AuditReport } from './sandbox.types';

export type SandboxStatus = 'idle' | 'starting' | 'running' | 'settling' | 'done';

export interface SandboxStatusSnapshot {
  status: SandboxStatus;
  runId: string | null;
  scenario: string | null;
  step: string | null;
  anomalies: number;
  /** The run waits for its driver (a held snapshot, an external input step). */
  held: SandboxHold | null;
  lastReport: AuditReport | null;
}

const IDLE_STATUS: SandboxStatusSnapshot = { status: 'idle', runId: null, scenario: null, step: null, anomalies: 0, held: null, lastReport: null };

/** The controller's status, observable by the control panel and polled by agents. */
export class SandboxStatusStore {
  private snapshot: SandboxStatusSnapshot = IDLE_STATUS;
  private readonly listeners = new Set<(status: SandboxStatusSnapshot) => void>();

  get current(): SandboxStatusSnapshot {
    return this.snapshot;
  }

  set(patch: Partial<SandboxStatusSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener(this.snapshot);
  }

  subscribe(listener: (status: SandboxStatusSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }
}
