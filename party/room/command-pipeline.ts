import type * as Party from '../runtime';
import {
  ClientCommandType,
  GameError,
  GameEventType,
  LEGACY_PROTOCOL_VERSION,
  ProtocolErrorCode,
  isLegacyProtocol,
  type ClientCommand,
  type CommandAckEvent,
  type ErrorEvent,
  type JoinGameCommand,
  type PongEvent,
} from '../../shared/domain';
import { CommandRejectionCode } from '../../shared/telemetry';
import {
  UNKNOWN_CLIENT_INFO,
  commandRejectedFact,
  rejectionFromError,
  rejectionWithCode,
  sessionStartedFact,
  type CommandRejection,
  type ConnectionTracker,
  type GameTelemetry,
  type RejectedCommandRef,
} from '../telemetry';
import { handleJoinGame, isRoutedCommand, routeCommand, type JoinOptions, type RoutedCommand } from '../handlers';
import { parseClientCommand, type RefusedClientCommand } from '../utils/client-command-parser';
import type { CommandRateLimiter } from '../protocol/command-rate-limiter';
import type { CommitGate } from '../protocol/commit-gate';
import { TOURNAMENT_ROOM_LIMITS, type TournamentMatchController } from '../tournament';
import { verifiedLook, type CharacterTicketVerifier } from '../session/character-tickets';
import type { ServerContext } from '../utils/types';
import type { RoomMessaging } from './room-messaging';
import type { RoomState } from './room-state';

/** Client-facing message for failures that are not domain errors (details stay server-side). */
const UNKNOWN_ERROR_MESSAGE = 'Unknown error';
const RATE_LIMITED_MESSAGE = 'Too many requests - slow down a little';

/** What the client is told about a rejected command; null rejects silently. */
interface ClientErrorNotice {
  message: string;
  code?: string;
}

/** Seats a joining connection with the options JOIN_GAME carried. */
type SeatJoin = (persistentId: string, options: JoinOptions) => void;

function clientNoticeFor(error: unknown): ClientErrorNotice {
  return error instanceof GameError
    ? { message: error.message, code: error.code }
    : { message: UNKNOWN_ERROR_MESSAGE };
}

export interface CommandPipelineDeps {
  state: RoomState;
  messaging: RoomMessaging;
  gate: CommitGate;
  telemetry: GameTelemetry;
  rateLimiter: CommandRateLimiter;
  tournament: TournamentMatchController;
  /** Null without CHARACTER_TICKET_SECRET: tickets are ignored and seats show no look. */
  characterTickets: CharacterTicketVerifier | null;
  connections: ConnectionTracker;
  context: () => ServerContext;
  /** A seat the host adapter vouches for on this connection (the sandbox's local player). */
  attestSeat: (connectionId: string) => string | undefined;
}

/**
 * Every client frame takes the same path: decode -> budget -> answer or apply (once per requestId).
 * Every refusal is recorded once and answered with an ERROR correlated to its requestId.
 */
export class CommandPipeline {
  private activeCommand: RejectedCommandRef | null = null;
  /** Grows with every refusal, so a caller can tell whether the work it ran refused its command. */
  private refusalCount = 0;

  constructor(private readonly deps: CommandPipelineDeps) {}

  /** One message is one transaction: its state is written before any reply goes out. */
  onMessage(message: string, sender: Party.Connection): void {
    if (this.holdWhileJoining(message, sender)) return;
    this.deps.gate.run(() => this.receive(message, sender));
  }

  /** A frame the protocol does not accept (binary data); the host closes the socket afterwards. */
  onInvalidFrame(sender: Party.Connection): void {
    this.deps.telemetry.withCause(
      { source: 'player', actorId: this.deps.state.playerOf(sender.id), senderKey: sender.id },
      () => this.rejectCommand(sender, rejectionWithCode(CommandRejectionCode.INVALID_FRAME, 'Text messages required'), null)
    );
  }

  private receive(message: string, sender: Party.Connection): void {
    const parsed = parseClientCommand(message);
    if (!parsed.ok) {
      this.refuseFrame(parsed, sender);
      return;
    }
    const command = parsed.command;
    this.logCommandReceived(command, sender);
    this.asCommand(command, sender, () => this.dispatch(command, sender));
  }

