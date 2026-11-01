import { ClientCommandType, type Game } from '@shared/domain';
import type { GameSocketFactory } from '@/presentation/hooks/connection/game-socket';
import type {
  SandboxBotPacing,
  SandboxNetworkConditions,
  SandboxServer,
  SandboxServerOptions,
  ServerTraceEntry,
} from '@/presentation/components/sandbox/sandbox.types';
// The sandbox runs the production room itself, not a re-implementation of it.
import { GameRoom } from '../../../party/room/game-room';
import { ROOM_TIMING } from '../../../party/config/room-timing.config';
import { LoopbackSocket } from './loopback-socket';
import { LoopbackRoomHost, type LoopbackDelivery } from './loopback-room-host';
import { createSeededRandom, hashSeed, withSeededRandom } from './seeded-random';
import {
  SANDBOX_LOCAL_PLAYER_ID,
  SANDBOX_LOCAL_PLAYER_NAME,
  createSandboxGame,
} from './sandbox-table-setup';

/** The production pause before a bot moves. */
const SERVER_BOT_ACTION_DELAY_MS = ROOM_TIMING.BOT_ACTION_DELAY_MS;

type ClientMessage = { type?: unknown; [key: string]: unknown };

function parse(raw: string): ClientMessage | null {
  try {
    const message = JSON.parse(raw) as unknown;
    return message && typeof message === 'object' ? (message as ClientMessage) : null;
  } catch {
    return null;
  }
}

/**
 * The real game room (party/room/game-room.ts) hosted in the browser: the same command pipeline,
 * handlers, bot scheduler, pause and reconnect handling, alarms and event order as production.
 * Only the transport is simulated (LoopbackRoomHost): latency, jitter and stalls on the way to
 * the client, and sockets that drop or are closed by the server.
 *
 * The sandbox deals its own table (createSandboxGame) and hands it to the room. Its one local
 * player is the seat every loopback socket joins: the host vouches for it (like a tournament
 * ticket), so the client's stored name or ids never matter. Bots wait for that first join.
 */
export class LoopbackGameServer implements SandboxServer {
  readonly localPlayerId = SANDBOX_LOCAL_PLAYER_ID;

  private readonly random: () => number;
  private readonly host: LoopbackRoomHost;
  private readonly room: GameRoom;
  /** Every join speaks for the local seat with this browser id (valid for a year from now). */
  private readonly persistentId = `player-${Date.now()}-sandbox`;
  private network: SandboxNetworkConditions;
  private bots: SandboxBotPacing;
  private botsReleased = false;
  private current: LoopbackSocket | null = null;
  private socketCount = 0;
  private lastDeliveryAt = 0;
  private pendingDeliveries = 0;
  private stalledUntil = 0;
  private disposed = false;

  constructor(private readonly options: SandboxServerOptions) {
    this.random = createSeededRandom(hashSeed('server', options.table.seed));
    this.network = { latencyMs: 0, jitterMs: 0, ...options.network };
    this.bots = { mode: 'auto', delayMs: SERVER_BOT_ACTION_DELAY_MS, ...options.bots };
    // Every room entry point (timers, the alarm, client frames) runs with the seeded random, so a
    // replay deals and decides identically.
    const seeded = (task: () => void) => () => withSeededRandom(this.random, task);
    this.host = new LoopbackRoomHost(options.table.roomId, {
      deliver: (delivery) => this.deliver(delivery),
      onAlarm: seeded(() => void this.room.onAlarm()),
    });
    this.room = new GameRoom(this.host, undefined, undefined, {
      timers: {
        setTimeout: (task, delayMs) => setTimeout(seeded(task), delayMs),
        clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
      },
      botPacing: { auto: false, delayMs: this.bots.delayMs },
      attestSeat: () => SANDBOX_LOCAL_PLAYER_ID,
    });
    this.room.adoptGame(createSandboxGame(options.table, createSeededRandom(hashSeed('table', options.table.seed))));
  }

  /** The room's current game. */
  get game(): Game {
    return this.room.game;
  }

