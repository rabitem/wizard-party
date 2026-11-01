import {
  ClientCommandType,
  GameEventType,
  LEGACY_PROTOCOL_VERSION,
  isLegacyProtocol,
} from '@shared/domain';
import { CLIENT_VERSION_QUERY_PARAM } from '@shared/telemetry';
import { CONNECTION_TIMING } from '@/presentation/config/connection.config';
import { socketCloseInfo, type ServerMessage } from '@/lib/client-telemetry';
import type { GameTraceEvent } from '@/lib/game-trace';
import type { ConnectionStatus } from '@/presentation/types';

import { CommandOutbox, type CommandOutcome } from './command-outbox';
import { CLIENT_CLOSE_REASON } from './connection-telemetry';
import { ConnectionLiveness } from './connection-liveness';
import {
  SILENT_SESSION_LISTENER,
  type ConnectParams,
  type GameSessionDeps,
  type GameSessionListener,
  type SessionError,
} from './game-session.types';
import { ReconnectPolicy } from './reconnect-policy';
import { commandTrace, errorOf, eventTrace, parseWireEvent, type WireEvent } from './session-trace';
import { SnapshotOrder } from './snapshot-order';
import { classifySocketClose } from './socket-close';
import { joinGameFrame } from './socket-command';
import { SocketLine } from './socket-line';

export type { ConnectParams, GameSessionListener } from './game-session.types';

/** Messages the session answers itself; the client state never sees them. */
const PROTOCOL_EVENTS: ReadonlySet<string> = new Set([GameEventType.SESSION, GameEventType.PONG, GameEventType.COMMAND_ACK]);

const LIVE_STATUSES: ReadonlySet<ConnectionStatus> = new Set<ConnectionStatus>(['connecting', 'connected', 'reconnecting']);

/**
 * One player's realtime connection to one room, independent of React: the socket and its
 * replacements (SocketLine), reconnect backoff, zombie detection, the command outbox, the seat
 * token and the protocol version. Every handler is a method of this long-lived object, so nothing
 * reads state through a closure captured when a socket was opened.
 */
export class GameSession {
  private listener: GameSessionListener = SILENT_SESSION_LISTENER;
  private params: ConnectParams | null = null;
  private statusValue: ConnectionStatus = 'idle';
  private lastMessageAt = 0;
  private playerId: string | null = null;
  private serverProtocol = LEGACY_PROTOCOL_VERSION;
  private suspended = false;
  private readonly line: SocketLine;
  private readonly snapshotOrder = new SnapshotOrder();
  private readonly outbox: CommandOutbox;
  private readonly policy: ReconnectPolicy;
  private readonly liveness: ConnectionLiveness;

  constructor(private readonly deps: GameSessionDeps) {
    this.outbox = new CommandOutbox();
    this.policy = new ReconnectPolicy({ random: deps.random });
    this.line = new SocketLine(deps.socketFactory, {
      onOpen: () => this.handleOpen(),
      onMessage: (data) => this.handleMessage(data),
      onClose: (event) => this.handleClose(event),
      onConnectTimeout: () => this.handleConnectTimeout(),
    });
    this.liveness = new ConnectionLiveness({
      now: Date.now,
      isOpen: () => this.line.isOpen,
      lastMessageAt: () => this.lastMessageAt,
      sendProbe: () => this.sendProbe(),
      onDead: () => this.replaceDeadSocket(),
    });
  }

  get status(): ConnectionStatus {
    return this.statusValue;
  }

  get roomId(): string | null {
    return this.params?.roomId ?? null;
  }

  setListener(listener: GameSessionListener | null): void {
    this.listener = listener ?? SILENT_SESSION_LISTENER;
  }

  /** Opens (or re-opens) the connection to a room on purpose. */
  connect(params: ConnectParams): void {
    const previous = this.params;
    const sameRoom = !!previous && previous.host === params.host && previous.roomId === params.roomId;
    if (previous && !sameRoom) {
      this.outbox.clear();
      this.listener.onRoomChanged();
    }
    this.params = params;
    this.suspended = false;
    // A connect for the socket that is already being opened is a duplicate.
    if (sameRoom && this.line.hasSocket && !this.line.isOpen && this.statusValue === 'connecting') return;
    this.policy.reset();
    this.setStatus('connecting');
    this.open(previous?.roomId ?? null);
  }

  /** Takes the seat back after it was opened elsewhere (superseded), or retries a failed line. */
  takeOver(): void {
    if (this.params) this.connect(this.params);
  }

  /**
   * The network came back or the page is shown again: a dropped connection retries now instead of
   * waiting out its backoff; an open one is probed (it may have died silently meanwhile).
   */
  wake(): void {
    if (this.statusValue === 'reconnecting' || this.statusValue === 'failed') {
      if (!this.policy.retryNow() && this.params && !this.line.hasSocket) this.open(this.params.roomId);
      return;
    }
    this.liveness.check(true);
  }

