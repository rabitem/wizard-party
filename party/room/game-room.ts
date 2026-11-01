import type * as Party from '../runtime';
import { SEAT_PROOF_HEADER, type Game, type IRoomSettings } from '../../shared/domain';
import type { TelemetryClientInfo } from '../../shared/telemetry';
import {
  createUseCaseRegistry,
  type ISessionCredentialFactory,
  type IUseCaseRegistry,
} from '../../shared/application';
import type { ServerContext } from '../utils/types';
import { loadState, saveState } from '../utils/state';
import {
  ConnectionTracker,
  NOOP_TELEMETRY,
  ServerTrigger,
  UNKNOWN_CLIENT_INFO,
  clientConnectedFact,
  clientDisconnectedFact,
  instrumentUseCases,
  type ConnectionCloseInfo,
  type GameTelemetry,
} from '../telemetry';
import { CommitGate } from '../protocol/commit-gate';
import { CommandRateLimiter } from '../protocol/command-rate-limiter';
import { attestSeat, cryptoSessionCredentials } from '../session/seat-sessions';
import { TOURNAMENTS_UNAVAILABLE, TournamentMatchController, type TournamentMatchServices } from '../tournament';
import { systemTimers, type RoomTimers } from './ports';
import { RoomState } from './room-state';
import type { CharacterTicketVerifier } from '../session/character-tickets';
import { RoomMessaging } from './room-messaging';
import { RoomScheduler } from './room-scheduler';
import { RoomClockwork, type BotPacing } from './room-clockwork';
import { CommandPipeline } from './command-pipeline';
import { DEFAULT_DEADLINE_POLICY, type RoomDeadlinePolicy } from './room-deadlines';

/** Collaborators a host adapter or a test may replace. */
export interface GameRoomOptions {
  /** Seat ids and session tokens; cryptographically random by default. */
  sessionCredentials?: ISessionCredentialFactory;
  /** Ticket verification, result outbox and alarm of tournament match mode; unavailable by default. */
  tournament?: TournamentMatchServices;
  /** Verifies character tickets on JOIN_GAME; without it seats show no look. */
  characterTickets?: CharacterTicketVerifier | null;
  /** In-memory timers (bot pacing, disconnect debounce); the global timers by default. */
  timers?: RoomTimers;
  /** How bots are paced; automatic with the configured delay by default. */
  botPacing?: Partial<BotPacing>;
  /**
   * A seat the host itself vouches for on a connection (the sandbox's one local player), like a
   * verified tournament ticket. Real rooms never vouch: seats are proven by session tokens.
   */
  attestSeat?: (connectionId: string) => string | undefined;
}

/**
 * The game room, independent of any transport or runtime. A host adapter feeds it connections,
 * frames, closes and alarms through the ports in ./ports.ts; party/worker.ts binds it to
 * Cloudflare Durable Objects, the sandbox loopback runs it in the browser, and the test harness
 * runs it against fake timers. Every entry point runs as one transaction of the commit gate, and every
 * transaction ends by settling the room's deadlines (RoomClockwork).
 */
export class GameRoom {
  private readonly state: RoomState;
  private readonly gate: CommitGate;
  private readonly useCases: IUseCaseRegistry;
  private readonly sessionCredentials: ISessionCredentialFactory;
  private readonly connections = new ConnectionTracker();
  /** Per-sender command budgets (COMMAND_RATE_LIMITS). */
  private readonly rateLimiter = new CommandRateLimiter();
  private readonly tournament: TournamentMatchController;
  private readonly messaging: RoomMessaging;
  private readonly pipeline: CommandPipeline;
  private readonly clockwork: RoomClockwork;

  constructor(
    readonly room: Party.Room,
    useCases?: IUseCaseRegistry,
    private readonly telemetry: GameTelemetry = NOOP_TELEMETRY,
    options: GameRoomOptions = {}
  ) {
    this.state = new RoomState(room.id);
    this.useCases = instrumentUseCases(useCases ?? createUseCaseRegistry(), telemetry);
    this.sessionCredentials = options.sessionCredentials ?? cryptoSessionCredentials;
    this.gate = new CommitGate(() => this.persist(), () => this.clockwork.settle());
    this.tournament = new TournamentMatchController(room.id, options.tournament ?? TOURNAMENTS_UNAVAILABLE, () => this.getContext());
    this.messaging = new RoomMessaging(this.state, room, this.gate, this.tournament);
    this.clockwork = new RoomClockwork({
      state: this.state,
      storage: room.storage,
      scheduler: new RoomScheduler(options.timers ?? systemTimers),
      useCases: this.useCases,
      telemetry,
      messaging: this.messaging,
      context: () => this.getContext(),
      transaction: (work) => this.gate.run(work),
      requestSave: () => this.gate.requestSave(),
      deadlinePolicy: () => this.deadlinePolicy(),
    });
    if (options.botPacing) this.clockwork.setBotPacing(options.botPacing);
    this.pipeline = new CommandPipeline({
      state: this.state,
      messaging: this.messaging,
      gate: this.gate,
      telemetry,
      rateLimiter: this.rateLimiter,
      tournament: this.tournament,
      characterTickets: options.characterTickets ?? null,
      connections: this.connections,
      context: () => this.getContext(),
      attestSeat: options.attestSeat ?? (() => undefined),
    });
  }

