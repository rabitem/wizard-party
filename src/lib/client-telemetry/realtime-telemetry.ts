import { ClientCommandType, GameEventType } from '@shared/domain';
import { CLIENT_TELEMETRY_LIMITS, type CommandRttMatch, type CommandRttOutcome } from '@shared/telemetry';

import { REALTIME_TELEMETRY_CONFIG } from './client-telemetry.config';
import type { TelemetrySink } from './client-telemetry';

/**
 * How a server message answers a command. The server does not echo requestIds, so messages are
 * attributed by their actor where the server tells us one; everything else is a documented
 * heuristic (`matchedBy` in the payload).
 *
 * - `actorField`: the message is a broadcast that names its actor in this field; it only answers
 *   the command when the actor is this player.
 * - `actorField: null`: personalized state push; answers the oldest waiting command (heuristic).
 */
export interface CommandAckRule {
  eventType: string;
  actorField: string | null;
}

const STATE_ACK: readonly CommandAckRule[] = [{ eventType: GameEventType.GAME_STATE, actorField: null }];

/** OCP: commands with an attributable broadcast; unlisted commands fall back to STATE_ACK. */
export const COMMAND_ACK_RULES: Readonly<Record<string, readonly CommandAckRule[]>> = {
  [ClientCommandType.PLAY_CARD]: [{ eventType: GameEventType.CARD_PLAYED, actorField: 'playerId' }],
  [ClientCommandType.PLACE_BID]: [{ eventType: GameEventType.BID_PLACED, actorField: 'playerId' }],
  [ClientCommandType.SEND_EMOTE]: [{ eventType: GameEventType.EMOTE, actorField: 'playerId' }],
  [ClientCommandType.SEND_CHAT]: [{ eventType: GameEventType.CHAT_MESSAGE, actorField: 'playerId' }],
  [ClientCommandType.PLAY_TIMEOUT_SOUND]: [{ eventType: GameEventType.TIMEOUT_SOUND_PLAYED, actorField: 'senderPlayerId' }],
};

/** Commands the server answers with nothing observable; measuring them would only yield noise. */
export const UNTRACKED_COMMANDS: ReadonlySet<string> = new Set([
  ClientCommandType.UPDATE_SOUND_PREFERENCES,
  ClientCommandType.LEAVE_GAME,
]);

/** The parts of a server message the tracker reads. */
export type ServerMessage = { type: string } & Readonly<Record<string, unknown>>;

interface PendingCommand {
  requestId: string;
  commandType: string;
  sentAt: number;
}

export interface SocketCloseInfo {
  code: number;
  reason: string;
  wasClean: boolean;
  intentional: boolean;
}

/** WebSocket "abnormal closure": used when a close event carries no usable code. */
const ABNORMAL_CLOSE_CODE = 1006;

type CloseEventLike = { code?: unknown; reason?: unknown; wasClean?: unknown };

/**
 * Close details from a socket close event, never trusting its shape. In browsers partysocket
 * re-dispatches its own close events (reconnect, close, connect timeout) as
 * `new e.constructor(e.type, e)`, which shifts the arguments of its CloseEvent: `code` becomes
 * "close" and `reason` the original event. The original carries the real details then.
 */
export function socketCloseInfo(event: CloseEventLike, intentional: boolean): SocketCloseInfo {
  const source: CloseEventLike = typeof event.reason === 'object' && event.reason !== null ? (event.reason as CloseEventLike) : event;
  return {
    code: typeof source.code === 'number' ? source.code : ABNORMAL_CLOSE_CODE,
    reason: typeof source.reason === 'string' ? source.reason : '',
    wasClean: source.wasClean === true,
    intentional,
  };
}

/** Application close code (4000-4999 range) reported when connecting gave up before `open`. */
export const CONNECT_TIMEOUT_CLOSE_CODE = 4008;
export const CONNECT_TIMEOUT_REASON = 'connect_timeout';

const bounded = (value: string) => value.slice(0, CLIENT_TELEMETRY_LIMITS.MAX_TEXT_CHARS);

/**
 * Realtime connection quality for one game connection: connect duration, disconnects with close
 * codes, reconnects with downtime, and command round-trip times. Pure (clock injected) and cheap.
 */
export class RealtimeTelemetry {
  private pending: PendingCommand[] = [];
  private connectStartedAt: number | null = null;
  private connectedAt: number | null = null;
  private attempt = 0;
  private hasConnected = false;
  private lastUnintentionalCloseAt: number | null = null;
  /** In-game player id of this tab (GAME_STATE.yourPlayerId), the actor of its own broadcasts. */
  private localPlayerId: string | null = null;

