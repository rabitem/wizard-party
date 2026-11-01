import type * as Party from '../runtime';
import { GameEventType, GamePhase, getTrickPresentationMs, type TurnTimerExpiredEvent } from '../../shared/domain';
import type { IUseCaseRegistry } from '../../shared/application';
import { ServerTrigger, type GameTelemetry } from '../telemetry';
import type { ServerContext } from '../utils/types';
import { pauseForDisconnectedHuman } from '../utils/reconnect-recovery';
import { applyAutomaticMove, processBotTurn, type BotTurnOutcome } from '../bot/bot-turn';
import { broadcastHostChanged, handleGraceTimeout, handlePlayerLeave } from '../handlers/player-handlers';
import { ROOM_TIMING } from '../config/room-timing.config';
import type { RoomMessaging } from './room-messaging';
import type { RoomScheduler } from './room-scheduler';
import type { RoomState } from './room-state';
import { earliestDeadline, isDue, roomDeadlines, type RoomDeadlinePolicy, type RoomDeadlines } from './room-deadlines';

/** How bots are paced: on their own after a delay (production), or only when asked (sandbox). */
export interface BotPacing {
  auto: boolean;
  delayMs: number;
}

export interface RoomClockworkDeps {
  state: RoomState;
  storage: Party.RoomStorage;
  scheduler: RoomScheduler;
  useCases: IUseCaseRegistry;
  telemetry: GameTelemetry;
  messaging: RoomMessaging;
  context: () => ServerContext;
  /** Runs `work` as one transaction of the room (state written before its messages go out). */
  transaction: <T>(work: () => T) => T;
  /** Asks for the state to be written with the current transaction. */
  requestSave: () => void;
  deadlinePolicy: () => RoomDeadlinePolicy;
}

const BOT_TURN = 'bot-turn';
const disconnectTask = (playerId: string) => `disconnect:${playerId}`;

type DeadlineKind = keyof RoomDeadlines;

/** A deadline whose handler failed is retried after this, never in a tight alarm loop. */
const FAILED_DEADLINE_RETRY_MS = 15_000;

/**
 * Owns "what happens next" in a room. After every transaction (`settle`, run by the commit gate)
 * it derives from the state what the room waits for:
 * - the next bot turn: one single-flight task, re-armed after every change of the table (and held
 *   back while the tables still present a completed trick) and retried with backoff when a turn
 *   could not be applied, so a bot error never stalls the room;
 * - the durable alarm: the earliest of the state's deadlines (grace, pause, turn timer, turn
 *   timeout, round advance). When it fires, each deadline is handled only if it is due.
 * It also debounces disconnects, so a socket that comes back quickly costs nothing.
 */
export class RoomClockwork {
  private pacing: BotPacing = { auto: true, delayMs: ROOM_TIMING.BOT_ACTION_DELAY_MS };
  private settledVersion: number | null = null;
  private botFailures = 0;
  /** Round and completed tricks at the last settle, to notice a trick that just completed. */
  private settledTrickKey: string | null = null;
  /** When the tables finish presenting the last completed trick (in memory: a restart shows none). */
  private trickPresentedAt = 0;
  private readonly failedDeadlines = new Map<DeadlineKind, { at: number; retryAt: number }>();

  constructor(private readonly deps: RoomClockworkDeps) {}

  // ==========================================================================
  // Settling (after every transaction)
  // ==========================================================================

  settle(): void {
    this.reconcileBotTurn();
    this.reconcileAlarm();
  }

  private reconcileBotTurn(): void {
    const { state, scheduler, useCases } = this.deps;
    const changed = state.stateVersion !== this.settledVersion;
    this.settledVersion = state.stateVersion;
    if (changed) {
      this.botFailures = 0;
      this.noteCompletedTrick();
    }

    const botToAct = this.pacing.auto && useCases.botTurn.getActingBot(state.game) !== undefined;
    if (!botToAct) {
      scheduler.cancel(BOT_TURN);
      return;
    }
    // The table changed: the bot answers a full delay after the change. Otherwise the pending
    // turn stands (an emote or a chat line does not push a bot back).
    if (!changed && scheduler.isScheduled(BOT_TURN)) return;
    scheduler.schedule(BOT_TURN, this.botDelay(), () => this.deps.transaction(() => this.runBotTurn()));
  }

