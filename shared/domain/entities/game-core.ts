/**
 * Game core: the state every part of the Game aggregate shares, the phase state
 * machine, the outside-world ports (random, clock) and the turn timer.
 *
 * The aggregate is layered by responsibility, each layer one file:
 *   GameCore  (state, phase transitions, turn timer)
 *   GameLobby (seats, readiness, grace, host, pause)
 *   GameRound (dealing, trump, bidding, scoring, round lifecycle)
 *   Game      (trick play, special-card effects, serialization)
 * Callers only ever see `Game`; its public API is the union of the layers.
 */

import { Card } from './card';
import { Deck } from './deck';
import { Player } from './player';
import { Trick } from './trick';
import { TurnTimer, getTurnTimerDurationMs, type TurnTimerTarget } from './turn-timer';
import type {
  GameDependencies,
  IExpansionRoundState,
  IGraceState,
  IPauseState,
  ITurnTimerState,
} from './game.types';
import { Suit } from '../value-objects/card-types';
import { GamePhase, canTransitionPhase } from '../value-objects/game-phase';
import { type IRulesetConfig, ensureRulesetConfig } from '../value-objects/ruleset-config';
import type { ICardRoundContext } from '../expansions/card-rules';
import type { ITrumpChoice } from '../expansions/trump-reveal';
import type { PendingTrickEffect } from '../expansions/trick-effects';
import { GamePausedError, InvalidPhaseTransitionError } from '../errors/game-errors';
import { systemClock, type IClock } from '../ports/clock.port';
import { systemRandom, type IRandom } from '../ports/random.port';

export abstract class GameCore {
  protected readonly random: IRandom;
  protected readonly clock: IClock;
  protected readonly deck: Deck;
  private readonly turnTimer = new TurnTimer();

  public phase: GamePhase = GamePhase.LOBBY;
  public players: Player[] = [];
  public currentRound: number = 0;
  public maxRounds: number = 0;
  public trumpSuit: Suit | null = null;
  public trumpCard: Card | null = null;
  public trumpChoice: ITrumpChoice | null = null;
  public expansionState: IExpansionRoundState | null = null;
  public pendingEffects: PendingTrickEffect[] = [];
  public currentPlayerIndex: number = 0;
  public dealerIndex: number = 0;
  /** The open trick; after the last trick of a round it stays the completed one. */
  public currentTrick: Trick | null = null;
  public completedTricks: Trick[] = [];
  public hostId: string;
  /**
   * Set while the table waits for a disconnected player. Orthogonal to the phase: a paused game
   * keeps its phase, and moves are refused until it resumes.
   */
  public pauseState: IPauseState | null = null;
  /** When the current ROUND_END began (restarted on resume); null outside ROUND_END. */
  public roundEndedAt: number | null = null;
  /** Always a private copy: never the shared default object. */
  public rulesetConfig: IRulesetConfig = ensureRulesetConfig(undefined);
  /** Grace states for lobby disconnected players - allows reconnection within grace period */
  public graceStates: Map<string, IGraceState> = new Map();
  /** Players the host removed from this lobby - blocked from rejoining it */
  public kickedPlayerIds: Set<string> = new Set();

  constructor(public readonly id: string, hostId: string, dependencies: GameDependencies = {}) {
    this.hostId = hostId;
    this.random = dependencies.random ?? systemRandom;
    this.clock = dependencies.clock ?? systemClock;
    this.deck = new Deck([], this.random);
  }

  /** The outside-world adapters of this game (a rematch keeps them). */
  get dependencies(): Required<GameDependencies> {
    return { random: this.random, clock: this.clock };
  }

  /** The player whose decision the turn timer measures (none: untimed). */
  protected abstract getTimedPlayer(): Player | undefined;

  // ==========================================================================
  // Phase state machine
  // ==========================================================================

  /**
   * Move to another phase; only transitions in the phase table are allowed.
   */
  protected transitionTo(next: GamePhase): void {
    if (this.phase === next) return;
    if (!canTransitionPhase(this.phase, next)) {
      throw new InvalidPhaseTransitionError(this.phase, next);
    }
    this.phase = next;
  }

  // ==========================================================================
  // Pause
  // ==========================================================================

  /** True while the table waits for a disconnected player. */
  isPaused(): boolean {
    return this.pauseState !== null;
  }

  /** Every move goes through this: nothing changes the table while it is paused. */
  protected assertNotPaused(): void {
    if (this.pauseState) throw new GamePausedError(this.pauseState.pausedForPlayerName);
  }

  // ==========================================================================
  // Seats
  // ==========================================================================

  getPlayer(playerId: string): Player | undefined {
    return this.players.find((p) => p.id === playerId);
  }

  /** The player whose turn it is. */
  getCurrentPlayer(): Player {
    return this.players[this.currentPlayerIndex];
  }

  getDealer(): Player {
    return this.players[this.dealerIndex];
  }

  /**
   * Round facts card behaviour depends on (the card the Vampire copies)
   */
  getRoundContext(): ICardRoundContext {
    return { copySource: this.expansionState?.copySource ?? null };
  }

  protected newTrick(): Trick {
    return new Trick(this.trumpSuit, this.getRoundContext());
  }

  // ==========================================================================
  // Turn timer
  // ==========================================================================

  get turnTimerState(): ITurnTimerState | null {
    return this.turnTimer.state;
  }

  set turnTimerState(state: ITurnTimerState | null) {
    this.turnTimer.state = state;
  }

  private getTurnTimerTarget(): TurnTimerTarget | null {
    // Nobody is timed while the table waits for a reconnect.
    if (this.pauseState) return null;
    const durationMs = getTurnTimerDurationMs(this.rulesetConfig, this.phase);
    const player = this.getTimedPlayer();
    if (!durationMs || !player) return null;
    return { playerId: player.id, playerName: player.name, phase: this.phase, durationMs };
  }

  protected restartTurnTimerForCurrentTurn(): void {
    this.turnTimer.restart(this.getTurnTimerTarget(), this.clock.now());
  }

  protected clearTurnTimer(): void {
    this.turnTimer.clear();
  }

  syncTurnTimerState(): void {
    this.turnTimer.sync(this.getTurnTimerTarget(), this.clock.now());
  }

  expireTurnTimer(now: number = this.clock.now()): ITurnTimerState | null {
    this.syncTurnTimerState();
    return this.turnTimer.expire(now);
  }

  getTurnTimerTimeRemaining(now: number = this.clock.now()): number {
    this.syncTurnTimerState();
    return this.turnTimer.remaining(now);
  }

  restoreTurnTimerState(state: ITurnTimerState | null | undefined): void {
    this.turnTimer.restore(state);
  }
}
