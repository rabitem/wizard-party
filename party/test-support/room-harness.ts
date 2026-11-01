/**
 * A GameRoom with in-memory storage, connections and fake timers, for the server's integration
 * tests (multi-human tables, reconnects, restarts, scheduling invariants, tournament match rooms).
 * Not part of the worker.
 *
 * Time is driven by vitest fake timers: `advance` runs the in-memory timers (bot turns, disconnect
 * debounce) and fires the durable alarm and the tournament alarm channel whenever one comes due,
 * exactly like the worker's alarm multiplexer would. `restart` evicts the room and starts a new one
 * on the same storage. Math.random is seeded inside every room entry point (with `seed`, or
 * DEFAULT_SEED), so a table deals and its bots decide the same way on every run.
 */
import { vi } from 'vitest';
import {
  ClientCommandType,
  GameEventType,
  PROTOCOL_VERSION,
  type Game,
} from '../../shared/domain';
import type { ISessionCredentialFactory, IUseCaseRegistry } from '../../shared/application';
import { createSeededRandom, hashSeed, withSeededRandom } from '../../src/infrastructure/sandbox/seeded-random';
import type { ConnectionCloseInfo, GameTelemetry } from '../telemetry';
import type { TournamentMatchServices } from '../tournament';
import { GameRoom, type GameRoomOptions } from '../room/game-room';
import { systemTimers, type RoomTimers } from '../room/ports';
import {
  MemoryAlarm,
  MemoryStorage,
  TestConnection,
  TestRoom,
  type ConnectionTransport,
  type Timeline,
} from './room-doubles';

export {
  MemoryAlarm,
  MemoryStorage,
  TestConnection,
  TestRoom,
  type ConnectionTransport,
  type Timeline,
  type WireMessage,
} from './room-doubles';

export const HARNESS_START_TIME = 1_700_000_000_000;
/** The seed of a room created without one: no suite deals or plays differently from run to run. */
const DEFAULT_SEED = 1;
/** Upper bound of alarms one `advance` may fire, so a deadline that never moves fails fast. */
const MAX_ALARMS_PER_ADVANCE = 500;
/**
 * Time runs in slices of at most this, so an alarm a timer arms in the middle of a slice fires at
 * most this late; an alarm armed before the slice fires exactly on time.
 */
const ADVANCE_SLICE_MS = 50;
/** Microtask turns `fireAlarm` lets pass, so promise chains the alarm started (ticket checks, saves) settle. */
const FLUSH_TURNS = 20;
const CONNECTION_LOST: ConnectionCloseInfo = { code: 1006, reason: 'connection lost', wasClean: false };

/** The room's durable alarm, or the tournament controller's channel of the alarm multiplexer. */
export type HarnessAlarm = 'room' | 'tournament';

/** The seat the room last told a connection it plays, read off the wire (null before any GAME_STATE). */
export function seatToldTo(connection: TestConnection): string | null {
  const seat = connection.ofType(GameEventType.GAME_STATE).at(-1)?.yourPlayerId;
  return typeof seat === 'string' ? seat : null;
}

function sequentialCredentials(): ISessionCredentialFactory {
  let seats = 0;
  let tokens = 0;
  return {
    createSeatId: () => `p_seat${String(++seats).padStart(4, '0')}`,
    createSessionToken: () => `token${++tokens}`.padEnd(43, 'x'),
  };
}

function seededTimers(timers: RoomTimers, random: () => number): RoomTimers {
  return {
    setTimeout: (task, delayMs) => timers.setTimeout(() => withSeededRandom(random, task), delayMs),
    clearTimeout: (handle) => timers.clearTimeout(handle),
  };
}

/** A browser's reconnect id (`player-<created at>-<7 chars>`); the room checks only its shape. */
export function persistentIdOf(suffix: string, createdAt: number = HARNESS_START_TIME): string {
  return `player-${createdAt}-${suffix.padEnd(7, '0').slice(0, 7)}`;
}