  /**
   * A trick completed with this change: the tables now land its last card and collect it, and no
   * bot may act (lead the next trick, answer a special card) before that has been shown.
   */
  private noteCompletedTrick(): void {
    const { game } = this.deps.state;
    const trickKey = `${game.currentRound}:${game.completedTricks.length}`;
    const previousKey = this.settledTrickKey;
    this.settledTrickKey = trickKey;
    const trick = game.getLastCompletedTrick();
    if (previousKey === null || previousKey === trickKey || !trick) return;
    this.trickPresentedAt = Date.now() + getTrickPresentationMs(trick.cards.length);
  }

  /** A full delay after the change, or after the completed trick has been presented. */
  private botDelay(): number {
    if (this.botFailures === 0) return this.pacing.delayMs + Math.max(0, this.trickPresentedAt - Date.now());
    return Math.min(ROOM_TIMING.BOT_RETRY_BASE_MS * 2 ** (this.botFailures - 1), ROOM_TIMING.BOT_RETRY_MAX_MS);
  }

  private runBotTurn(): BotTurnOutcome {
    const outcome = processBotTurn(this.deps.context());
    if (outcome === 'failed') {
      this.botFailures += 1;
      console.error(`[Server] Bot turn failed (${this.botFailures}x); retrying in ${this.botDelay()}ms`);
    }
    return outcome;
  }

  private effectiveDeadlines(): RoomDeadlines {
    const deadlines = roomDeadlines(this.deps.state.game, this.deps.deadlinePolicy());
    for (const kind of Object.keys(deadlines) as DeadlineKind[]) {
      const failed = this.failedDeadlines.get(kind);
      if (!failed) continue;
      if (failed.at === deadlines[kind]) deadlines[kind] = failed.retryAt;
      else this.failedDeadlines.delete(kind);
    }
    return deadlines;
  }

  private reconcileAlarm(): void {
    const at = earliestDeadline(this.effectiveDeadlines());
    const { storage } = this.deps;
    Promise.resolve(at === null ? storage.deleteAlarm() : storage.setAlarm(at)).catch((error: unknown) => {
      console.error('[Server] Arming the room alarm failed:', error);
    });
  }

  // ==========================================================================
  // Bot pacing (driver API)
  // ==========================================================================

  setBotPacing(pacing: Partial<BotPacing>): void {
    this.pacing = { ...this.pacing, ...pacing };
    this.deps.transaction(() => {
      // Re-arms with the new pacing (or cancels in manual mode).
      this.deps.scheduler.cancel(BOT_TURN);
    });
  }

  get isBotTurnScheduled(): boolean {
    return this.deps.scheduler.isScheduled(BOT_TURN);
  }

  /** Plays the waiting bot's turn now; false when no bot is to act. */
  playBotTurnNow(): boolean {
    this.deps.scheduler.cancel(BOT_TURN);
    return this.deps.transaction(() => this.runBotTurn()) === 'acted';
  }

  // ==========================================================================
  // Disconnects
  // ==========================================================================

  /**
   * A seat's last socket closed. Wait a moment before treating the seat as disconnected: a client
   * that is already reconnecting must not cost the table a pause.
   */
  scheduleDisconnect(playerId: string): void {
    this.deps.scheduler.schedule(disconnectTask(playerId), ROOM_TIMING.DISCONNECT_DEBOUNCE_MS, () => {
      if (this.deps.state.hasConnection(playerId)) return;
      this.deps.telemetry.withCause(
        { source: 'system', actorId: playerId, commandType: ServerTrigger.DISCONNECT },
        () => this.deps.transaction(() => handlePlayerLeave(this.deps.context(), playerId, false))
      );
    });
  }

  cancelDisconnect(playerId: string): boolean {
    return this.deps.scheduler.cancel(disconnectTask(playerId));
  }

  // ==========================================================================
  // Durable deadlines (the room alarm fired)
  // ==========================================================================

  /** Handles every deadline that is due; each one checks its own deadline (a stale alarm does nothing). */
  processDueDeadlines(): void {
    this.handle('grace', () => this.processExpiredGraces());
    this.handle('pause', () => this.processPauseTimeout());
    this.handle('turnTimer', () => this.processTurnTimerExpiration());
    this.handle('turnTimeout', () => this.processTurnTimeout());
    this.handle('roundAdvance', () => this.processRoundAdvance());
  }

  /**
   * Runs one kind of deadline if it is due. A handler that throws, or that leaves its deadline
   * where it was (nothing could be done), is retried later instead of re-firing the alarm at once.
   */
  private handle(kind: DeadlineKind, process: () => void): void {
    const now = Date.now();
    if (!isDue(this.effectiveDeadlines()[kind], now)) return;
    const deadlineOf = () => roomDeadlines(this.deps.state.game, this.deps.deadlinePolicy())[kind];
    const before = deadlineOf();
    try {
      process();
    } catch (error) {
      console.error(`[Server] Handling the ${kind} deadline failed:`, error);
    }
    const after = deadlineOf();
    if (after !== null && after === before && after <= now) {
      this.failedDeadlines.set(kind, { at: after, retryAt: now + FAILED_DEADLINE_RETRY_MS });
    } else {
      this.failedDeadlines.delete(kind);
    }
  }

