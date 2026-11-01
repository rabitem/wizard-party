/**
 * Game aggregate types: the serialized game state (IGameState, the wire and
 * storage format) and the results of game operations.
 */

import type { ICard } from './card';
import type { IPlayer } from './player';
import type { ITrick } from './trick';
import type { IRoomSettings } from './room-settings';
import type { Suit } from '../value-objects/card-types';
import type { GamePhase } from '../value-objects/game-phase';
import type { IRulesetConfig } from '../value-objects/ruleset-config';
import type { ITrumpChoice, IWerewolfSwap } from '../expansions/trump-reveal';
import type { PendingTrickEffect, TrickEffectOutcome } from '../expansions/trick-effects';
import type { IClock } from '../ports/clock.port';
import type { IRandom } from '../ports/random.port';

/**
 * Why and until when a running game waits for a disconnected player. Orthogonal to the phase:
 * the game keeps its phase while paused.
 */
export interface IPauseState {
  pausedForPlayerId: string;
  pausedForPlayerName: string;
  pausedAt: number;
  /**
   * The phase the game is in while paused. Legacy (protocol 1) clients are shown phase PAUSED
   * and read this as the phase to return to.
   */
  previousPhase: GamePhase;
  timeoutDuration: number; // milliseconds
}

/**
 * Grace state for tracking lobby disconnect grace periods
 * Allows disconnected players to rejoin without being fully removed
 */
export interface IGraceState {
  playerId: string;
  playerName: string;
  gracedAt: number;
  graceDuration: number; // milliseconds (default 120000 = 2 minutes)
  wasHost: boolean;
}

/**
 * Turn timer state for active player phases.
 * When expired is true, other players may send a timeout sound to the target player.
 */
export interface ITurnTimerState {
  playerId: string;
  playerName: string;
  phase: GamePhase;
  startedAt: number;
  durationMs: number;
  expiresAt: number;
  expired: boolean;
  sequence: number;
  /** Server timestamp attached to outgoing state for client-side countdown sync. */
  serverNow?: number;
}

/**
 * Round facts introduced by expansion special cards (all public information).
 */
export interface IExpansionRoundState {
  /** The card that determined trump at round start; the Vampire copies it. */
  copySource: ICard | null;
  /** Werewolves turned up as trump card and set aside for the round. */
  setAsideCards: ICard[];
  /** The Werewolf holder's swap with the turned-up trump card. */
  werewolfSwap: IWerewolfSwap | null;
}

/**
 * Game state data transfer object interface
 */
export interface IGameState {
  id: string;
  phase: GamePhase;
  players: IPlayer[];
  currentRound: number;
  maxRounds: number;
  trumpSuit: Suit | null;
  trumpCard: ICard | null;
  currentPlayerIndex: number;
  dealerIndex: number;
  /**
   * The open trick. At ROUND_END it is still the last completed trick (clients
   * keep showing it until the next deal).
   */
  currentTrick: ITrick | null;
  completedTricks: ITrick[];
  bidsPlaced: number;
  hostId: string;
  /** Forbidden bid of the player about to bid last (hook rule); null otherwise. */
  forbiddenBid: number | null;
  /** Who decides trump during TRUMP_SELECTION (dealer, or the Werewolf holder). */
  trumpChoice?: ITrumpChoice | null;
  expansionState?: IExpansionRoundState | null;
  /** Special-card effects to resolve before the next trick; the first one is active. */
  pendingEffects?: PendingTrickEffect[];
  roomSettings?: IRoomSettings;
  rulesetConfig?: IRulesetConfig;
  /** Set while the table waits for a disconnected player; `phase` stays the real phase. */
  pauseState?: IPauseState | null;
  /** When the current ROUND_END began (the room advances it after a while); null otherwise. */
  roundEndedAt?: number | null;
  turnTimerState?: ITurnTimerState | null;
  /** Grace states for lobby disconnected players (playerId -> grace state) */
  graceStates?: [string, IGraceState][];
  /** Player ids the host removed from this lobby; they may not rejoin it. Server-only (not broadcast). */
  kickedPlayerIds?: string[];
}

/**
 * How a completed trick ended
 */
export interface TrickCompletion {
  /** Player credited with the trick; null when a Bomb voided it. */
  winnerId: string | null;
  /** Player leading the next trick. */
  leaderId: string;
  voided: boolean;
}

/**
 * Progress of the special-card effects queued after a trick
 */
export interface EffectProgress {
  /** Effects that resolved during this step, in order. */
  effectOutcomes: TrickEffectOutcome[];
  /** Effects still waiting for player input. */
  awaitingEffects: boolean;
  roundComplete: boolean;
}

/**
 * Result of playing a card
 */
export interface PlayCardResult extends Partial<EffectProgress> {
  trickComplete: boolean;
  /** Trick winner; null when the trick was voided. */
  winnerId?: string | null;
  trick?: TrickCompletion;
  roundComplete?: boolean;
}

/**
 * Outside-world collaborators of a game. Both default to the system clock and
 * Math.random; tests, replays and the sandbox inject deterministic ones.
 */
export interface GameDependencies {
  random?: IRandom;
  clock?: IClock;
}
