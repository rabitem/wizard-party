/**
 * Level 4: several players' real game clients against the real GameRoom in one process. Each
 * client is the production composition (player-client.ts) on a LoopbackSocket; the room is a
 * seeded RoomHarness; between them runs a shaped network (network.ts). Vitest fake timers drive
 * the room, the clients and the network alike, so reconnect backoff, liveness probes, bot pacing
 * and the room's alarms all run on one clock. See test/integration/README.md.
 */
import { vi } from 'vitest';
import type { IRoomSettings } from '@shared/domain';
import { LoopbackSocket } from '@/infrastructure/sandbox/loopback-socket';
import { createSeededRandom, hashSeed } from '@/infrastructure/sandbox/seeded-random';
import type { GameSocket, GameSocketOptions } from '@/presentation/hooks/connection/game-socket';
import { ROOM_TIMING } from '../../../party/config/room-timing.config';
import type { GameRoom } from '../../../party/room/game-room';
import type { ConnectionCloseInfo } from '../../../party/telemetry';
import { HARNESS_START_TIME, RoomHarness, type RoomHarnessOptions, type TestConnection } from '../../../party/test-support/room-harness';
import { PERSISTED_STATE_KEY, type StoredState } from '../../../party/utils/types';
import { createBrowserProfile, type BrowserProfile } from './browser-profile';
import { INSTANT_TABLE_TIMING, type InstantTableTiming } from './instant-table';
import { expectInvariants } from './invariants';
import { Network, type NetworkConditions, type NetworkLink } from './network';
import { PlayerClient, type ClientWire } from './player-client';

export const DEFAULT_ROOM_ID = 'it-room';
/** Longest a `settle` waits for the table to come to rest (fake time). */
const SETTLE_LIMIT_MS = 60_000;
const SETTLE_STEP_MS = 100;
/** Longest a `playUntil` plays (fake time). */
const PLAY_LIMIT_MS = 15 * 60_000;
/** Close codes of the transport (RFC 6455): a close the client made, a lost connection, none given. */
const CLIENT_CLOSED: ConnectionCloseInfo = { code: 1000, reason: 'client closed', wasClean: true };
const CONNECTION_LOST: ConnectionCloseInfo = { code: 1006, reason: 'connection lost', wasClean: false };
const NO_STATUS_CODE = 1005;

export interface FullStackTableOptions {
  /** Seeds the room's dealing and bots, the network jitter and the clients' reconnect jitter. */
  seed: number;
  roomId?: string;
  network?: Partial<NetworkConditions>;
  /** How long the stand-in 3D tables take to fly cards and show trick banners (0 by default). */
  tableTiming?: Partial<InstantTableTiming>;
  /** Tournament match mode: the worker's ticket verifier and result sink (the harness owns the alarm). */
  tournament?: RoomHarnessOptions['tournament'];
}

export interface SettleOptions {
  /** Fake time the table may take to come to rest before the scenario fails. */
  maxMs?: number;
  /** Check I1-I6 once at rest (on by default). */
  invariants?: boolean;
}

/** The open socket of a client: its path through the network and how the network loses it. */
interface OpenSocket {
  link: NetworkLink;
  lose(): void;
}

class SocketWire implements ClientWire {
  readonly connections: TestConnection[] = [];
  current: OpenSocket | null = null;

  drop(): void {
    this.current?.lose();
  }

  blackhole(): void {
    this.current?.link.blackhole();
  }
}

export class FullStackTable {
  readonly network: Network;
  private readonly clients: PlayerClient[] = [];
  private readonly tableTiming: InstantTableTiming;
  private profiles = 0;

  private constructor(
    private harness: RoomHarness,
    private readonly options: FullStackTableOptions,
    private readonly restoreConsole: () => void
  ) {
    this.network = new Network(options.seed, options.network);
    this.tableTiming = { ...INSTANT_TABLE_TIMING, ...options.tableTiming };
  }

  /** Installs fake timers at HARNESS_START_TIME and starts the room. */
  static async create(options: FullStackTableOptions): Promise<FullStackTable> {
    vi.useFakeTimers();
    vi.setSystemTime(HARNESS_START_TIME);
    // The room logs every broadcast and the clients warn on every reconnect; errors stay visible.
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const restoreConsole = () => {
      log.mockRestore();
      warn.mockRestore();
    };
    const harness = await RoomHarness.create({
      seed: options.seed,
      roomId: options.roomId ?? DEFAULT_ROOM_ID,
      tournament: options.tournament,
    });
    return new FullStackTable(harness, options, restoreConsole);
  }

  get roomId(): string {
    return this.options.roomId ?? DEFAULT_ROOM_ID;
  }

  /** The room (read its `game`; never drive it from a scenario). */
  get server(): GameRoom {
    return this.harness.server;
  }

  /** The room harness of the current room instance (its storage, its alarm). */
  get room(): RoomHarness {
    return this.harness;
  }

  get players(): readonly PlayerClient[] {
    return this.clients;
  }

  /** A new browser (another device, or a private window). */
  browser(label?: string): BrowserProfile {
    this.profiles += 1;
    return createBrowserProfile(this.profiles, label);
  }

