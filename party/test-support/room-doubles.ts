/**
 * In-memory implementations of the room's ports (party/room/ports.ts) for RoomHarness: storage
 * that round-trips through JSON like a real store, recorded alarm channels and connections that
 * keep a wire log. Not part of the worker.
 */
import type * as Party from '../runtime';
import { GameEventType, type IGameState } from '../../shared/domain';
import type { AlarmChannel } from '../utils/alarm-multiplexer';

export interface WireMessage {
  type: string;
  [key: string]: unknown;
}

/**
 * One ordered log shared by storage and connections: `put` for every storage write and `send` for
 * every frame sent, so a test can assert what was committed before anything left the room.
 */
export type Timeline = string[];

export class MemoryStorage implements Party.RoomStorage {
  readonly data = new Map<string, unknown>();
  alarm: number | null = null;

  constructor(private readonly timeline: Timeline | null = null) {}

  get<T>(key: string): Promise<T | undefined> {
    const value = this.data.get(key);
    return Promise.resolve(value === undefined ? undefined : (JSON.parse(JSON.stringify(value)) as T));
  }

  put<T>(key: string, value: T): Promise<void> {
    this.timeline?.push('put');
    this.data.set(key, JSON.parse(JSON.stringify(value)));
    return Promise.resolve();
  }

  setAlarm(scheduledTime: number): void {
    this.alarm = scheduledTime;
  }

  deleteAlarm(): void {
    this.alarm = null;
  }
}

/** One channel of the worker's alarm multiplexer (the tournament controller's), recorded. */
export class MemoryAlarm implements AlarmChannel {
  at: number | null = null;

  setAlarm(scheduledTime: number): Promise<void> {
    this.at = scheduledTime;
    return Promise.resolve();
  }

  deleteAlarm(): Promise<void> {
    this.at = null;
    return Promise.resolve();
  }
}

/**
 * Where a bridged connection delivers to: a client socket on the other side. Without one a
 * connection only records.
 */
export interface ConnectionTransport {
  /** A frame the room sent, as raw text (only while the connection is open). */
  forward(raw: string): void;
  /** The connection ended: the room closed it, or the harness dropped it. Called once. */
  onServerClose(code?: number, reason?: string): void;
}

export class TestConnection implements Party.Connection {
  /** The wire log: every frame the room sent this connection. */
  readonly sent: { at: number; message: WireMessage }[] = [];
  closed: { code?: number; reason?: string } | null = null;

  constructor(
    readonly id: string,
    private readonly transport: ConnectionTransport | null = null,
    private readonly timeline: Timeline | null = null
  ) {}

  send(message: string): void {
    this.timeline?.push('send');
    this.sent.push({ at: Date.now(), message: JSON.parse(message) as WireMessage });
    if (this.closed === null) this.transport?.forward(message);
  }

  close(code?: number, reason?: string): void {
    const wasOpen = this.closed === null;
    this.closed = { code, reason };
    if (wasOpen) this.transport?.onServerClose(code, reason);
  }

  messages(): WireMessage[] {
    return this.sent.map((entry) => entry.message);
  }

  ofType(type: string): WireMessage[] {
    return this.messages().filter((message) => message.type === type);
  }

  /** When each message of a type arrived (fake-timer time). */
  timesOf(type: string): number[] {
    return this.sent.filter((entry) => entry.message.type === type).map((entry) => entry.at);
  }

  lastState(): IGameState | null {
    const message = this.ofType(GameEventType.GAME_STATE).at(-1);
    return message ? (message.state as IGameState) : null;
  }

  session(): { playerId: string; sessionToken: string } | null {
    const message = this.ofType(GameEventType.SESSION).at(-1);
    return message ? (message as unknown as { playerId: string; sessionToken: string }) : null;
  }

  clear(): void {
    this.sent.length = 0;
  }
}

export class TestRoom implements Party.Room {
  readonly connections = new Map<string, TestConnection>();

  constructor(readonly id: string, readonly storage: MemoryStorage) {}

  broadcast(message: string, without: string[] = []): void {
    for (const [id, connection] of this.connections) if (!without.includes(id)) connection.send(message);
  }

  getConnections(): Iterable<TestConnection> {
    return this.connections.values();
  }
}