  /**
   * Runs `work` as the handling of `command`: under the command's telemetry cause, with every
   * refusal correlated to its requestId, and any failure answered with an ERROR.
   */
  private asCommand(command: ClientCommand, sender: Party.Connection, work: () => void): void {
    const actorId = this.deps.state.playerOf(sender.id) ??
      (command.type === ClientCommandType.JOIN_GAME ? command.persistentId : undefined);
    this.deps.telemetry.withCause(
      { source: 'player', actorId, commandType: command.type, correlationId: command.requestId, senderKey: sender.id },
      () => {
        this.activeCommand = { commandType: command.type, requestId: command.requestId };
        try {
          work();
        } catch (error) {
          console.error('[Server] Error handling command:', error);
          this.rejectCommand(sender, rejectionFromError(error), clientNoticeFor(error));
        } finally {
          this.activeCommand = null;
        }
      }
    );
  }

  /** A frame that did not decode to a command: recorded, and the client told why (unless unknown). */
  private refuseFrame(refusal: RefusedClientCommand, sender: Party.Connection): void {
    console.warn('[Server] Rejected command frame:', refusal.rejection.message);
    this.deps.telemetry.withCause(
      { source: 'player', actorId: this.deps.state.playerOf(sender.id), correlationId: refusal.requestId ?? undefined, senderKey: sender.id },
      () => {
        this.activeCommand = refusal.commandType === null
          ? null
          : { commandType: refusal.commandType, requestId: refusal.requestId };
        try {
          const notice = refusal.notifyClient
            ? { message: refusal.clientMessage, code: refusal.rejection.errorCode ?? undefined }
            : null;
          this.rejectCommand(sender, refusal.rejection, notice);
        } finally {
          this.activeCommand = null;
        }
      }
    );
  }

  private dispatch(command: ClientCommand, sender: Party.Connection): void {
    if (!this.admit(command, sender)) return;

    if (command.type === ClientCommandType.JOIN_GAME) {
      if (this.needsVerifiedJoin(command)) this.holdForVerifiedJoin(command, sender);
      else this.join(command, sender);
    } else if (command.type === ClientCommandType.REQUEST_STATE) {
      this.answerStateRequest(sender, command.requestId);
    } else if (command.type === ClientCommandType.PING) {
      this.sendPong(sender, command.requestId);
    } else if (isRoutedCommand(command) && this.isUnlocked(command, sender)) {
      this.applyOnce(command, sender);
    }
  }

  /** Tournament match rooms refuse the commands their match fixes (settings, bots, start, rematch). */
  private isUnlocked(command: RoutedCommand, sender: Party.Connection): boolean {
    const locked = this.deps.tournament.lockedCommandError(command.type);
    if (!locked) return true;
    this.sendError(sender, locked.message, locked.code, locked);
    return false;
  }

  /** The sender's budget for this kind of command (the seat once joined, else the socket). */
  private admit(command: ClientCommand, sender: Party.Connection): boolean {
    const senderKey = this.deps.state.playerOf(sender.id) ?? sender.id;
    if (this.deps.rateLimiter.tryAcquire(senderKey, command.type, Date.now())) return true;

    this.rejectCommand(
      sender,
      rejectionWithCode(CommandRejectionCode.RATE_LIMITED, `${command.type} sent too often`),
      { message: RATE_LIMITED_MESSAGE, code: ProtocolErrorCode.RATE_LIMITED }
    );
    return false;
  }

  /**
   * Applies a state-changing command once per (seat, requestId): a resent command (the client
   * retries after a reconnect) is answered with the current state instead of applied again.
   */
  private applyOnce(command: RoutedCommand, sender: Party.Connection): void {
    const { state } = this.deps;
    const seat = state.playerOf(sender.id);
    const requestId = command.requestId;
    const now = Date.now();

    if (seat === undefined || requestId === undefined) {
      routeCommand(this.deps.context(), command, sender);
      return;
    }
    if (state.processedCommands.has(seat, requestId, now)) {
      console.log(`[Server] Duplicate command ignored: ${command.type} (${requestId})`);
      this.deps.messaging.sendGameState(sender);
      this.acknowledge(sender, requestId);
      return;
    }

    state.processedCommands.mark(seat, requestId, now);
    const refusalsBefore = this.refusalCount;
    let applied = false;
    try {
      routeCommand(this.deps.context(), command, sender);
      applied = this.refusalCount === refusalsBefore;
    } finally {
      // A refused command did not happen (handlers refuse by throwing or with an ERROR): the
      // client may send it again once the reason is gone.
      if (!applied) state.processedCommands.unmark(seat, requestId);
    }
    if (applied) this.acknowledge(sender, requestId);
    // The log is written with the room: every command that changes the room saves it. Commands
    // that only broadcast (emotes, chat, timeout sounds) cost no storage write; after a crash the
    // worst a resend of one of them does is repeat it.
  }

