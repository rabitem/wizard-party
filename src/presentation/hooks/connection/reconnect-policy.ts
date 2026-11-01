import { RECONNECT_POLICY } from '@/presentation/config/connection.config';

type Timer = ReturnType<typeof setTimeout>;

/** Delay of retry number `attempt` (1-based): full jitter over a doubling ceiling, with a floor. */
export function reconnectDelay(attempt: number, random: number): number {
  const ceiling = Math.min(RECONNECT_POLICY.MAX_DELAY_MS, RECONNECT_POLICY.BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1));
  const floor = Math.min(RECONNECT_POLICY.MIN_DELAY_MS, ceiling);
  return Math.round(floor + random * (ceiling - floor));
}

/**
 * When to try the next reconnect. Owns the attempt counter and the one pending retry timer:
 *
 * - `scheduleRetry` after an unexpected close or a timed-out connect; null once the retry budget
 *   is spent (the connection has failed);
 * - `retryNow` when the browser reports the network back or the page is shown again: a pending
 *   (or exhausted) retry runs at once instead of waiting out its backoff;
 * - `confirmed` once the server answered the join on a new socket (a GAME_STATE), not on any
 *   message: a socket that opens and is closed again at once (a seat taken elsewhere, a refused
 *   join) keeps backing off.
 */
export class ReconnectPolicy {
  private attempts = 0;
  private timer: Timer | null = null;
  private pendingRun: (() => void) | null = null;
  private readonly random: () => number;

  /** `random` is a number in [0, 1): Math.random in the browser, seeded in tests. */
  constructor({ random = Math.random }: { random?: () => number } = {}) {
    this.random = random;
  }

  /** Schedules `run` after the next backoff delay. Returns the delay, or null when the budget is spent. */
  scheduleRetry(run: () => void): number | null {
    this.cancel();
    this.pendingRun = run;
    if (this.attempts >= RECONNECT_POLICY.MAX_ATTEMPTS) return null;
    this.attempts += 1;
    const delay = reconnectDelay(this.attempts, this.random());
    this.timer = setTimeout(() => this.fire(), delay);
    return delay;
  }

  /**
   * Runs the pending (or exhausted) retry now. True when there was one; the attempt budget starts
   * over, since the reason to try again is new.
   */
  retryNow(): boolean {
    const run = this.pendingRun;
    if (!run) return false;
    this.cancel();
    this.attempts = 0;
    run();
    return true;
  }

  /** The server answered on the new socket: the next drop starts from the first delay again. */
  confirmed(): void {
    this.attempts = 0;
  }

  /** Forgets any pending retry (connected, left on purpose, or a terminal close). */
  cancel(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.pendingRun = null;
  }

  /** Back to a fresh policy (a deliberate new connection). */
  reset(): void {
    this.cancel();
    this.attempts = 0;
  }

  private fire(): void {
    const run = this.pendingRun;
    this.timer = null;
    this.pendingRun = null;
    run?.();
  }
}
