/**
 * Ports of the transport-agnostic game room (GameRoom). A host adapter implements them: the
 * Cloudflare worker (party/worker.ts), the in-browser sandbox loopback
 * (src/infrastructure/sandbox) and the test harness (party/test-support/room-harness.ts).
 */

/** A client connection as the room sees it (a WebSocket on Cloudflare, a loopback socket in the sandbox). */
export interface RoomConnection {
  readonly id: string;
  send(message: string): void;
  /** Ends the connection; adapters without a close (old runtimes) may leave it out. */
  close?(code?: number, reason?: string): void;
}

/** Storage operations the room needs; a narrow port over DurableObjectStorage. */
export interface RoomStorage {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
  /** The room's one durable alarm (survives eviction); the host calls GameRoom.onAlarm when it fires. */
  setAlarm(scheduledTime: number): Promise<void> | void;
  deleteAlarm(): Promise<void> | void;
}

/** The room as its host provides it: identity, storage and the connected sockets. */
export interface RoomHost {
  readonly id: string;
  readonly storage: RoomStorage;
  broadcast(message: string, without?: string[]): void;
  getConnections(): Iterable<RoomConnection>;
}

/** Opaque handle of a scheduled task. */
export type TimerHandle = unknown;

/**
 * In-memory timers for deadlines that need not survive an eviction (bot pacing, the disconnect
 * debounce). Durable deadlines go through RoomStorage's alarm instead.
 */
export interface RoomTimers {
  setTimeout(task: () => void, delayMs: number): TimerHandle;
  clearTimeout(handle: TimerHandle): void;
}

/**
 * The global timers, looked up on every call: a clock installed after the room was created
 * (the sandbox's virtual clock, vitest fake timers) still drives it.
 */
export const systemTimers: RoomTimers = {
  setTimeout: (task, delayMs) => globalThis.setTimeout(task, delayMs),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
};
