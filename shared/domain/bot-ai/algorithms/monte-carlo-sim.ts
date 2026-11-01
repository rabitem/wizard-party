/**
 * Monte Carlo Simulation for Bidding Estimation
 *
 * Implements proper determinization-based Monte Carlo sampling:
 * - Samples possible opponent hands respecting constraints
 * - Simulates full rounds of play
 * - Uses heuristic play policies for realistic estimates
 *
 * This is the CORRECT way to do Monte Carlo for bidding estimation,
 * not just adding random noise to a base calculation.
 *
 * References:
 * - "Information Set Monte Carlo Tree Search" (Cowling et al. 2012)
 * - "Determinization in Card Games" (Hearts thesis, Utrecht)
 */

import { Card } from '../../entities/card';
import { Suit, ALL_SUITS } from '../../value-objects/card-types';
import type { ICardRules } from '../../value-objects/ruleset-config';
import { PENDING_LEAD, type TrickLead } from '../../expansions/trick-lead';
import { GameContext } from '../types';
import { InformationSet, createInformationSet } from '../information-set';
import { isBudgetExhausted } from '../decision-budget';
import { leadAfterCard, legalCards, suitToFollow, trickWinnerId } from '../bot-rules';
import {
  getWinningCards,
  getLosingCards,
  getHighestCard,
  getLowestCard,
  orderPlayersFromLeader,
} from './card-comparison-utils';
import {
  fallbackEstimate,
  calculateVariance,
  shuffleArray,
  getFirstPlayer,
} from './monte-carlo-utils';

/**
 * Result of a Monte Carlo simulation run
 */
export interface SimulationResult {
  /** Number of tricks won in this simulation */
  tricksWon: number;

  /** Confidence in this result (based on constraint satisfaction) */
  confidence: number;

  /** Whether simulation completed successfully */
  success: boolean;
}

/**
 * Configuration for Monte Carlo bidding simulation
 */
export interface MonteCarloConfig {
  /** Number of simulations to run */
  numSimulations: number;

  /** Maximum attempts to generate valid determinization */
  maxDeterminizationAttempts: number;

  /** Whether to use smart play policy (vs random) */
  useSmartPolicy: boolean;

  /** Trim percentage for robust mean estimation */
  trimPercent: number;
}

/**
 * Default Monte Carlo configuration
 */
export const DEFAULT_MC_CONFIG: MonteCarloConfig = {
  numSimulations: 500,
  maxDeterminizationAttempts: 100,
  useSmartPolicy: true,
  trimPercent: 0.1,
};

/**
 * Simulated player in Monte Carlo
 */
interface SimPlayer {
  id: string;
  hand: Card[];
  bid: number;
  tricksWon: number;
  tricksNeeded: number;
  voidSuits: Set<Suit>;
}

/**
 * Monte Carlo Bidding Simulator
 *
 * Simulates full rounds of Wizard to estimate expected tricks.
 */
export class MonteCarloBiddingSimulator {
  private config: MonteCarloConfig;

  constructor(config: Partial<MonteCarloConfig> = {}) {
    this.config = { ...DEFAULT_MC_CONFIG, ...config };
  }

  /**
   * Estimate expected tricks for bidding using Monte Carlo simulation
   *
   * @param context - Current game context
   * @param informationSet - What we know about opponent hands
   * @returns Expected number of tricks (and confidence)
   */
  estimateBid(
    context: GameContext,
    informationSet?: InformationSet
  ): { expectedTricks: number; confidence: number; distribution: number[] } {
    const results: SimulationResult[] = [];
    const tricksDistribution: number[] = [];

    // Initialize information set if not provided
    const infoSet = informationSet || this.createDefaultInfoSet(context);

    // Anytime: stop sampling at the decision deadline (at least one sample runs).
    let attempts = 0;
    for (let i = 0; i < this.config.numSimulations; i++) {
      if (i > 0 && isBudgetExhausted(context.budget)) break;
      attempts++;
      const result = this.runSimulation(context, infoSet);

      if (result.success) {
        results.push(result);
        tricksDistribution.push(result.tricksWon);
      }
    }

    if (results.length === 0) {
      // Fallback to simple heuristic if simulations fail
      return {
        expectedTricks: fallbackEstimate(context),
        confidence: 0.3,
        distribution: [fallbackEstimate(context)],
      };
    }

    // Use trimmed mean for robust estimation
    tricksDistribution.sort((a, b) => a - b);
    const trimCount = Math.floor(tricksDistribution.length * this.config.trimPercent);
    const trimmedResults = tricksDistribution.slice(trimCount, -trimCount || undefined);

    const mean = trimmedResults.reduce((a, b) => a + b, 0) / trimmedResults.length;
    const median = trimmedResults[Math.floor(trimmedResults.length / 2)];

    // Blend mean and median for stability
    const expectedTricks = (mean + median) / 2;

    // Confidence based on variance and success rate
    const variance = calculateVariance(trimmedResults, mean);
    const successRate = results.length / Math.max(1, attempts);
    const confidence = successRate * Math.exp(-variance / 4);

    return {
      expectedTricks,
      confidence,
      distribution: tricksDistribution,
    };
  }

