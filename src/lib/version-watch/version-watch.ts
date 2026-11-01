import { isReleaseVersion } from '../app-version';

/** Decides when to check: periodically and when the page is shown again. */
export interface VersionCheckScheduler {
  /** Starts calling `tick`; returns the function that stops it. */
  start(tick: () => void): () => void;
}

export interface VersionWatchDeps {
  /** The release this tab is running. */
  currentVersion: string;
  /** The release the deployment serves now; null when it could not be read. */
  fetchDeployedVersion: () => Promise<string | null>;
  scheduler: VersionCheckScheduler;
  now: () => number;
  /** Ticks closer together than this are skipped. */
  minCheckGapMs: number;
}

/**
 * Notices that a newer release was deployed while this tab stays open, so the player can reload
 * into it. Checks run only while someone subscribes and stop once a newer release was found
 * (the answer cannot change back). Unversioned builds (local dev) never check.
 *
 * The notice has one place on screen: the in-game HUD shows it in its own region while mounted
 * (an inline host); everywhere else a floating banner shows it.
 */
export class VersionWatch {
  private available = false;
  private dismissed = false;
  private inlineHosts = 0;
  private lastCheckAt = Number.NEGATIVE_INFINITY;
  private checking = false;
  private stopScheduler: (() => void) | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly deps: VersionWatchDeps) {}

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    if (this.listeners.size === 1) this.startChecking();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.stopChecking();
    };
  };

  /** A newer release than the one this tab runs is deployed. */
  readonly isAvailable = (): boolean => this.available;

  /** The player closed the notice for the rest of this page's life. */
  readonly isDismissed = (): boolean => this.dismissed;

  /** Some mounted view (the in-game HUD) shows the notice itself. */
  readonly hasInlineHost = (): boolean => this.inlineHosts > 0;

  readonly dismiss = (): void => {
    if (this.dismissed) return;
    this.dismissed = true;
    this.notify();
  };

  /** Registers a view that shows the notice inline; returns its release. */
  readonly claimInlineHost = (): (() => void) => {
    this.inlineHosts += 1;
    this.notify();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.inlineHosts -= 1;
      this.notify();
    };
  };

  /** Asks the deployment for its release, unless a check ran moments ago or one is underway. */
  async check(): Promise<void> {
    if (this.available || this.checking || !isReleaseVersion(this.deps.currentVersion)) return;
    const now = this.deps.now();
    if (now - this.lastCheckAt < this.deps.minCheckGapMs) return;
    this.lastCheckAt = now;
    this.checking = true;
    try {
      const deployed = await this.deps.fetchDeployedVersion();
      if (isReleaseVersion(deployed) && deployed !== this.deps.currentVersion) {
        this.available = true;
        this.stopChecking();
        this.notify();
      }
    } catch {
      // Offline or the deployment is restarting: the next tick asks again.
    } finally {
      this.checking = false;
    }
  }

  private startChecking(): void {
    if (this.stopScheduler || this.available || !isReleaseVersion(this.deps.currentVersion)) return;
    this.stopScheduler = this.deps.scheduler.start(() => void this.check());
  }

  private stopChecking(): void {
    this.stopScheduler?.();
    this.stopScheduler = null;
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}