  private processExpiredGraces(): void {
    const { game } = this.deps.state;
    const expired = Array.from(game.graceStates.keys()).filter((playerId) => game.isGraceExpired(playerId));
    console.log(`[Server] Processing ${expired.length} expired grace period(s)`);
    const ctx = this.deps.context();
    expired.forEach((playerId) => handleGraceTimeout(ctx, playerId));
  }

  private processPauseTimeout(): void {
    const { state, useCases, messaging } = this.deps;
    const timeoutDuration = state.game.pauseState?.timeoutDuration;
    const result = useCases.resumeGame.executeOnTimeout({ game: state.game, botCounter: state.botCounter });
    if (!result.wasResumed) return;

    if (result.newBotCounter !== undefined) state.botCounter = result.newBotCounter;
    const ctx = this.deps.context();
    if (result.newHostId) broadcastHostChanged(ctx, result.newHostId);
    const nextPause = pauseForDisconnectedHuman(ctx, { timeoutDuration });
    if (nextPause) {
      console.log(`[Server] Pause timeout advanced to disconnected player ${nextPause.pausedForPlayerId}`);
    } else if (result.gameResumedEvent) {
      messaging.broadcast(result.gameResumedEvent);
    }
    messaging.broadcastPersonalizedState();
  }

  private processTurnTimerExpiration(): void {
    const { state, telemetry, messaging } = this.deps;
    const expired = state.game.expireTurnTimer();
    if (!expired) return;

    const event: TurnTimerExpiredEvent = {
      type: GameEventType.TURN_TIMER_EXPIRED,
      playerId: expired.playerId,
      playerName: expired.playerName,
      sequence: expired.sequence,
      timestamp: Date.now(),
    };
    telemetry.capture([event], state.game);
    messaging.broadcast(event);
    messaging.broadcastPersonalizedState();
  }

  /** The heckling window after a timeout ended: the room makes the legal default move. */
  private processTurnTimeout(): void {
    const { state, useCases, telemetry } = this.deps;
    const move = useCases.turnTimeout.execute({ game: state.game });
    if (move.type === 'NONE') return;
    console.log(`[Server] Turn timeout: moving for ${move.playerId} (${move.type})`);
    telemetry.withCause({ source: 'system', actorId: move.playerId, commandType: move.type }, () =>
      applyAutomaticMove(this.deps.context(), move)
    );
  }

  /** ROUND_END waited long enough: the room deals the next round itself. */
  private processRoundAdvance(): void {
    const { state, useCases, messaging } = this.deps;
    const result = useCases.nextRound.executeOnTimeout({ game: state.game });
    if (!result) return;
    messaging.broadcast(result.trumpRevealedEvent);
    messaging.broadcastPersonalizedState();
  }

  /**
   * After a restart no socket survived: a running game waits for its humans to come back, and a
   * lobby keeps their seats for the reconnect window (like any lobby drop), so a human who never
   * returns is freed by the grace alarm instead of keeping the table from starting. Match rooms
   * keep their own rule for members restored without a connection (no-shows at the start).
   */
  recoverRestoredGame(options: { graceLobby: boolean }): void {
    if (options.graceLobby) this.graceRestoredLobby();
    this.pauseRestoredGame();
  }

  private graceRestoredLobby(): void {
    const { game } = this.deps.state;
    if (game.phase !== GamePhase.LOBBY) return;
    const away = game.players.filter((player) => !player.isBot && !player.isConnected && !game.isPlayerGraced(player.id));
    for (const player of away) game.gracePlayer(player.id, ROOM_TIMING.RECONNECT_WINDOW_MS);
    if (away.length > 0) this.deps.requestSave();
  }

  private pauseRestoredGame(): void {
    const { game } = this.deps.state;
    const preferredPlayerId = game.players[game.currentPlayerIndex]?.id;
    const pauseEvent = pauseForDisconnectedHuman(this.deps.context(), { preferredPlayerId, broadcast: false });
    if (!pauseEvent) return;
    console.log(`[Server] Restored active game paused for ${pauseEvent.pausedForPlayerId} to reconnect`);
    this.deps.requestSave();
  }

  dispose(): void {
    this.deps.scheduler.dispose();
  }
}