  private join(command: JoinGameCommand, sender: Party.Connection): void {
    this.seatConnection(command, sender, (persistentId, options) =>
      handleJoinGame(this.deps.context(), command.playerName, persistentId, sender, options)
    );
  }

  /** A join with a ticket to check first: a tournament seat, or a character look. */
  private needsVerifiedJoin(command: JoinGameCommand): boolean {
    return this.deps.tournament.handlesJoin(command) || (command.appearanceTicket !== undefined && this.deps.characterTickets !== null);
  }

  /**
   * JOIN_GAME in a tournament room or with a ticket: tickets are verified asynchronously, so the
   * socket's later frames wait (a reconnecting client flushes its queued moves right behind
   * JOIN_GAME, and they must not run before the socket holds its seat). The join itself then runs
   * as its own transaction, and the held frames are handled in order.
   */
  private holdForVerifiedJoin(command: JoinGameCommand, sender: Party.Connection): void {
    this.deps.state.heldMessages.set(sender.id, []);
    void this.joinVerified(command, sender);
  }

  private async joinVerified(command: JoinGameCommand, sender: Party.Connection): Promise<void> {
    const { state, tournament, gate, characterTickets } = this.deps;
    let held: string[] = [];
    try {
      const [admission, look] = await Promise.all([
        tournament.handlesJoin(command) ? tournament.admit(command) : null,
        characterTickets && command.appearanceTicket !== undefined ? characterTickets.verify(command.appearanceTicket, Date.now()) : null,
      ]);
      // The socket may have closed while the tickets were checked.
      if (state.activeConnections.has(sender.id)) {
        gate.run(() => this.asCommand(command, sender, () =>
          this.seatConnection(command, sender, (persistentId, options) => {
            // A look only fits the seat its ticket names: the match seat, or the name joined under.
            if (!admission) {
              handleJoinGame(this.deps.context(), command.playerName, persistentId, sender, { ...options, appearance: verifiedLook(look, command.playerName) });
              return;
            }
            const seatName = admission.ok ? admission.claims.name : undefined;
            tournament.join(admission, persistentId, sender, { ...options, appearance: verifiedLook(look, seatName) });
          })
        ));
      }
    } finally {
      held = state.heldMessages.get(sender.id) ?? [];
      state.heldMessages.delete(sender.id);
    }
    for (const message of held) {
      if (!state.activeConnections.has(sender.id)) return;
      this.onMessage(message, sender);
    }
  }

  /** While a socket's tournament join is being verified, its frames wait (bounded). */
  private holdWhileJoining(message: string, sender: Party.Connection): boolean {
    const held = this.deps.state.heldMessages.get(sender.id);
    if (!held) return false;
    if (held.length < TOURNAMENT_ROOM_LIMITS.MAX_HELD_MESSAGES_PER_JOIN) held.push(message);
    else console.warn(JSON.stringify({ level: 'warn', msg: 'tournament_join_message_dropped', roomId: this.deps.state.game.id, connId: sender.id }));
    return true;
  }

  /**
   * The part of every join around the seat itself: the connection's protocol (known before the
   * join runs, so the snapshot it sends already has this connection's format), the session
   * telemetry, and the shared sounds a joining protocol-2 client gets once.
   */
  private seatConnection(command: JoinGameCommand, sender: Party.Connection, seat: SeatJoin): void {
    const { state } = this.deps;
    const persistentId = command.persistentId ?? sender.id;
    const protocolVersion = command.protocolVersion ?? LEGACY_PROTOCOL_VERSION;
    const isReconnect = state.persistentIdToPlayerId.has(persistentId);
    const previousPlayerId = state.playerOf(sender.id);
    const attestedPlayerId = this.deps.attestSeat(sender.id);

    state.connectionProtocols.set(sender.id, protocolVersion);
    seat(persistentId, {
      roomSettings: command.roomSettings,
      sessionToken: command.sessionToken,
      protocolVersion,
      ...(attestedPlayerId ? { attestedPlayerId } : {}),
    });
    this.recordSessionStart(sender, previousPlayerId, isReconnect);

    // Shared sounds travel in their own message; a joining client gets the current set once.
    if (!isLegacyProtocol(protocolVersion) && state.connectionToPlayer.has(sender.id)) {
      this.deps.messaging.sendSharedSounds(sender);
    }
  }

