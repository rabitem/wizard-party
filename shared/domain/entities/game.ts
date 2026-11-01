/**
 * Game aggregate root
 *
 * Game flow:
 * LOBBY -> DEALING -> TRUMP_SELECTION/BIDDING -> PLAYING -> ROUND_END -> (repeat or GAME_END)
 * An active game can be paused while a player reconnects; the pause sits beside the phase
 * (pauseState), so the table keeps its phase and no move is accepted until it resumes.
 *
 * The aggregate is split by responsibility (see game-core.ts): this file holds
 * trick play, the special-card effect queue and serialization; seats, timers and
 * the round lifecycle live in the layers it extends.
 */

import { GameRound } from './game-round';
import { createTrickEffectPort } from './game-effect-port';
import { restoreGame, serializeGame } from './game-serialization';
import type { Card } from './card';
import { Player } from './player';
import type { Trick } from './trick';
import type {
  EffectProgress,
  GameDependencies,
  IGameState,
  PlayCardResult,
} from './game.types';
import { GamePhase } from '../value-objects/game-phase';
import { DeclarationKind, type ICardDeclaration } from '../expansions/card-behavior';
import { getCardCatalogEntry } from '../expansions/card-catalog';
import { getRequiredDeclaration, normalizeDeclaration } from '../expansions/card-rules';
import {
  applyEffectResponse,
  deriveTrickEffects,
  getAwaitingPlayerIds,
  getForcedResponse,
  validateEffectResponse,
  type PendingTrickEffect,
  type TrickEffectOutcome,
  type TrickEffectResponse,
} from '../expansions/trick-effects';
import {
  CardNotPlayableError,
  DeclarationRequiredError,
  EffectPendingError,
  InvalidEffectResponseError,
  InvalidPhaseError,
  NotYourTurnError,
  PlayerNotFoundError,
} from '../errors';

export { GamePhase } from '../value-objects/game-phase';
export { DEFAULT_GRACE_DURATION_MS } from './game-lobby';
export {
  DEFAULT_ROOM_SETTINGS,
  ROOM_PLAYER_LIMITS,
  ensureRoomSettings,
  type IRoomSettings,
} from './room-settings';
export type {
  EffectProgress,
  GameDependencies,
  IExpansionRoundState,
  IGameState,
  IGraceState,
  IPauseState,
  ITurnTimerState,
  PlayCardResult,
  TrickCompletion,
} from './game.types';

export class Game extends GameRound {
  constructor(id: string, hostId: string, dependencies: GameDependencies = {}) {
    super(id, hostId, dependencies);
  }

  // ==========================================================================
  // Playing
  // ==========================================================================

  /**
   * Play a card from hand. Cards that need a choice (Cloud, Juggler, Shapeshifter,
   * or a Vampire copying one) take it as `declaration`.
   */
  playCard(playerId: string, cardId: string, declaration?: unknown): PlayCardResult {
    if (this.phase !== GamePhase.PLAYING) throw new InvalidPhaseError(GamePhase.PLAYING, this.phase);
    this.assertNotPaused();
    if (this.hasPendingEffects()) throw new EffectPendingError();
    const player = this.getPlayer(playerId);
    if (!player) throw new PlayerNotFoundError(playerId);
    if (this.getCurrentPlayer().id !== playerId) throw new NotYourTurnError('play');

    const trick = this.currentTrick;
    if (!trick) throw new Error('No current trick');
    if (!player.getLegalPlays(trick.getLead()).some((c) => c.id === cardId)) {
      throw new CardNotPlayableError(cardId);
    }

    const normalizedDeclaration = this.normalizePlayDeclaration(player, cardId, declaration);
    trick.playCard(playerId, player.playCard(cardId), normalizedDeclaration);

    if (trick.isComplete(this.players.length)) {
      return this.completeTrick(trick);
    }
    this.advanceToNextPlayer();
    this.restartTurnTimerForCurrentTurn();
    return { trickComplete: false };
  }