  constructor(
    private readonly sink: Pick<TelemetrySink, 'track'>,
    private readonly now: () => number = Date.now
  ) {}

  connecting(): void {
    this.connectStartedAt = this.now();
    this.attempt++;
  }

  opened(): void {
    const now = this.now();
    const isReconnect = this.hasConnected && this.lastUnintentionalCloseAt !== null;
    this.sink.track('ws.connected', {
      connectMs: this.connectStartedAt === null ? 0 : now - this.connectStartedAt,
      attempt: this.attempt,
      isReconnect,
      downtimeMs: isReconnect && this.lastUnintentionalCloseAt !== null ? now - this.lastUnintentionalCloseAt : null,
    });
    this.connectedAt = now;
    this.hasConnected = true;
    this.attempt = 0;
    this.connectStartedAt = null;
    this.lastUnintentionalCloseAt = null;
  }

  closed(info: SocketCloseInfo): void {
    this.expireTimedOut();
    const now = this.now();
    this.sink.track('ws.disconnected', {
      code: info.code,
      reason: bounded(info.reason),
      wasClean: info.wasClean,
      intentional: info.intentional,
      connectedForMs: this.connectedAt === null ? null : now - this.connectedAt,
    });
    this.connectedAt = null;
    // Commands in flight on a dead socket never get an answer on this connection.
    this.giveUpPending('lost');
    if (info.intentional) {
      this.hasConnected = false;
      this.attempt = 0;
      this.lastUnintentionalCloseAt = null;
      this.localPlayerId = null;
    } else {
      this.lastUnintentionalCloseAt ??= now;
    }
  }

  /** Connecting gave up before the socket opened; counts as an unintentional disconnect. */
  connectTimedOut(): void {
    this.closed({ code: CONNECT_TIMEOUT_CLOSE_CODE, reason: CONNECT_TIMEOUT_REASON, wasClean: false, intentional: false });
  }

  commandSent(requestId: string, commandType: string): void {
    this.expireTimedOut();
    if (UNTRACKED_COMMANDS.has(commandType)) return;
    if (this.pending.length >= REALTIME_TELEMETRY_CONFIG.MAX_PENDING_COMMANDS) this.pending.shift();
    this.pending.push({ requestId: bounded(requestId), commandType: bounded(commandType), sentAt: this.now() });
  }

  messageReceived(message: ServerMessage): void {
    this.expireTimedOut();
    if (message.type === GameEventType.GAME_STATE && typeof message.yourPlayerId === 'string') {
      this.localPlayerId = message.yourPlayerId;
    }
    if (this.pending.length === 0) return;

    if (message.type === GameEventType.ERROR) {
      // ERROR goes only to the sender, and one connection's commands are processed in order.
      this.emitRtt(this.pending.shift() as PendingCommand, 'error', message.type, 'error_fifo');
      return;
    }
    const index = this.pending.findIndex((command) => this.answers(command, message) !== null);
    if (index < 0) return;
    const [command] = this.pending.splice(index, 1);
    this.emitRtt(command, 'ack', message.type, this.answers(command, message));
  }

  private answers(command: PendingCommand, message: ServerMessage): CommandRttMatch | null {
    const rules = COMMAND_ACK_RULES[command.commandType] ?? STATE_ACK;
    for (const rule of rules) {
      if (rule.eventType !== message.type) continue;
      if (rule.actorField === null) return 'state';
      if (this.localPlayerId !== null && message[rule.actorField] === this.localPlayerId) return 'actor';
    }
    return null;
  }

  private expireTimedOut(): void {
    const deadline = this.now() - REALTIME_TELEMETRY_CONFIG.COMMAND_RTT_TIMEOUT_MS;
    while (this.pending.length > 0 && this.pending[0].sentAt <= deadline) {
      this.emitRtt(this.pending.shift() as PendingCommand, 'timeout', null, null);
    }
  }

  private giveUpPending(outcome: CommandRttOutcome): void {
    const pending = this.pending;
    this.pending = [];
    for (const command of pending) this.emitRtt(command, outcome, null, null);
  }

  private emitRtt(
    command: PendingCommand,
    outcome: CommandRttOutcome,
    ackEventType: string | null,
    matchedBy: CommandRttMatch | null
  ): void {
    this.sink.track('command.rtt', {
      requestId: command.requestId,
      commandType: command.commandType,
      rttMs: this.now() - command.sentAt,
      outcome,
      ackEventType,
      matchedBy,
    });
  }
}
