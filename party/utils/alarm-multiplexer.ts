/**
 * A Durable Object has exactly one alarm. The multiplexer lets independent subsystems (game timeouts,
 * telemetry delivery) each own a named deadline; the storage alarm is always armed for the earliest one.
 *
 * Deadlines live in memory: every subsystem re-arms its channel in onStart, which also runs before
 * onAlarm when an alarm wakes an evicted object.
 */

export interface AlarmStorage {
  setAlarm(scheduledTime: number): Promise<void> | void;
  deleteAlarm(): Promise<void> | void;
}

export interface AlarmChannel {
  setAlarm(scheduledTime: number): Promise<void>;
  deleteAlarm(): Promise<void>;
}

export type AlarmHandlers = Record<string, () => Promise<void> | void>;

/** A channel whose handler failed runs again after this delay (unless it re-armed itself). */
export const ALARM_HANDLER_RETRY_MS = 15_000;

export class AlarmMultiplexer {
  private readonly deadlines = new Map<string, number>();
  private armedAt: number | null = null;

  constructor(
    private readonly storage: AlarmStorage,
    private readonly now: () => number = Date.now
  ) {}

  channel(name: string): AlarmChannel {
    return {
      setAlarm: async (scheduledTime) => {
        this.deadlines.set(name, scheduledTime);
        await this.sync();
      },
      deleteAlarm: async () => {
        this.deadlines.delete(name);
        await this.sync();
      },
    };
  }

  /**
   * Runs every channel whose deadline has passed, then re-arms for the remaining ones. Channels are
   * isolated: a failing handler is logged and retried on its own channel, and never keeps the later
   * channels from running (their deadlines were already taken off and would be lost).
   */
  async dispatch(handlers: AlarmHandlers): Promise<void> {
    // The platform clears the alarm when it fires.
    this.armedAt = null;
    const now = this.now();
    const due = [...this.deadlines].filter(([, at]) => at <= now).map(([name]) => name);
    for (const name of due) this.deadlines.delete(name);

    try {
      for (const name of due) {
        try {
          await handlers[name]?.();
        } catch (error) {
          console.error(JSON.stringify({ level: 'error', msg: 'alarm_handler_failed', channel: name, error: String(error) }));
          if (!this.deadlines.has(name)) this.deadlines.set(name, this.now() + ALARM_HANDLER_RETRY_MS);
        }
      }
    } finally {
      await this.sync();
    }
  }

  private async sync(): Promise<void> {
    const next = this.deadlines.size > 0 ? Math.min(...this.deadlines.values()) : null;
    if (next === this.armedAt) return;
    this.armedAt = next;
    if (next === null) await this.storage.deleteAlarm();
    else await this.storage.setAlarm(next);
  }
}