  /** Periodic check: probes a quiet line and drops commands nothing will settle any more. */
  checkLiveness(): void {
    this.liveness.check();
    for (const entry of this.outbox.expire(this.line.generation)) this.listener.onCommandSettled(entry, 'expired');
  }

  /** Sends a command now, or keeps it until a line can carry it. Returns its requestId. */
  send(command: { type: string } & Record<string, unknown>): string {
    const { entry, evicted } = this.outbox.add(command);
    // A full outbox drops its oldest commands: settle them, or a dropped play would stay pending.
    for (const dropped of evicted) this.listener.onCommandSettled(dropped, 'expired');
    this.trace(commandTrace(entry.command, {
      roomId: this.roomId ?? undefined,
      playerId: this.playerId,
      socketReadyState: this.line.readyState,
      outboxSize: this.outbox.size,
    }));
    this.flush();
    return entry.requestId;
  }

  /** Closes the connection on purpose and keeps the seat for a later rejoin. */
  disconnect(): void {
    this.close(CLIENT_CLOSE_REASON.DISCONNECT, 'idle');
  }

  /** Leaves the room for good (the seat goes to a bot in a running game). */
  leave(): void {
    this.line.send({ type: ClientCommandType.LEAVE_GAME });
    this.close(CLIENT_CLOSE_REASON.LEAVE_GAME, 'idle');
  }

  /** The host removed this player: stay down, forget the seat. */
  kicked(): void {
    const roomId = this.roomId;
    this.close(CLIENT_CLOSE_REASON.DISCONNECT, 'kicked');
    if (roomId) this.deps.seatTokens.forget(roomId);
  }

  /** The server refused this seat for good (another session's seat, a refused tournament seat). */
  refused(): void {
    this.close(CLIENT_CLOSE_REASON.DISCONNECT, 'rejected');
  }

  /** The page is unloading: close at once. */
  unload(): void {
    this.suspend();
  }

  /** The owner unmounted (or React's strict mode simulates it): drop the socket, keep the room. */
  suspend(): void {
    this.suspended = true;
    this.policy.cancel();
    this.liveness.reset();
    this.line.retire();
  }

  /** The owner mounted again: a connection that suspend() interrupted is restored. */
  resume(): void {
    if (!this.suspended) return;
    this.suspended = false;
    if (!this.params || !LIVE_STATUSES.has(this.statusValue)) return;
    this.setStatus(this.statusValue === 'connecting' ? 'connecting' : 'reconnecting');
    this.open(this.params.roomId);
  }

  private close(reason: string, status: ConnectionStatus): void {
    this.policy.reset();
    this.liveness.reset();
    for (const entry of this.outbox.clear()) this.listener.onCommandSettled(entry, 'expired');
    if (this.line.retire()) this.deps.telemetry.left(reason);
    this.setStatus(status);
  }

  private open(previousRoomId: string | null): void {
    const params = this.params;
    if (!params) return;
    if (this.line.retire()) this.deps.telemetry.replaced(previousRoomId, params.roomId);
    this.snapshotOrder.reset();
    // Until this socket's SESSION arrives, assume a server that only knows the legacy protocol.
    this.serverProtocol = LEGACY_PROTOCOL_VERSION;
    this.deps.telemetry.connecting(params.roomId);
    try {
      this.line.open({
        host: params.host,
        room: params.roomId,
        // Build id only (no personal data); lets server telemetry attribute connections to a release.
        query: { [CLIENT_VERSION_QUERY_PARAM]: this.deps.appVersion() },
        connectTimeoutMs: CONNECTION_TIMING.CONNECT_TIMEOUT_MS,
      });
    } catch (error) {
      console.warn('[Connection] Could not create the socket', error);
      this.deps.telemetry.connectFailed();
      this.listener.onNotice('Failed to create connection');
      this.scheduleReconnect();
    }
  }

  private handleOpen(): void {
    const params = this.params;
    if (!params) return;
    this.deps.telemetry.opened(params.roomId);
    this.lastMessageAt = Date.now();
    this.liveness.reset();
    this.setStatus('connected');
    this.line.sendRaw(joinGameFrame(params, {
      persistentId: this.deps.persistentId(),
      sessionToken: this.deps.seatTokens.load(params.roomId),
      extraFields: this.listener.joinFields(params.roomId),
    }));
    // The server handles a connection's frames in order: commands kept for a resend follow the join.
    this.flush();
  }

  private handleMessage(data: unknown): void {
    const receivedAt = Date.now();
    this.lastMessageAt = receivedAt;
    this.liveness.messageReceived();

    const event = parseWireEvent(data);
    if (event) {
      this.deps.telemetry.messageReceived(event as ServerMessage);
      const lagMs = typeof event.timestamp === 'number' ? receivedAt - event.timestamp : undefined;
      this.trace(eventTrace(event, { roomId: this.roomId ?? undefined, playerId: this.playerId, lagMs, state: this.listener.currentState() }));
      if (this.consume(event)) this.listener.onEvent(event, { receivedAt, lagMs });
    }
    // Commands held back while the line was suspect go out now that it answered.
    this.flush();
  }