  /**
   * Run a single Monte Carlo simulation
   */
  private runSimulation(
    context: GameContext,
    infoSet: InformationSet
  ): SimulationResult {
    // 1. Sample a determinization (assign hands to opponents)
    const determinization = this.sampleDeterminization(context, infoSet);

    if (!determinization) {
      return { tricksWon: 0, confidence: 0, success: false };
    }

    // 2. Create simulation state
    const players = this.createSimPlayers(context, determinization);
    const ourPlayer = players.find(p => p.id === context.playerId);
    if (!ourPlayer) {
      return { tricksWon: 0, confidence: 0, success: false };
    }

    // 3. Simulate all tricks
    let currentLeader = getFirstPlayer(players, context.dealerPosition);

    for (let trick = 0; trick < context.hand.length; trick++) {
      const trickResult = this.simulateTrick(
        players,
        currentLeader,
        context.trumpSuit,
        context.cardRules
      );

      // Update trick counts
      const winner = players.find(p => p.id === trickResult.winnerId);
      if (winner) {
        winner.tricksWon++;
        winner.tricksNeeded = Math.max(0, winner.bid - winner.tricksWon);
        currentLeader = winner.id;
      }
    }

    return {
      tricksWon: ourPlayer.tricksWon,
      confidence: 1.0,
      success: true,
    };
  }

  /**
   * Sample a valid determinization respecting constraints
   */
  private sampleDeterminization(
    context: GameContext,
    infoSet: InformationSet
  ): Map<string, Card[]> | null {
    for (let attempt = 0; attempt < this.config.maxDeterminizationAttempts; attempt++) {
      const determinization = this.tryCreateDeterminization(context, infoSet);

      if (determinization) {
        return determinization;
      }
    }

    return null;
  }

  /**
   * Attempt to create a valid determinization
   */
  private tryCreateDeterminization(
    context: GameContext,
    infoSet: InformationSet
  ): Map<string, Card[]> | null {
    const hands = new Map<string, Card[]>();
    const unseenCards = this.getUnseenCards(context, infoSet);
    const shuffled = shuffleArray([...unseenCards]);

    // Our hand is known
    hands.set(context.playerId, [...context.hand]);

    // Every other seat (also those who have not bid yet)
    const opponentIds = context.playerIds.filter(id => id !== context.playerId);

    let cardIndex = 0;
    const cardsPerPlayer = context.hand.length;

    for (const opponentId of opponentIds) {
      const hand: Card[] = [];
      const voidSuits = infoSet.getVoidSuits(opponentId);

      // Deal cards respecting void constraints
      while (hand.length < cardsPerPlayer && cardIndex < shuffled.length) {
        const card = shuffled[cardIndex];
        cardIndex++;

        // Check void constraint
        if (card.suit && voidSuits.has(card.suit)) {
          // Put card back at end for another player
          shuffled.push(card);
          continue;
        }

        hand.push(card);
      }

      if (hand.length < cardsPerPlayer) {
        // Couldn't satisfy constraints - try again
        return null;
      }

      hands.set(opponentId, hand);
    }

    return hands;
  }

  /**
   * Get all unseen cards
   */
  private getUnseenCards(context: GameContext, infoSet: InformationSet): Card[] {
    const seen = new Set<string>();

    // Our hand is seen
    for (const card of context.hand) {
      seen.add(card.id);
    }

    // Trump card if revealed
    if (context.trumpCard) {
      seen.add(context.trumpCard.id);
    }

    // Cards played in completed tricks
    for (const trick of context.completedTricks) {
      for (const playedCard of trick) {
        seen.add(Card.fromJSON(playedCard.card).id);
      }
    }

    // Current trick cards
    for (const playedCard of context.currentTrickCards) {
      seen.add(Card.fromJSON(playedCard.card).id);
    }

    // Generate all possible cards and filter out seen ones
    const unseen: Card[] = [];

    // Number cards
    for (const suit of ALL_SUITS) {
      for (let value = 1; value <= 13; value++) {
        const card = Card.createNumberCard(suit, value);
        if (!seen.has(card.id)) {
          unseen.push(card);
        }
      }
    }

    // Wizards and Jesters
    for (let i = 0; i < 4; i++) {
      const wizard = Card.createWizard(i);
      if (!seen.has(wizard.id)) {
        unseen.push(wizard);
      }

      const jester = Card.createJester(i);
      if (!seen.has(jester.id)) {
        unseen.push(jester);
      }
    }

    return unseen;
  }

  /**
   * Create simulation players from determinization
   */
  private createSimPlayers(
    context: GameContext,
    determinization: Map<string, Card[]>
  ): SimPlayer[] {
    const players: SimPlayer[] = [];

    // Seat order, so the dealer position and the turn order mean what they say.
    for (const playerId of context.playerIds) {
      const hand = determinization.get(playerId);
      if (!hand) continue;
      const bid = context.playerBids.get(playerId) ?? 0;

      players.push({
        id: playerId,
        hand: [...hand],
        bid,
        tricksWon: 0,
        tricksNeeded: bid,
        voidSuits: new Set(),
      });
    }

    return players;
  }

