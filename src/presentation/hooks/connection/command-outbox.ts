import { ClientCommandType } from '@shared/domain';
import { COMMAND_OUTBOX } from '@/presentation/config/connection.config';

import { withRequestId } from './socket-command';

export type OutboxCommand = Record<string, unknown> & { type: string; requestId: string };

export interface OutboxEntry {
  readonly requestId: string;
  readonly type: string;
  readonly command: OutboxCommand;
  readonly createdAt: number;
  /** The socket generation it last went out on; null while it waits for an open line. */
  sentOn: number | null;
}

/** How a command left the outbox. */
export type CommandOutcome = 'acknowledged' | 'rejected' | 'expired';

/**
 * Commands whose moment passes with the socket they went out on: a reaction or a nudge sent into a
 * connection that died is dropped, not replayed seconds later on the next one.
 */
const EPHEMERAL_COMMANDS: ReadonlySet<string> = new Set([
  ClientCommandType.SEND_EMOTE,
  ClientCommandType.PLAY_TIMEOUT_SOUND,
]);

export interface DueCommands {
  /** To send now on the current socket, oldest first. */
  due: OutboxEntry[];
  /** Too old (or ephemeral and lost with their socket): dropped without a resend. */
  expired: OutboxEntry[];
}

/**
 * The client's commands until the server settles them. A command is kept from the moment the
 * player issues it until the server acknowledges it (COMMAND_ACK), refuses it (ERROR with its
 * requestId) or it expires. Commands that went out on a socket that then died are sent again on
 * the next one with the same requestId; the server applies each requestId once, so a resend of a
 * command it already applied only repeats the answer.
 */
export class CommandOutbox {
  private readonly entries = new Map<string, OutboxEntry>();

  get size(): number {
    return this.entries.size;
  }

  /**
   * Keeps `command` (giving it a requestId if it has none). When full, the oldest entries make
   * room; they are returned so the caller settles them (a dropped play must not stay pending).
   */
  add(command: { type: string } & Record<string, unknown>): { entry: OutboxEntry; evicted: OutboxEntry[] } {
    const withId = withRequestId(command) as OutboxCommand;
    this.entries.delete(withId.requestId);
    const evicted: OutboxEntry[] = [];
    for (const oldest of this.entries.values()) {
      if (this.entries.size - evicted.length < COMMAND_OUTBOX.MAX_SIZE) break;
      evicted.push(oldest);
    }
    for (const dropped of evicted) this.entries.delete(dropped.requestId);
    const entry: OutboxEntry = { requestId: withId.requestId, type: withId.type, command: withId, createdAt: Date.now(), sentOn: null };
    this.entries.set(entry.requestId, entry);
    return { entry, evicted };
  }

  /**
   * What the socket of `generation` still has to send: entries that never went out on it. Expired
   * entries (also ones already sent on this socket), and ephemeral ones lost with an earlier socket,
   * are removed and returned separately.
   */
  takeDue(generation: number): DueCommands {
    const expired = this.expire(generation);
    const due = [...this.entries.values()].filter((entry) => entry.sentOn !== generation);
    return { due, expired };
  }

  /**
   * Removes and returns what can no longer be settled: commands older than the time to live, sent
   * or not (a server that never answers them, e.g. one without COMMAND_ACK, must not keep them
   * forever), and ephemeral commands that went out on a socket other than `generation`.
   */
  expire(generation: number): OutboxEntry[] {
    const now = Date.now();
    const expired = [...this.entries.values()].filter((entry) => {
      const lostWithSocket = entry.sentOn !== null && entry.sentOn !== generation && EPHEMERAL_COMMANDS.has(entry.type);
      return now - entry.createdAt > COMMAND_OUTBOX.COMMAND_TTL_MS || lostWithSocket;
    });
    for (const entry of expired) this.entries.delete(entry.requestId);
    return expired;
  }

  markSent(requestId: string, generation: number): void {
    const entry = this.entries.get(requestId);
    if (entry) entry.sentOn = generation;
  }

  /** The server settled the command (COMMAND_ACK or ERROR); returns it when it was still kept. */
  settle(requestId: string): OutboxEntry | undefined {
    const entry = this.entries.get(requestId);
    if (entry) this.entries.delete(requestId);
    return entry;
  }

  /**
   * The newest command that went out on the socket of `generation` and is still unsettled: what an
   * ERROR without a requestId most likely refuses (servers before protocol 2 answer each frame in
   * order and do not correlate their errors).
   */
  newestSentOn(generation: number): OutboxEntry | undefined {
    return [...this.entries.values()].filter((entry) => entry.sentOn === generation).at(-1);
  }

  /** Forgets every command (left the room on purpose, kicked, refused); returns them. */
  clear(): OutboxEntry[] {
    const all = [...this.entries.values()];
    this.entries.clear();
    return all;
  }
}
