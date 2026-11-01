import { systemTimers, type RoomTimers, type TimerHandle } from './ports';

interface ScheduledTask {
  handle: TimerHandle;
  dueAt: number;
}

/**
 * The room's in-memory deadlines, by name. Every name has at most one pending task: scheduling a
 * name again replaces its task, so no handler can start a second chain of bot turns or a second
 * disconnect timer for a seat. Tasks are cancelled by name or all at once (dispose).
 */
export class RoomScheduler {
  private readonly tasks = new Map<string, ScheduledTask>();

  constructor(
    private readonly timers: RoomTimers = systemTimers,
    private readonly now: () => number = () => Date.now()
  ) {}

  /** Runs `task` after `delayMs` under `name`, replacing any task pending under that name. */
  schedule(name: string, delayMs: number, task: () => void): void {
    this.cancel(name);
    const scheduled: ScheduledTask = { handle: undefined, dueAt: this.now() + delayMs };
    scheduled.handle = this.timers.setTimeout(() => {
      // A replaced task never runs, even when its timer could not be cleared in time.
      if (this.tasks.get(name) !== scheduled) return;
      this.tasks.delete(name);
      task();
    }, delayMs);
    this.tasks.set(name, scheduled);
  }

  /** Cancels the task pending under `name`; true when there was one. */
  cancel(name: string): boolean {
    const scheduled = this.tasks.get(name);
    if (!scheduled) return false;
    this.timers.clearTimeout(scheduled.handle);
    this.tasks.delete(name);
    return true;
  }

  isScheduled(name: string): boolean {
    return this.tasks.has(name);
  }

  /** When the task under `name` is due, or null when none is pending. */
  dueAt(name: string): number | null {
    return this.tasks.get(name)?.dueAt ?? null;
  }

  /** Names with a pending task (for invariant checks). */
  pendingNames(): string[] {
    return Array.from(this.tasks.keys());
  }

  dispose(): void {
    for (const name of Array.from(this.tasks.keys())) this.cancel(name);
  }
}
