import type { RealtimeTelemetry, ServerMessage, SocketCloseInfo } from '@/lib/client-telemetry';

/** WebSocket "normal closure"; used for closes the client initiates itself. */
export const NORMAL_CLOSE_CODE = 1000;

export const CLIENT_CLOSE_REASON = {
  DISCONNECT: 'client_disconnect',
  LEAVE_GAME: 'leave_game',
  /** connect() replaced a socket of the same room (e.g. retry after a connect timeout). */
  RECONNECT: 'reconnect',
  /** connect() replaced a socket of another room. */
  ROOM_SWITCH: 'room_switch',
} as const;

export interface RoomContextSink {
  setRoomId(roomId: string | null): void;
}

type RealtimeSink = Pick<
  RealtimeTelemetry,
  'connecting' | 'opened' | 'closed' | 'connectTimedOut' | 'commandSent' | 'messageReceived'
>;

type SocketPhase = 'idle' | 'connecting' | 'open';

/**
 * Socket lifecycle -> client telemetry, for GameSession. Keeps the telemetry room context in
 * step with the socket that actually exists and reports every socket end exactly once, whichever
 * path ends it (server close, connect timeout, replacement by connect(), disconnect, leave).
 */
export class ConnectionTelemetry {
  private phase: SocketPhase = 'idle';

  constructor(
    private readonly realtime: RealtimeSink,
    private readonly context: RoomContextSink
  ) {}

  /** A new socket for `roomId` is being created (after any previous one was replaced). */
  connecting(roomId: string): void {
    this.context.setRoomId(roomId);
    this.realtime.connecting();
    this.phase = 'connecting';
  }

  /** Creating the socket threw; nothing is connected. */
  connectFailed(): void {
    this.phase = 'idle';
    this.context.setRoomId(null);
  }

  opened(roomId: string): void {
    this.context.setRoomId(roomId);
    this.realtime.opened();
    this.phase = 'open';
  }

  /** The connect timeout fired before `open`; the caller decides whether to retry. */
  connectTimedOut(): void {
    if (this.phase !== 'connecting') return;
    this.realtime.connectTimedOut();
    this.phase = 'idle';
    this.context.setRoomId(null);
  }

  /** connect() closes the current socket to open a new one. */
  replaced(previousRoomId: string | null, nextRoomId: string): void {
    const reason = previousRoomId === nextRoomId ? CLIENT_CLOSE_REASON.RECONNECT : CLIENT_CLOSE_REASON.ROOM_SWITCH;
    this.end({ code: NORMAL_CLOSE_CODE, reason, wasClean: true, intentional: true });
  }

  /** The current socket fired `close`. */
  socketClosed(info: SocketCloseInfo): void {
    this.end(info);
  }

  /** disconnect() / leaveGame(): the client closes the socket and leaves the room. */
  left(reason: string): void {
    this.end({ code: NORMAL_CLOSE_CODE, reason, wasClean: true, intentional: true });
    this.context.setRoomId(null);
  }

  commandSent(requestId: string, commandType: string): void {
    this.realtime.commandSent(requestId, commandType);
  }

  messageReceived(message: ServerMessage): void {
    this.realtime.messageReceived(message);
  }

  private end(info: SocketCloseInfo): void {
    if (this.phase === 'idle') return;
    this.realtime.closed(info);
    this.phase = 'idle';
  }
}