  /** Handles the protocol side of a message; false when it must not reach the client state. */
  private consume(event: WireEvent): boolean {
    switch (event.type) {
      case GameEventType.SESSION: {
        const roomId = this.roomId;
        if (roomId && typeof event.sessionToken === 'string') this.deps.seatTokens.save(roomId, event.sessionToken);
        if (typeof event.protocolVersion === 'number') this.serverProtocol = event.protocolVersion;
        if (typeof event.playerId === 'string') this.playerId = event.playerId;
        return false;
      }
      case GameEventType.COMMAND_ACK:
        if (typeof event.requestId === 'string') this.settle(event.requestId, 'acknowledged');
        return false;
      case GameEventType.GAME_STATE:
        // A snapshot older than the one applied would roll the table back.
        if (!this.snapshotOrder.accept(event.stateVersion)) return false;
        if (typeof event.yourPlayerId === 'string') this.playerId = event.yourPlayerId;
        // Only an answered join proves the line: a socket that opens and closes again keeps backing off.
        this.policy.confirmed();
        return true;
      case GameEventType.ERROR:
        this.settleRefusal(event);
        return true;
      default:
        return !PROTOCOL_EVENTS.has(event.type);
    }
  }

  /**
   * An ERROR settles the command it names. Servers before protocol 2 name none: their refusal
   * answers the frame they just handled, most likely the newest command sent on this socket.
   * Without this a refused card play would stay pending (and block the hand) until its TTL.
   */
  private settleRefusal(event: WireEvent): void {
    let requestId = typeof event.requestId === 'string' ? event.requestId : undefined;
    if (!requestId && isLegacyProtocol(this.serverProtocol)) requestId = this.outbox.newestSentOn(this.line.generation)?.requestId;
    if (requestId) this.settle(requestId, 'rejected', errorOf(event));
  }

  private settle(requestId: string, outcome: CommandOutcome, error?: SessionError): void {
    const entry = this.outbox.settle(requestId);
    if (entry) this.listener.onCommandSettled(entry, outcome, error);
  }

  private handleClose(event: CloseEvent): void {
    this.deps.telemetry.socketClosed(socketCloseInfo(event, false));
    this.liveness.reset();
    const kind = classifySocketClose(event);
    if (kind === 'kicked') {
      this.kicked();
    } else if (kind === 'superseded') {
      // The seat is live in another tab or device; reconnecting would take it back and forth.
      this.policy.reset();
      this.setStatus('superseded');
    } else {
      this.scheduleReconnect();
    }
  }

  private handleConnectTimeout(): void {
    console.warn('[Connection] The socket did not open in time; retrying');
    this.deps.telemetry.connectTimedOut();
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (!this.params || this.suspended) return;
    this.setStatus('reconnecting');
    const delay = this.policy.scheduleRetry(() => this.open(this.params?.roomId ?? null));
    if (delay === null) this.setStatus('failed');
  }

  /** The liveness probe went unanswered: the socket is a zombie. Replace it at once. */
  private replaceDeadSocket(): void {
    if (!this.params || this.suspended || this.statusValue !== 'connected') return;
    console.warn('[Connection] No answer from the server; reconnecting');
    this.setStatus('reconnecting');
    // open() retires the dead socket (its late close event is ignored) and rejoins the seat.
    this.open(this.params.roomId);
  }

  private sendProbe(): void {
    // PING is answered without a full snapshot, but only servers that announced protocol 2 know it.
    this.line.send({ type: isLegacyProtocol(this.serverProtocol) ? ClientCommandType.REQUEST_STATE : ClientCommandType.PING });
  }

  /** Sends what the current socket still owes, unless the line is suspect (then probes it first). */
  private flush(): void {
    if (!this.line.isOpen) return;
    if (this.liveness.isSuspect()) {
      // Quiet for a while: the socket may be a zombie. Hold the commands until a probe proves it.
      this.liveness.check(true);
      return;
    }
    const generation = this.line.generation;
    const { due, expired } = this.outbox.takeDue(generation);
    for (const entry of expired) this.listener.onCommandSettled(entry, 'expired');
    let sent = 0;
    for (const entry of due) {
      if (!this.line.send(entry.command)) break;
      this.outbox.markSent(entry.requestId, generation);
      this.deps.telemetry.commandSent(entry.requestId, entry.type);
      sent += 1;
    }
    if (sent > 0) this.liveness.commandSent();
  }

  private setStatus(status: ConnectionStatus): void {
    if (status === this.statusValue) return;
    this.statusValue = status;
    this.listener.onStatus(status);
  }

  private trace(event: GameTraceEvent): void {
    this.deps.trace?.(event);
  }
}