  /**
   * Cards the player may play now (empty when it is not their turn to play)
   */
  getLegalPlays(playerId: string): Card[] {
    const player = this.getPlayer(playerId);
    if (this.phase !== GamePhase.PLAYING || this.isPaused() || this.hasPendingEffects() || !player) return [];
    if (this.getCurrentPlayer().id !== playerId) return [];
    const trick = this.currentTrick;
    return trick ? player.getLegalPlays(trick.getLead()) : [...player.hand];
  }

  /**
   * Why a declaration is not acceptable for a hand card, or null when it is
   */
  getDeclarationError(playerId: string, cardId: string, declaration: unknown): string | null {
    const handCard = this.getPlayer(playerId)?.hand.find((c) => c.id === cardId);
    if (!handCard) return null;
    if (normalizeDeclaration(handCard, declaration, this.getRoundContext()) !== null) return null;

    const kind = getRequiredDeclaration(handCard, this.getRoundContext());
    const choice = kind === DeclarationKind.SUIT ? 'a suit' : 'Wizard or Jester';
    return `Announce ${choice} for the ${getCardCatalogEntry(handCard.type).name}`;
  }

  private normalizePlayDeclaration(player: Player, cardId: string, declaration: unknown): ICardDeclaration | undefined {
    const error = this.getDeclarationError(player.id, cardId, declaration);
    if (error) throw new DeclarationRequiredError(error);
    const handCard = player.hand.find((c) => c.id === cardId);
    return handCard ? normalizeDeclaration(handCard, declaration, this.getRoundContext()) ?? undefined : undefined;
  }

  /**
   * Complete the trick: credit the winner, queue special-card effects and move on
   * once no effect needs input.
   */
  private completeTrick(trick: Trick): PlayCardResult {
    const resolution = trick.resolve(this.rulesetConfig.card);
    if (resolution.winnerId) this.getPlayer(resolution.winnerId)?.winTrick();

    // The completed trick stays current (on the table) until the next one starts.
    this.completedTricks.push(trick);
    // The would-be winner leads next, also after a voided (Bomb) trick.
    this.currentPlayerIndex = this.players.findIndex((p) => p.id === resolution.leaderId);

    this.pendingEffects = deriveTrickEffects(
      trick.getResolvedPlays(),
      resolution,
      this.players.map((p) => p.id),
      this.isRoundOutOfCards()
    );

    const progress = this.advanceEffects([]);
    return {
      trickComplete: true,
      winnerId: resolution.winnerId,
      trick: { winnerId: resolution.winnerId, leaderId: resolution.leaderId, voided: resolution.voided },
      ...progress,
    };
  }

  private isRoundOutOfCards(): boolean {
    return this.players.every((p) => p.hand.length === 0);
  }

  /**
   * The last completed trick of this round (also what `currentTrick` shows at ROUND_END)
   */
  getLastCompletedTrick(): Trick | null {
    return this.completedTricks[this.completedTricks.length - 1] ?? null;
  }

  // ==========================================================================
  // Special-card effects (Juggler, Cloud, Witch)
  // ==========================================================================

  hasPendingEffects(): boolean {
    return this.pendingEffects.length > 0;
  }

  /** The effect currently waiting for input */
  getActiveEffect(): PendingTrickEffect | null {
    return this.pendingEffects[0] ?? null;
  }

  /** Players whose response the active effect is waiting for */
  getAwaitingEffectPlayerIds(): string[] {
    const effect = this.getActiveEffect();
    return effect ? getAwaitingPlayerIds(effect) : [];
  }

  /** Why a response to the active effect is not allowed, or null when it is */
  getEffectResponseError(playerId: string, response: TrickEffectResponse): string | null {
    const effect = this.getActiveEffect();
    if (this.phase !== GamePhase.PLAYING || !effect) return 'No special card effect to resolve';
    return validateEffectResponse(effect, playerId, response, createTrickEffectPort(this));
  }

