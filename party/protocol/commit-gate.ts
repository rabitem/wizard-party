/**
 * Orders every state change before the messages that announce it.
 *
 * Each server entry point (a command, an alarm, a bot turn, a disconnect timer) runs as one
 * transaction: handlers change the game, ask for the state to be saved and queue their messages.
 * When the outermost transaction ends, the gate first issues the storage write and only then hands
 * the queued messages to the sockets. On Cloudflare a Durable Object holds outgoing messages while
 * a write it issued is in flight (output gate), so no client ever sees a move that a crash could
 * still lose. Outside a transaction a save is issued and a message delivered immediately.
 *
 * `settle` runs at the end of every outermost transaction, before the save: the room reconciles
 * what it waits for (bot turn, alarm) with the state the transaction left, whichever entry point
 * changed it. A failing settle is logged and never keeps the commit from happening.
 */
export class CommitGate {
  private depth = 0;
  private saveRequested = false;
  private queued: (() => void)[] = [];

  /** `persist` must issue the storage write synchronously (before it awaits anything). */
  constructor(
    private readonly persist: () => void,
    private readonly settle: () => void = () => undefined
  ) {}

  /** Runs `work` as (part of) a transaction; the outermost call commits, even when `work` throws. */
  run<T>(work: () => T): T {
    this.depth += 1;
    try {
      return work();
    } finally {
      this.depth -= 1;
      if (this.depth === 0) this.commit();
    }
  }

  /** Asks for the current state to be written before the transaction's messages go out. */
  requestSave(): void {
    if (this.depth === 0) {
      this.persist();
      return;
    }
    this.saveRequested = true;
  }

  /** Sends (or closes) on commit, in the order queued; immediately outside a transaction. */
  deliver(send: () => void): void {
    if (this.depth === 0) {
      send();
      return;
    }
    this.queued.push(send);
  }

  private commit(): void {
    try {
      this.settle();
    } catch (error) {
      console.error('[Server] Settling the transaction failed:', error);
    }
    if (this.saveRequested) {
      this.saveRequested = false;
      this.persist();
    }
    const queued = this.queued;
    this.queued = [];
    for (const send of queued) {
      try {
        send();
      } catch (error) {
        // One socket that closed under us must not keep the others from hearing the commit.
        console.warn('[Server] Dropped a message to a closed connection:', error);
      }
    }
  }
}