  /** The room's current game (a rematch replaces it). */
  get game(): Game {
    return this.state.game;
  }

  /** Match rooms advance their rounds through the tournament controller instead. */
  private deadlinePolicy(): RoomDeadlinePolicy {
    return this.tournament.isMatchRoom ? { ...DEFAULT_DEADLINE_POLICY, advanceRounds: false } : DEFAULT_DEADLINE_POLICY;
  }

  // ============================================================================
  // Server Context (for handlers)
  // ============================================================================

  private getContext(): ServerContext {
    const { state, messaging } = this;
    return {
      room: this.room,
      get game(): Game { return state.game; },
      set game(game: Game) { state.game = game; },
      useCases: this.useCases,
      telemetry: this.telemetry,
      persistentIdToPlayerId: state.persistentIdToPlayerId,
      sessionTokens: state.sessionTokens,
      sessionCredentials: this.sessionCredentials,
      connectionToPlayer: state.connectionToPlayer,
      activeConnections: state.activeConnections,
      get roomSettings(): IRoomSettings { return state.roomSettings; },
      set roomSettings(settings: IRoomSettings) { state.roomSettings = settings; },
      get botCounter(): number { return state.botCounter; },
      set botCounter(counter: number) { state.botCounter = counter; },
      playerSoundPreferences: state.playerSoundPreferences,
      processingJoins: state.processingJoins,
      recentJoins: state.recentJoins,
      cancelPendingDisconnect: (playerId) => this.clockwork.cancelDisconnect(playerId),
      setGame: (game) => { state.game = game; },
      setBotCounter: (counter) => { state.botCounter = counter; },
      setRoomSettings: (settings) => { state.roomSettings = settings; },
      broadcast: (event) => messaging.broadcast(event),
      sendToConnection: (conn, event) => messaging.sendToConnection(conn, event),
      closeConnection: (conn, code, reason) => messaging.closeConnection(conn, code, reason),
      syncSharedSounds: () => messaging.syncSharedSounds(),
      sendError: (conn, message, code, error) => this.pipeline.sendError(conn, message, code, error),
      broadcastPersonalizedState: () => messaging.broadcastPersonalizedState(),
      saveState: () => this.gate.requestSave(),
    };
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  async onStart(): Promise<void> {
    await this.telemetry.start();
    this.state.restore(await loadState(this.room, this.state.roomSettings));
    // Settling at the end arms the restored deadlines (grace, pause) and any waiting bot turn.
    this.gate.run(() => this.clockwork.recoverRestoredGame({ graceLobby: !this.tournament.isMatchRoom }));
    await this.tournament.load();
  }

  /** `client` is extracted from the upgrade request by the hosting adapter (see worker.ts). */
  onConnect(conn: Party.Connection, client: TelemetryClientInfo = UNKNOWN_CLIENT_INFO): void {
    this.state.activeConnections.set(conn.id, conn);
    const session = this.connections.open(conn.id, client, Date.now());
    this.telemetry.withCause({ source: 'player', commandType: ServerTrigger.CONNECT, senderKey: conn.id }, () =>
      this.telemetry.record(clientConnectedFact(session), this.state.game)
    );
    // A new socket holds no seat until it joins; a pending disconnect of the seat it will take
    // is cancelled by the join itself (join-handlers).
  }

  onMessage(message: string, sender: Party.Connection): void {
    this.pipeline.onMessage(message, sender);
  }

  /** Binary frames: recorded; the hosting adapter closes the socket afterwards. */
  onInvalidFrame(sender: Party.Connection): void {
    this.pipeline.onInvalidFrame(sender);
  }

  /** `close` comes from the hosting adapter; absent when the runtime does not report it. */
  onClose(conn: Party.Connection, close: ConnectionCloseInfo = {}): void {
    const { state } = this;
    state.activeConnections.delete(conn.id);
    state.connectionProtocols.delete(conn.id);
    state.heldMessages.delete(conn.id);
    // Budgets of a joined connection belong to its seat and outlive the socket.
    this.rateLimiter.release(conn.id);

    const session = this.connections.close(conn.id);
    const playerId = state.playerOf(conn.id);
    this.telemetry.withCause(
      { source: 'system', actorId: session?.playerId ?? playerId, commandType: ServerTrigger.CONNECTION_CLOSED, senderKey: conn.id },
      () => this.telemetry.record(clientDisconnectedFact(conn.id, session, close, Date.now()), state.game)
    );

    if (!playerId) return;
    state.connectionToPlayer.delete(conn.id);
    // Another socket of the seat is still open (a second tab, a reconnect that won the race).
    if (state.hasConnection(playerId)) return;
    this.clockwork.scheduleDisconnect(playerId);
  }

  /** The room's durable alarm fired: handles every deadline that is due. */
  async onAlarm(): Promise<void> {
    this.telemetry.withCause({ source: 'system', commandType: ServerTrigger.ALARM }, () =>
      this.gate.run(() => this.clockwork.processDueDeadlines())
    );
  }

  /** The tournament channel of the alarm multiplexer fired (start countdown, no-shows, round advance). */
  async onTournamentAlarm(): Promise<void> {
    this.telemetry.withCause({ source: 'system', commandType: ServerTrigger.ALARM }, () =>
      this.gate.run(() => this.tournament.onAlarm())
    );
  }

  // ============================================================================
  // Driver API (sandbox, test harness)
  // ============================================================================

  /** Automatic bot turns (production) or bots that move only when asked (sandbox manual mode). */
  setBotPacing(pacing: Partial<BotPacing>): void {
    this.clockwork.setBotPacing(pacing);
  }

  get isBotTurnScheduled(): boolean {
    return this.clockwork.isBotTurnScheduled;
  }

  /** Plays the waiting bot's turn now; false when no bot is to act. */
  playBotTurnNow(): boolean {
    return this.clockwork.playBotTurnNow();
  }

  /**
   * A host that deals its own table (the sandbox) hands the game over instead of loading one from
   * storage. Its seats keep their connection flags; a human seat is taken by its host-attested
   * connection when that joins.
   */
  adoptGame(game: Game): void {
    this.gate.run(() => {
      this.state.game = game;
      this.state.roomSettings = { ...this.state.roomSettings, rulesetConfig: game.rulesetConfig };
      this.gate.requestSave();
    });
  }

  /** Sends every joined connection a fresh snapshot (as another player's move would). */
  resync(): void {
    this.gate.run(() => this.messaging.broadcastPersonalizedState());
  }

  /** Stops every in-memory timer (the host is going away). */
  dispose(): void {
    this.clockwork.dispose();
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  /** Issues the storage write synchronously; the commit gate sends only after this call. */
  private persist(): void {
    const { state } = this;
    void saveState({
      room: this.room,
      game: state.game,
      persistentIdToPlayerId: state.persistentIdToPlayerId,
      sessionTokens: state.sessionTokens,
      roomSettings: state.roomSettings,
      botCounter: state.botCounter,
      stateVersion: state.stateVersion,
      playerSoundPreferences: state.playerSoundPreferences,
      processedCommands: state.processedCommands,
    });
  }

  // ============================================================================
  // HTTP
  // ============================================================================

  async onRequest(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Accept',
        },
      });
    }
    if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });

    // The header is the current form; the query parameter is what earlier web app releases send.
    const seatProof = req.headers.get(SEAT_PROOF_HEADER) ?? new URL(req.url).searchParams.get('seat');
    if (seatProof) return this.seatResponse(seatProof);
    const { game, roomSettings } = this.state;
    const info = {
      roomId: this.room.id,
      playerCount: game.players.length,
      phase: game.phase,
      isPaused: game.isPaused(),
      maxPlayers: roomSettings.maxPlayers,
      roomName: roomSettings.name,
    };
    // Tournament rooms are never available to casual players and expose only their caption.
    const body = this.tournament.roomInfo(info) ?? { ...info, isAvailable: game.players.length === 0 };
    return new Response(JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  /**
   * Seat attestation for the social features: which seat does this proof hold in this room (or
   * null)? A seat's session token proves it; a persistent id proves only a seat that never had a
   * token. The public seat id proves nothing. Server-to-server: no CORS.
   */
  private seatResponse(seatProof: string): Response {
    const seat = attestSeat(this.getContext(), seatProof);
    return new Response(JSON.stringify({ seat }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
}
