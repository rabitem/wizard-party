import { PROCESSED_COMMAND_LIMITS } from "../config/protocol.config";

/** How the log is persisted: seat -> [requestId, processedAt][]. */
export type ProcessedCommandEntries = [string, [string, number][]][];

/**
 * The requestIds each seat had applied recently. A client resends unanswered commands after a
 * reconnect with the same requestId; the log makes that safe. It is kept per seat (not per
 * connection) and persisted, so it survives both reconnects and server restarts.
 *
 * Only commands that change the room are logged; the ones the server merely answers (JOIN_GAME,
 * REQUEST_STATE, PING) are safe to repeat and their answer is wanted every time.
 */
export class ProcessedCommandLog {
  private readonly bySeat = new Map<string, Map<string, number>>();

  constructor(
    entries: ProcessedCommandEntries = [],
    private readonly windowMs: number = PROCESSED_COMMAND_LIMITS.WINDOW_MS,
    private readonly maxPerSeat: number = PROCESSED_COMMAND_LIMITS.MAX_PER_SEAT
  ) {
    for (const [seat, commands] of entries) {
      this.bySeat.set(seat, new Map(commands));
    }
  }

  has(seat: string, requestId: string, now: number): boolean {
    this.prune(now);
    return this.bySeat.get(seat)?.has(requestId) ?? false;
  }

  mark(seat: string, requestId: string, now: number): void {
    let commands = this.bySeat.get(seat);
    if (!commands) {
      commands = new Map();
      this.bySeat.set(seat, commands);
    }
    commands.delete(requestId);
    commands.set(requestId, now);
    // Insertion order is age order: drop the oldest beyond the per-seat bound.
    while (commands.size > this.maxPerSeat) {
      const oldest = commands.keys().next().value;
      if (oldest === undefined) break;
      commands.delete(oldest);
    }
  }

  /** Forgets a command that failed, so the client may send it again. */
  unmark(seat: string, requestId: string): void {
    const commands = this.bySeat.get(seat);
    if (!commands) return;
    commands.delete(requestId);
    if (commands.size === 0) this.bySeat.delete(seat);
  }

  toJSON(): ProcessedCommandEntries {
    return Array.from(this.bySeat, ([seat, commands]) => [seat, Array.from(commands)]);
  }

  private prune(now: number): void {
    for (const [seat, commands] of this.bySeat) {
      for (const [requestId, processedAt] of commands) {
        if (now - processedAt > this.windowMs) commands.delete(requestId);
      }
      if (commands.size === 0) this.bySeat.delete(seat);
    }
  }
}