export interface RoomHarnessOptions {
  roomId?: string;
  storage?: MemoryStorage;
  useCases?: IUseCaseRegistry;
  telemetry?: GameTelemetry;
  options?: GameRoomOptions;
  /**
   * Tournament match mode: ticket verification and the result sink. The harness provides the
   * controller's alarm channel (`tournamentAlarm`) and fires it like the multiplexer.
   */
  tournament?: Omit<TournamentMatchServices, 'alarm'>;
  /** Seeds Math.random inside send, connect, drop, both alarms and the room's timers (default DEFAULT_SEED). */
  seed?: number;
  /** Shared log of storage writes and sent frames (for storage the harness creates, and its connections). */
  timeline?: Timeline;
}

export interface JoinOptions {
  /** Absent: protocol 2 (opaque seat id and session token). */
  protocolVersion?: number | null;
  sessionToken?: string;
  roomSettings?: object;
}

/**
 * What outlives a restart in the harness because its production counterpart never repeats: seat
 * ids and tokens stay unique, and the room continues its random stream.
 */
interface HarnessContinuity {
  credentials: ISessionCredentialFactory;
  random: () => number;
}

export class RoomHarness {
  private connectionCount = 0;

  private constructor(
    readonly room: TestRoom,
    readonly server: GameRoom,
    /** The tournament controller's alarm channel (unused outside match mode). */
    readonly tournamentAlarm: MemoryAlarm,
    private readonly config: RoomHarnessOptions,
    private readonly continuity: HarnessContinuity
  ) {}

  /** Starts a room (fake timers must already be installed). */
  static async create(config: RoomHarnessOptions = {}): Promise<RoomHarness> {
    return RoomHarness.start(config, {
      credentials: sequentialCredentials(),
      random: createSeededRandom(hashSeed('room', config.seed ?? DEFAULT_SEED)),
    });
  }

  private static async start(config: RoomHarnessOptions, continuity: HarnessContinuity): Promise<RoomHarness> {
    const storage = config.storage ?? new MemoryStorage(config.timeline ?? null);
    const room = new TestRoom(config.roomId ?? 'harness-room', storage);
    const tournamentAlarm = new MemoryAlarm();
    const { random } = continuity;
    const server = new GameRoom(room, config.useCases, config.telemetry, {
      sessionCredentials: continuity.credentials,
      ...config.options,
      timers: seededTimers(config.options?.timers ?? systemTimers, random),
      ...(config.tournament ? { tournament: { ...config.tournament, alarm: tournamentAlarm } } : {}),
    });
    const harness = new RoomHarness(room, server, tournamentAlarm, { ...config, storage }, continuity);
    await harness.scoped(() => server.onStart());
    return harness;
  }

  get game(): Game {
    return this.server.game;
  }

  get storage(): MemoryStorage {
    return this.room.storage;
  }

  /** A new socket; with a transport it also delivers to a client socket. */
  connect(transport: ConnectionTransport | null = null): TestConnection {
    const connection = new TestConnection(`conn-${++this.connectionCount}`, transport, this.config.timeline ?? null);
    this.room.connections.set(connection.id, connection);
    this.scoped(() => this.server.onConnect(connection));
    return connection;
  }

  /** A client frame: a command object, or raw text exactly as a client socket sent it. */
  send(connection: TestConnection, command: Record<string, unknown> | string): void {
    const frame = typeof command === 'string' ? command : JSON.stringify(command);
    this.scoped(() => this.server.onMessage(frame, connection));
  }

  /** A new socket that joins as `name` (protocol 2 unless told otherwise). */
  join(name: string, suffix: string, options: JoinOptions = {}): TestConnection {
    const connection = this.connect();
    this.rejoin(connection, name, suffix, options);
    return connection;
  }