  /**
   * A joined connection gets its snapshot. A connection whose join failed has no state; it is
   * answered with PONG so its liveness check does not reconnect it in a loop.
   */
  private answerStateRequest(sender: Party.Connection, requestId: string | undefined): void {
    if (!this.deps.state.connectionToPlayer.has(sender.id)) {
      this.sendPong(sender, requestId);
      return;
    }
    this.deps.messaging.sendGameState(sender);
  }

  /**
   * Tells a protocol-2 client its command was applied, after the messages the command caused (so
   * its snapshot is already there). The client stops resending it; older clients get nothing new.
   */
  private acknowledge(sender: Party.Connection, requestId: string): void {
    if (isLegacyProtocol(this.deps.messaging.protocolOf(sender.id))) return;
    const ack: CommandAckEvent = {
      type: GameEventType.COMMAND_ACK,
      requestId,
      stateVersion: this.deps.state.stateVersion,
      timestamp: Date.now(),
    };
    this.deps.messaging.sendToConnection(sender, ack);
  }

  private sendPong(sender: Party.Connection, requestId: string | undefined): void {
    const pong: PongEvent = { type: GameEventType.PONG, ...(requestId ? { requestId } : {}), timestamp: Date.now() };
    this.deps.messaging.sendToConnection(sender, pong);
  }

  private logCommandReceived(command: ClientCommand, sender: Party.Connection): void {
    const { game } = this.deps.state;
    console.log(JSON.stringify({
      level: 'info',
      msg: 'game_command_received',
      roomId: game.id,
      connId: sender.id,
      playerId: this.deps.state.playerOf(sender.id),
      commandType: command.type,
      requestId: command.requestId,
      phase: game.phase,
      paused: game.isPaused(),
      currentRound: game.currentRound,
      currentPlayerId: game.players[game.currentPlayerIndex]?.id,
      serverReceivedAt: Date.now(),
    }));
  }

  /** Error path for handlers: the client sees `message`, telemetry records `error` when given. */
  sendError(conn: Party.Connection, message: string, code?: string, error?: unknown): void {
    const rejection: CommandRejection = error === undefined
      ? { errorCode: code ?? null, errorName: 'ServerError', message }
      : rejectionFromError(error);
    this.rejectCommand(conn, rejection, { message, code });
  }

  /**
   * The single path for every refused or failed command: records exactly one `command.rejected`
   * under the active cause, then tells the client (correlated by requestId) unless it is silent.
   */
  private rejectCommand(conn: Party.Connection, rejection: CommandRejection, notice: ClientErrorNotice | null): void {
    this.refusalCount += 1;
    this.deps.telemetry.record(commandRejectedFact(this.activeCommand, rejection, notice !== null), this.deps.state.game);
    if (!notice) return;
    const requestId = this.activeCommand?.requestId;
    const event: ErrorEvent = {
      type: GameEventType.ERROR,
      message: notice.message,
      ...(notice.code ? { code: notice.code } : {}),
      ...(typeof requestId === 'string' ? { requestId } : {}),
      timestamp: Date.now(),
    };
    this.deps.messaging.sendToConnection(conn, event);
  }

  /** Records `session.started` when a JOIN_GAME bound this connection to a (different) player. */
  private recordSessionStart(conn: Party.Connection, previousPlayerId: string | undefined, isReconnect: boolean): void {
    const playerId = this.deps.state.playerOf(conn.id);
    if (!playerId || playerId === previousPlayerId) return;

    const { connections } = this.deps;
    const session = connections.attachPlayer(conn.id, playerId) ??
      connections.open(conn.id, UNKNOWN_CLIENT_INFO, Date.now());
    session.playerId = playerId;
    this.deps.telemetry.record(sessionStartedFact(session, playerId, isReconnect), this.deps.state.game);
  }
}