  /** Answer the active special-card effect */
  resolveEffect(playerId: string, response: TrickEffectResponse): EffectProgress {
    this.assertNotPaused();
    const error = this.getEffectResponseError(playerId, response);
    if (error) throw new InvalidEffectResponseError(error);
    const effect = this.getActiveEffect() as PendingTrickEffect;

    const result = applyEffectResponse(effect, playerId, response, createTrickEffectPort(this));
    if (result.remaining) {
      this.pendingEffects[0] = result.remaining;
    } else {
      this.pendingEffects.shift();
    }
    return this.advanceEffects(result.outcome ? [result.outcome] : []);
  }

  /**
   * Resolve effects that have only one legal answer, then start the next trick
   * (or end the round) once nothing waits for input.
   */
  private advanceEffects(outcomes: TrickEffectOutcome[]): EffectProgress {
    const port = createTrickEffectPort(this);
    let effect = this.getActiveEffect();
    while (effect) {
      const awaiting = getAwaitingPlayerIds(effect);
      const forced = awaiting.length === 1 ? getForcedResponse(effect, port) : null;
      if (!forced) break;
      const result = applyEffectResponse(effect, awaiting[0], forced, port);
      if (result.outcome) outcomes.push(result.outcome);
      if (result.remaining) {
        this.pendingEffects[0] = result.remaining;
        break;
      }
      this.pendingEffects.shift();
      effect = this.getActiveEffect();
    }

    if (this.hasPendingEffects()) {
      this.restartTurnTimerForCurrentTurn();
      return { effectOutcomes: outcomes, awaitingEffects: true, roundComplete: false };
    }
    if (this.isRoundOutOfCards()) {
      this.completeRound();
      return { effectOutcomes: outcomes, awaitingEffects: false, roundComplete: true };
    }

    this.currentTrick = this.newTrick();
    this.restartTurnTimerForCurrentTurn();
    return { effectOutcomes: outcomes, awaitingEffects: false, roundComplete: false };
  }

  /**
   * Who the turn timer measures: the trump chooser, the single player a
   * special-card effect waits for, or the player whose turn it is.
   */
  protected getTimedPlayer(): Player | undefined {
    if (this.phase === GamePhase.TRUMP_SELECTION) return this.getTrumpChooser();
    const effect = this.getActiveEffect();
    if (effect) {
      // Simultaneous choices (Juggler) have no single player to time.
      const awaiting = getAwaitingPlayerIds(effect);
      return awaiting.length === 1 ? this.getPlayer(awaiting[0]) : undefined;
    }
    return this.players[this.currentPlayerIndex];
  }

  // ==========================================================================
  // Rematch
  // ==========================================================================

  /**
   * The next game at this table: same room, host, rules, adapters, lobby bans and seats (bots
   * keep their level); scores, rounds and history start over. A human who is not connected gets
   * the lobby grace period, so they either come back or the grace alarm frees their seat; they
   * never block the new lobby.
   */
  createRematch(): Game {
    if (this.phase !== GamePhase.GAME_END) throw new InvalidPhaseError(GamePhase.GAME_END, this.phase);
    const rematch = new Game(this.id, this.hostId, this.dependencies);
    rematch.setRulesetConfig(this.rulesetConfig);
    rematch.kickedPlayerIds = new Set(this.kickedPlayerIds);
    for (const player of this.players) {
      const seat = new Player(player.id, player.name, player.isBot, player.botDifficulty);
      seat.isConnected = player.isBot || player.isConnected;
      rematch.addPlayer(seat);
    }
    rematch.ensureHost();
    for (const seat of rematch.players) {
      if (!seat.isConnected) rematch.gracePlayer(seat.id);
    }
    return rematch;
  }

  // ==========================================================================
  // Serialization
  // ==========================================================================

  /**
   * Serialize to a plain object (copies; never aliases live state)
   */
  toJSON(): IGameState {
    return serializeGame(this, { bidsPlaced: this.getBidsPlaced(), forbiddenBid: this.getForbiddenBid() });
  }

  /**
   * Deserialize from a plain object
   */
  static fromJSON(data: IGameState, dependencies: GameDependencies = {}): Game {
    const game = new Game(data.id, data.hostId, dependencies);
    restoreGame(game, data);
    return game;
  }
}