  readonly socketFactory: GameSocketFactory = () => {
    const socket = new LoopbackSocket({
      onClientMessage: (source, message) => this.receive(source, message),
      onClientClose: (source) => {
        if (this.current === source) this.current = null;
        const connection = this.host.detach(source);
        if (connection) this.room.onClose(connection);
      },
    });
    this.current = socket;
    this.room.onConnect(this.host.attach(socket, `loopback-${++this.socketCount}`));
    return socket;
  };

  get hasPendingDeliveries(): boolean {
    return this.pendingDeliveries > 0;
  }

  get isBotTurnScheduled(): boolean {
    return this.room.isBotTurnScheduled;
  }

  get isConnected(): boolean {
    return this.current?.isOpen ?? false;
  }

  setNetwork(network: Partial<SandboxNetworkConditions>): void {
    this.network = { ...this.network, ...network };
  }

  setBotPacing(bots: Partial<SandboxBotPacing>): void {
    this.bots = { ...this.bots, ...bots };
    if (this.botsReleased) this.applyBotPacing();
  }

  /** Holds every server message for `ms`, then flushes them as one burst (throttled tab, congested link). */
  stall(ms: number): void {
    this.stalledUntil = Math.max(this.stalledUntil, performance.now() + ms);
  }

  /** Drops the connection without the client asking; the client reconnects with its usual backoff. */
  dropConnection(): void {
    this.current?.drop();
    this.current = null;
  }

  /** Re-sends the current state, like broadcasts caused by other players' commands. */
  broadcastState(): void {
    withSeededRandom(this.random, () => this.room.resync());
  }

  /** Plays the current bot's turn immediately. Returns false when it is not a bot's turn. */
  playBot(): boolean {
    if (this.disposed) return false;
    return withSeededRandom(this.random, () => this.room.playBotTurnNow());
  }

  dispose(): void {
    this.disposed = true;
    this.room.dispose();
    this.host.dispose();
    this.current?.close();
    this.current = null;
  }

  private applyBotPacing(): void {
    this.room.setBotPacing({ auto: this.bots.mode === 'auto', delayMs: this.bots.delayMs });
  }

  private trace(entry: ServerTraceEntry): void {
    this.options.onTrace?.(entry);
  }

  private receive(source: LoopbackSocket, raw: string): void {
    const connection = this.host.connectionOf(source);
    const message = parse(raw);
    if (!connection || !message || this.disposed) return;
    const type = typeof message.type === 'string' ? message.type : 'UNKNOWN';
    this.trace({ direction: 'client-to-server', type, cardId: typeof message.cardId === 'string' ? message.cardId : undefined });

    const isJoin = type === ClientCommandType.JOIN_GAME;
    // Every join is the local seat's, under its own name and a browser id the room accepts.
    const frame = isJoin
      ? JSON.stringify({ ...message, playerName: SANDBOX_LOCAL_PLAYER_NAME, persistentId: this.persistentId })
      : raw;
    withSeededRandom(this.random, () => this.room.onMessage(frame, connection));

    if (isJoin && !this.botsReleased) {
      this.botsReleased = true;
      withSeededRandom(this.random, () => this.applyBotPacing());
    }
  }

  /** Server -> client: always asynchronous, in order, shaped by the network conditions. */
  private deliver({ socket, data }: LoopbackDelivery): void {
    if (this.disposed) return;
    const typed = (parse(data) ?? {}) as {
      type?: string;
      card?: { id?: string };
      playerId?: string;
      trickCards?: Array<{ card: { id: string } }>;
    };
    const now = performance.now();
    const delay = this.network.latencyMs + this.random() * this.network.jitterMs;
    const deliverAt = Math.max(now + delay, this.lastDeliveryAt, this.stalledUntil);
    this.lastDeliveryAt = deliverAt;
    const entry: ServerTraceEntry = {
      direction: 'server-to-client',
      type: typed.type ?? 'UNKNOWN',
      cardId: typed.card?.id,
      playerId: typed.playerId,
      trickCardIds: typed.trickCards?.map((played) => played.card.id),
    };

    // A real socket never delivers inside the client's send() call.
    this.pendingDeliveries++;
    setTimeout(() => {
      this.pendingDeliveries--;
      if (!socket.isOpen || this.disposed) return;
      // Traced on delivery: messages lost to a dropped connection never reached the client.
      this.trace(entry);
      socket.deliver(data);
    }, Math.max(0, deliverAt - now));
  }
}