  rejoin(connection: TestConnection, name: string, suffix: string, options: JoinOptions = {}): void {
    const protocolVersion = options.protocolVersion === undefined ? PROTOCOL_VERSION : options.protocolVersion;
    this.send(connection, {
      type: ClientCommandType.JOIN_GAME,
      playerName: name,
      persistentId: persistentIdOf(suffix),
      ...(protocolVersion === null ? {} : { protocolVersion }),
      ...(options.sessionToken ? { sessionToken: options.sessionToken } : {}),
      ...(options.roomSettings ? { roomSettings: options.roomSettings } : {}),
    });
  }

  /** The socket closes; by default without a goodbye (network loss, closed tab). */
  drop(connection: TestConnection, close: ConnectionCloseInfo = CONNECTION_LOST): void {
    this.room.connections.delete(connection.id);
    connection.close(close.code, close.reason);
    this.scoped(() => this.server.onClose(connection, close));
  }

  /** The seat id the room last told this connection it plays (the `yourPlayerId` of its last GAME_STATE). */
  seatOf(connection: TestConnection): string {
    const seat = seatToldTo(connection);
    if (!seat) throw new Error(`${connection.id} was never told a seat`);
    return seat;
  }

  /**
   * Lets `ms` pass: in-memory timers run (pending promises settle between them), and each alarm
   * fires whenever it comes due (the platform clears it before calling the room).
   */
  async advance(ms: number): Promise<void> {
    const target = Date.now() + Math.max(0, ms);
    let fired = 0;
    for (;;) {
      const due = this.dueAlarm();
      if (due) {
        if (++fired > MAX_ALARMS_PER_ADVANCE) throw new Error(`the ${due} alarm keeps firing at ${this.alarmAt(due)}`);
        await this.ring(due);
        continue;
      }
      if (Date.now() >= target) break;
      const next = Math.min(this.alarmAt('room') ?? Number.POSITIVE_INFINITY, this.alarmAt('tournament') ?? Number.POSITIVE_INFINITY);
      const stop = Math.min(target, next, Date.now() + ADVANCE_SLICE_MS);
      await vi.advanceTimersByTimeAsync(stop - Date.now());
    }
    await Promise.resolve();
  }

  /**
   * Fires one alarm now, as if its time had come: the clock jumps to its deadline without running
   * the in-memory timers on the way (for suites that step time by hand), then pending promises settle.
   */
  async fireAlarm(alarm: HarnessAlarm): Promise<void> {
    const at = this.alarmAt(alarm);
    if (at === null) throw new Error(`no ${alarm} alarm armed`);
    vi.setSystemTime(Math.max(at, Date.now()));
    await this.ring(alarm);
    for (let turn = 0; turn < FLUSH_TURNS; turn++) await Promise.resolve();
  }

  /**
   * Evicts the room (every socket and timer is gone) and starts a new one on the same storage.
   * `overrides` stand for what a new worker instance brings along (fresh tournament services).
   */
  async restart(overrides: Pick<RoomHarnessOptions, 'tournament' | 'useCases'> = {}): Promise<RoomHarness> {
    this.server.dispose();
    for (const connection of this.room.connections.values()) connection.close(1012, 'restart');
    return RoomHarness.start({ ...this.config, ...overrides, storage: this.storage }, this.continuity);
  }

  dispose(): void {
    this.server.dispose();
  }

  private alarmAt(alarm: HarnessAlarm): number | null {
    return alarm === 'room' ? this.storage.alarm : this.tournamentAlarm.at;
  }

  private dueAlarm(): HarnessAlarm | null {
    const now = Date.now();
    const room = this.alarmAt('room');
    if (room !== null && room <= now) return 'room';
    const tournament = this.alarmAt('tournament');
    return tournament !== null && tournament <= now ? 'tournament' : null;
  }

  private async ring(alarm: HarnessAlarm): Promise<void> {
    if (alarm === 'room') {
      this.storage.alarm = null;
      await this.scoped(() => this.server.onAlarm());
    } else {
      this.tournamentAlarm.at = null;
      await this.scoped(() => this.server.onTournamentAlarm());
    }
  }

  private scoped<T>(entry: () => T): T {
    return withSeededRandom(this.continuity.random, entry);
  }
}
