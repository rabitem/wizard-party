/**
 * Phase Manager
 * Single responsibility: Handle game phase transitions and phase-related queries
 */

import { Suit, CardType } from '../value-objects/card-types';
import { GamePhase, canTransitionPhase } from '../value-objects/game-phase';
import { getCardDefinition, TrumpRevealOutcome } from '../expansions/card-definitions';

/**
 * Alias of GamePhase (value-objects/game-phase.ts), kept for existing imports.
 */
export { GamePhase as GamePhaseValue };

// Card shape for trump determination (avoids importing Card class)
interface ICardLike {
  type: CardType;
  suit: Suit | null;
}

/**
 * Phases where the game is considered "active" (can be paused)
 */
export const ACTIVE_PHASES: ReadonlySet<string> = new Set([
  GamePhase.DEALING,
  GamePhase.TRUMP_SELECTION,
  GamePhase.BIDDING,
  GamePhase.PLAYING,
  GamePhase.ROUND_END,
]);

/**
 * Phases where players can join
 */
export const JOINABLE_PHASES: ReadonlySet<string> = new Set([
  GamePhase.LOBBY,
]);

/**
 * Phases where the game is in progress
 */
export const IN_PROGRESS_PHASES: ReadonlySet<string> = new Set([
  GamePhase.DEALING,
  GamePhase.TRUMP_SELECTION,
  GamePhase.BIDDING,
  GamePhase.PLAYING,
]);

export interface TrumpDeterminationResult {
  trumpSuit: Suit | null;
  nextPhase: string;
  dealerMustChoose: boolean;
}

/**
 * Phase Manager domain service - stateless functions for phase logic
 */
export class PhaseManager {
  /**
   * Check if game is in an active (pausable) state
   */
  static isActivePhase(phase: string): boolean {
    return ACTIVE_PHASES.has(phase);
  }

  /**
   * Check if players can join the game
   */
  static canPlayersJoin(phase: string): boolean {
    return JOINABLE_PHASES.has(phase);
  }

  /**
   * Check if game is in progress
   */
  static isInProgress(phase: string): boolean {
    return IN_PROGRESS_PHASES.has(phase);
  }

  /**
   * Check if game has ended
   */
  static hasEnded(phase: string): boolean {
    return phase === GamePhase.GAME_END;
  }

  /**
   * Check if game is paused
   */
  static isPaused(phase: string): boolean {
    return phase === GamePhase.PAUSED;
  }

  /**
   * Determine trump suit and next phase based on revealed trump card
   */
  static determineTrump(trumpCard: ICardLike | null): TrumpDeterminationResult {
    // No card turned up (classic last round): no trump
    const outcome = trumpCard
      ? getCardDefinition(trumpCard.type).trumpReveal
      : TrumpRevealOutcome.NO_TRUMP;

    if (outcome === TrumpRevealOutcome.DEALER_CHOOSES) {
      return {
        trumpSuit: null,
        nextPhase: GamePhase.TRUMP_SELECTION,
        dealerMustChoose: true,
      };
    }

    return {
      trumpSuit: outcome === TrumpRevealOutcome.OWN_SUIT ? trumpCard?.suit ?? null : null,
      nextPhase: GamePhase.BIDDING,
      dealerMustChoose: false,
    };
  }

  /**
   * Get the next phase after bidding completes
   */
  static getPhaseAfterBidding(): string {
    return GamePhase.PLAYING;
  }

  /**
   * Get the phase after a round completes
   */
  static getPhaseAfterRound(currentRound: number, maxRounds: number): string {
    if (currentRound >= maxRounds) {
      return GamePhase.GAME_END;
    }
    return GamePhase.ROUND_END;
  }

  /**
   * Validate phase transition (the table in value-objects/game-phase.ts the Game uses)
   */
  static canTransitionTo(currentPhase: string, targetPhase: string): boolean {
    return canTransitionPhase(currentPhase, targetPhase);
  }
}