  /** A new tab of `profile` with the game client of a player called `name`. */
  open(profile: BrowserProfile, name: string): PlayerClient {
    const wire = new SocketWire();
    const client = new PlayerClient(name, profile, {
      roomId: this.roomId,
      socketFactory: (socketOptions) => this.openSocket(wire, socketOptions),
      wire,
      random: createSeededRandom(hashSeed('client', this.options.seed, this.clients.length)),
      tableTiming: this.tableTiming,
      settle: () => this.settle(),
    });
    this.clients.push(client);
    return client;
  }

  /** Lets `ms` of fake time pass (room timers and alarms, network, clients). */
  async advance(ms: number): Promise<void> {
    await this.harness.advance(ms);
  }

  /**
   * Runs the table until it is at rest: no frame in flight, no bot turn scheduled, and every
   * client connected (or given up), with no undecided play and its trick presentation idle. Then
   * checks I1-I6. Waiting on a human's decision, a round end or a paused table counts as at rest.
   */
  async settle({ maxMs = SETTLE_LIMIT_MS, invariants = true }: SettleOptions = {}): Promise<void> {
    const deadline = Date.now() + maxMs;
    await vi.advanceTimersByTimeAsync(0);
    await this.harness.advance(0);
    for (let busy = this.busyReasons(); busy.length > 0; busy = this.busyReasons()) {
      if (Date.now() >= deadline) throw new Error(`the table did not come to rest within ${maxMs} ms: ${busy.join('; ')}`);
      await this.harness.advance(SETTLE_STEP_MS);
    }
    if (invariants) this.checkInvariants();
  }

  /** Every human plays the simplest move their screen offers, bots play themselves, until `done`. */
  async playUntil(done: () => boolean, maxMs = PLAY_LIMIT_MS): Promise<void> {
    const deadline = Date.now() + maxMs;
    await this.settle();
    while (!done()) {
      if (Date.now() >= deadline) throw new Error(`not done after ${maxMs} ms of play (room in ${this.server.game.phase})`);
      if (!this.moveSomeone()) await this.harness.advance(ROOM_TIMING.BOT_ACTION_DELAY_MS);
      await this.settle();
    }
  }

  /**
   * The room is evicted and starts again from its storage; its sockets close with 1012 and the
   * clients reconnect by themselves.
   */
  async restartRoom(): Promise<void> {
    this.harness = await this.harness.restart();
  }

  checkInvariants(): void {
    expectInvariants({ game: this.harness.server.game, roomSettings: this.savedRoomSettings() }, this.clients);
  }

  /**
   * The room settings the room last saved, null before its first save. The room saves before it
   * sends (commit gate), so these are the settings of the last table it sent.
   */
  private savedRoomSettings(): IRoomSettings | null {
    const saved = this.harness.storage.data.get(PERSISTED_STATE_KEY) as StoredState | undefined;
    return saved?.roomSettings ?? null;
  }

  dispose(): void {
    for (const client of this.clients) client.dispose();
    this.harness.dispose();
    this.restoreConsole();
    vi.useRealTimers();
  }

  private moveSomeone(): boolean {
    for (const client of this.clients) {
      if (!client.isClosed && client.autoMove()) return true;
    }
    return false;
  }

  private busyReasons(): string[] {
    const reasons: string[] = [];
    if (this.network.pending > 0) reasons.push(`${this.network.pending} frames in flight`);
    if (this.harness.server.isBotTurnScheduled) reasons.push('a bot turn is scheduled');
    for (const client of this.clients) {
      const unsettled = client.unsettledBy();
      if (unsettled.length > 0) reasons.push(`${client.name} is not at rest (${client.state.status}: ${unsettled.join(', ')})`);
    }
    return reasons;
  }

  /**
   * A client's new socket: it joins the room's connections when it opens, its frames and its close
   * travel the network, and it reaches whichever room instance is current when it opens.
   */
  private openSocket(wire: SocketWire, { room }: GameSocketOptions): GameSocket {
    if (room !== this.roomId) throw new Error(`this table hosts room ${this.roomId}, not ${room}`);
    const link = this.network.link();
    let host: RoomHarness | null = null;
    let connection: TestConnection | null = null;
    let closeInfo = CLIENT_CLOSED;
    // Frames reach the room instance the socket opened on, while that one is still running.
    const toRoom = (deliver: (harness: RoomHarness, open: TestConnection) => void) => link.toServer(() => {
      if (host && connection && host === this.harness && host.room.connections.has(connection.id)) deliver(host, connection);
    });
    const socket = new LoopbackSocket({
      onClientMessage: (_source, message) => toRoom((harness, open) => harness.send(open, message)),
      onClientClose: () => toRoom((harness, open) => harness.drop(open, closeInfo)),
    });
    const events: GameSocket = socket;
    events.addEventListener('open', () => {
      host = this.harness;
      connection = host.connect({
        forward: (raw) => link.toClient(() => socket.deliver(raw)),
        onServerClose: (code, reason) => {
          closeInfo = { code, reason, wasClean: true };
          link.toClient(() => socket.closeFromServer(code ?? NO_STATUS_CODE, reason ?? ''));
        },
      });
      wire.connections.push(connection);
    });
    wire.current = {
      link,
      lose: () => {
        closeInfo = CONNECTION_LOST;
        socket.drop();
      },
    };
    if (this.network.takeConnectFailure()) socket.failToConnect();
    return socket;
  }
}
