/** A run paused for its driver: a frozen snapshot to compare, or a real input to perform. */
export interface SandboxHold {
  kind: 'snapshot' | 'external';
  label: string;
}

/**
 * The hand-over point between a run and the driver attached to it (Playwright, an agent).
 * The run parks on hold(); the driver sees it in status().held, does its part (toHaveScreenshot,
 * real touch input) and calls release(). Release is event-driven, so it works while the virtual
 * clock is paused; the run's own real-time timeout covers a driver that never answers.
 */
export class SandboxHoldGate {
  private active: (SandboxHold & { token: number; resolve: (released: boolean) => void }) | null = null;
  private nextToken = 1;

  constructor(private readonly onChange: (hold: SandboxHold | null) => void) {}

  get current(): SandboxHold | null {
    return this.active ? { kind: this.active.kind, label: this.active.label } : null;
  }

  /** Resolves true once released, false when `timeout` settles first or the run is torn down. */
  hold(hold: SandboxHold, timeout: Promise<void>): Promise<boolean> {
    this.cancel();
    const token = this.nextToken++;
    const released = new Promise<boolean>((resolve) => {
      this.active = { ...hold, token, resolve };
    });
    this.onChange(this.current);
    void timeout.then(() => this.settle(false, token));
    return released;
  }

  /** Releases the current hold (when `label` is given, only a hold of that label). */
  release(label?: string): boolean {
    if (!this.active || (label !== undefined && this.active.label !== label)) return false;
    return this.settle(true, this.active.token);
  }

  /** Ends any hold without a release (run stopped). */
  cancel(): void {
    if (this.active) this.settle(false, this.active.token);
  }

  private settle(released: boolean, token: number): boolean {
    const active = this.active;
    if (!active || active.token !== token) return false;
    this.active = null;
    active.resolve(released);
    this.onChange(null);
    return true;
  }
}
