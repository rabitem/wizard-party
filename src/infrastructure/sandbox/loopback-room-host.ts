import type * as Party from '../../../party/runtime';
import type { LoopbackSocket } from './loopback-socket';

/** A message the room sends to one loopback socket (the sandbox shapes and delivers it). */
export interface LoopbackDelivery {
  socket: LoopbackSocket;
  data: string;
}

export interface LoopbackRoomHooks {
  deliver(delivery: LoopbackDelivery): void;
  /** The room's durable alarm came due. */
  onAlarm(): void;
}

/** A loopback socket as the room sees it: sends go through the sandbox's network shaping. */
export class LoopbackConnection implements Party.Connection {
  constructor(
    readonly id: string,
    private readonly socket: LoopbackSocket,
    private readonly deliver: (delivery: LoopbackDelivery) => void
  ) {}

  send(message: string): void {
    this.deliver({ socket: this.socket, data: message });
  }

  close(code = 1000, reason = ''): void {
    this.socket.closeFromServer(code, reason);
  }
}

/** The room's storage in memory; the alarm is a timer on the sandbox clock. */
export class LoopbackStorage implements Party.RoomStorage {
  private readonly data = new Map<string, unknown>();
  private alarmTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly onAlarm: () => void) {}

  get<T>(key: string): Promise<T | undefined> {
    return Promise.resolve(this.data.get(key) as T | undefined);
  }

  put<T>(key: string, value: T): Promise<void> {
    this.data.set(key, value);
    return Promise.resolve();
  }

  setAlarm(scheduledTime: number): void {
    this.deleteAlarm();
    this.alarmTimer = setTimeout(() => {
      this.alarmTimer = null;
      this.onAlarm();
    }, Math.max(0, scheduledTime - Date.now()));
  }

  deleteAlarm(): void {
    if (this.alarmTimer !== null) clearTimeout(this.alarmTimer);
    this.alarmTimer = null;
  }
}

/**
 * The in-browser host of a GameRoom: the room's ports (connections, storage, alarm) over loopback
 * sockets and memory, the way the Cloudflare worker provides them over WebSockets and a Durable
 * Object.
 */
export class LoopbackRoomHost implements Party.Room {
  readonly storage: LoopbackStorage;
  private readonly connections = new Map<LoopbackSocket, LoopbackConnection>();

  constructor(readonly id: string, private readonly hooks: LoopbackRoomHooks) {
    this.storage = new LoopbackStorage(() => hooks.onAlarm());
  }

  /** A socket the sandbox client opened becomes one of the room's connections. */
  attach(socket: LoopbackSocket, id: string): Party.Connection {
    const connection = new LoopbackConnection(id, socket, (delivery) => this.hooks.deliver(delivery));
    this.connections.set(socket, connection);
    return connection;
  }

  /** The socket closed; its connection, so the room can be told. */
  detach(socket: LoopbackSocket): Party.Connection | undefined {
    const connection = this.connections.get(socket);
    this.connections.delete(socket);
    return connection;
  }

  connectionOf(socket: LoopbackSocket): Party.Connection | undefined {
    return this.connections.get(socket);
  }

  broadcast(message: string, without: string[] = []): void {
    for (const connection of this.connections.values()) {
      if (!without.includes(connection.id)) connection.send(message);
    }
  }

  getConnections(): Iterable<Party.Connection> {
    return Array.from(this.connections.values());
  }

  dispose(): void {
    this.storage.deleteAlarm();
    this.connections.clear();
  }
}