  /**
   * Simulate a single trick
   */
  private simulateTrick(
    players: SimPlayer[],
    leaderId: string,
    trumpSuit: Suit | null,
    cardRules: ICardRules
  ): { winnerId: string; cards: Card[] } {
    const playedCards: { playerId: string; card: Card }[] = [];
    let lead: TrickLead = PENDING_LEAD;

    // Reorder players so leader goes first
    const orderedPlayers = orderPlayersFromLeader(players, leaderId);

    for (const player of orderedPlayers) {
      const card = this.selectCardToPlay(player, lead, trumpSuit, playedCards, cardRules);

      // Remove card from hand
      const cardIndex = player.hand.findIndex(c => c.id === card.id);
      if (cardIndex >= 0) {
        player.hand.splice(cardIndex, 1);
      }

      // A number card off the suit to follow shows the player is void in it
      const followSuit = suitToFollow(lead);
      if (followSuit && card.isNumberCard() && card.suit !== followSuit) {
        player.voidSuits.add(followSuit);
      }

      lead = leadAfterCard(lead, card);
      playedCards.push({ playerId: player.id, card });
    }

    // Determine winner
    const winnerId = trickWinnerId(playedCards, trumpSuit, cardRules);

    return {
      winnerId,
      cards: playedCards.map(pc => pc.card),
    };
  }

  /**
   * Select a card to play using heuristic policy
   */
  private selectCardToPlay(
    player: SimPlayer,
    lead: TrickLead,
    trumpSuit: Suit | null,
    currentTrick: { playerId: string; card: Card }[],
    cardRules: ICardRules
  ): Card {
    const playableCards = legalCards(player.hand, lead);

    if (playableCards.length === 0) {
      throw new Error('No playable cards');
    }

    if (playableCards.length === 1) {
      return playableCards[0];
    }

    if (!this.config.useSmartPolicy) {
      // Random selection
      return playableCards[Math.floor(Math.random() * playableCards.length)];
    }

    // Smart heuristic policy
    return this.smartSelectCard(player, playableCards, trumpSuit, currentTrick, cardRules);
  }

  /**
   * Smart card selection based on game state
   */
  private smartSelectCard(
    player: SimPlayer,
    playableCards: Card[],
    trumpSuit: Suit | null,
    currentTrick: { playerId: string; card: Card }[],
    cardRules: ICardRules
  ): Card {
    // Determine objective
    const needsToWin = player.tricksNeeded > 0;
    const isLeading = currentTrick.length === 0;

    if (needsToWin) {
      if (isLeading) {
        // Lead with winning cards
        // Prefer Wizard if we have one and need guaranteed trick
        const wizards = playableCards.filter(c => c.isWizard());
        if (wizards.length > 0 && player.tricksNeeded <= wizards.length) {
          return wizards[0];
        }

        // Lead high trump
        const highTrumps = playableCards
          .filter(c => c.suit === trumpSuit && !c.isWizard() && (c.value ?? 0) >= 10);
        if (highTrumps.length > 0) {
          return getHighestCard(highTrumps);
        }

        // Lead highest card
        return getHighestCard(playableCards);
      } 
        // Try to win the trick
        const winningCards = getWinningCards(playableCards, currentTrick, trumpSuit, cardRules);

        if (winningCards.length > 0) {
          // Play lowest winning card
          return getLowestCard(winningCards);
        }

        // Can't win - play lowest card
        return getLowestCard(playableCards);
      
    } 
      // Don't need to win - play low
      if (isLeading) {
        // Lead with jester or low card
        const jesters = playableCards.filter(c => c.isJester());
        if (jesters.length > 0) {
          return jesters[0];
        }

        return getLowestCard(playableCards);
      } 
        // Follow with low card, avoid winning
        const losingCards = getLosingCards(playableCards, currentTrick, trumpSuit, cardRules);

        if (losingCards.length > 0) {
          // Play highest losing card (preserve low cards)
          return getHighestCard(losingCards);
        }

        // Must play winning card - play lowest
        return getLowestCard(playableCards);
      
    
  }

  /**
   * Create default information set from context
   */
  private createDefaultInfoSet(context: GameContext): InformationSet {
    const infoSet = createInformationSet();

    // Initialize with known information
    infoSet.initializeRound({
      hand: context.hand,
      trumpSuit: context.trumpSuit,
      trumpCard: context.trumpCard,
      playerIds: context.playerIds,
      ourPlayerId: context.playerId,
      roundNumber: context.currentRound,
      cardRules: context.cardRules,
    });

    // Record known bids
    for (const [playerId, bid] of context.playerBids) {
      if (playerId !== context.playerId) {
        infoSet.recordBid(playerId, bid);
      }
    }

    return infoSet;
  }
}

/**
 * Factory function
 */
export function createMonteCarloBiddingSimulator(
  config?: Partial<MonteCarloConfig>
): MonteCarloBiddingSimulator {
  return new MonteCarloBiddingSimulator(config);
}
