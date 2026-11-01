/* eslint-disable max-lines, complexity */
/**
 * Information Set Tracking for Bot AI
 *
 * Implements ISMCTS (Information Set Monte Carlo Tree Search) concepts:
 * - Tracks what cards each player CANNOT have (voids)
 * - Infers likely holdings from bids
 * - Enables valid determinization sampling
 *
 * References:
 * - "Information Set Monte Carlo Tree Search" (Cowling, Powley, Whitehouse 2012)
 * - "Improving State Evaluation in Trick-Based Card Games" (AAAI)
 *
 * Note: This file contains complex algorithmic implementations for imperfect information
 * game AI. Some methods exceed complexity limits due to the nature of Bayesian belief
 * updates and constraint-aware determinization algorithms.
 */

import { Card } from '../entities/card';
import { Suit, ALL_SUITS } from '../value-objects/card-types';
import { DEFAULT_CARD_RULES, type ICardRules } from '../value-objects/ruleset-config';
import { wouldTakeTrick } from './bot-rules';

/**
 * Opponent profile with inferred information
 */
export interface OpponentInfo {
  playerId: string;
  bid: number | null;
  tricksWon: number;

  // Definite information
  voidSuits: Set<Suit>;              // Suits they're definitely void in
  knownCards: Card[];                 // Cards we've seen them play

  // Inferred information
  estimatedWizards: number;           // Estimated wizards remaining
  estimatedHighTrumps: number;        // Estimated high trumps (10+)
  aggressiveness: number;             // Play style (0-1)
  trumpUsageRate: number;             // How liberally they use trump

  // Strategic state
  tricksNeeded: number;
  isDesparate: boolean;               // Needs every remaining trick
  isSatisfied: boolean;               // Has made their bid
  winProbability: number;             // Estimated P(makes bid)
}

/**
 * Information Set - tracks game state from our perspective
 */
export class InformationSet {
  // Cards we know the location of
  private seenCards: Set<string> = new Set();

  // Our hand
  private ourHand: Card[] = [];

  // Opponent information
  private opponents: Map<string, OpponentInfo> = new Map();

  // Trump information
  private trumpSuit: Suit | null = null;
  private trumpCard: Card | null = null;

  // The room's card rules (which Wizard / Jester takes a trick)
  private cardRules: ICardRules = DEFAULT_CARD_RULES;

  // Game state
  private currentRound: number = 1;
  private totalTricks: number = 0;

  constructor() {}

  /**
   * Initialize for a new round
   */
  initializeRound(params: {
    hand: Card[];
    trumpSuit: Suit | null;
    trumpCard: Card | null;
    playerIds: string[];
    ourPlayerId: string;
    roundNumber: number;
    /** The room's card rules (default: the classic rules). */
    cardRules?: ICardRules;
  }): void {
    const { hand, trumpSuit, trumpCard, playerIds, ourPlayerId, roundNumber } = params;
    this.seenCards.clear();
    this.ourHand = [...hand];
    this.trumpSuit = trumpSuit;
    this.trumpCard = trumpCard;
    this.cardRules = params.cardRules ?? DEFAULT_CARD_RULES;
    this.currentRound = roundNumber;
    this.totalTricks = hand.length;

    for (const card of hand) {
      this.seenCards.add(this.cardToKey(card));
    }

    if (trumpCard) {
      this.seenCards.add(this.cardToKey(trumpCard));
    }

    this.opponents.clear();
    for (const playerId of playerIds) {
      if (playerId !== ourPlayerId) {
        this.opponents.set(playerId, {
          playerId,
          bid: null,
          tricksWon: 0,
          voidSuits: new Set(),
          knownCards: [],
          estimatedWizards: 1, // Start with average expectation
          estimatedHighTrumps: 2,
          aggressiveness: 0.5,
          trumpUsageRate: 0.5,
          tricksNeeded: 0,
          isDesparate: false,
          isSatisfied: false,
          winProbability: 0.5,
        });
      }
    }
  }

  /**
   * Update when a bid is placed
   */
  recordBid(playerId: string, bid: number): void {
    const opponent = this.opponents.get(playerId);
    if (!opponent) return;

    opponent.bid = bid;
    opponent.tricksNeeded = bid;

    // Infer hand strength from bid
    // High bid relative to round = strong hand
    const bidRatio = bid / this.currentRound;

    if (bidRatio > 0.7) {
      // Aggressive bid suggests wizards and high trumps
      opponent.estimatedWizards = Math.min(4, Math.ceil(bid * 0.3));
      opponent.estimatedHighTrumps = Math.min(4, Math.ceil(bid * 0.4));
      opponent.aggressiveness = 0.7;
    } else if (bidRatio > 0.4) {
      opponent.estimatedWizards = Math.min(2, Math.ceil(bid * 0.2));
      opponent.estimatedHighTrumps = Math.min(3, Math.ceil(bid * 0.3));
      opponent.aggressiveness = 0.5;
    } else {
      // Conservative bid suggests weak hand
      opponent.estimatedWizards = Math.min(1, bid);
      opponent.estimatedHighTrumps = Math.min(1, bid);
      opponent.aggressiveness = 0.3;
    }

    this.updateWinProbability(opponent);
  }

  /**
   * Update when a card is played
   */
  recordCardPlayed(
    playerId: string,
    card: Card,
    leadSuit: Suit | null,
    wasLeading: boolean
  ): void {
    this.seenCards.add(this.cardToKey(card));

    const opponent = this.opponents.get(playerId);
    if (!opponent) return;

    opponent.knownCards.push(card);

    if (!wasLeading && leadSuit && !card.isWizard() && !card.isJester()) {
      if (card.suit !== leadSuit) {
        opponent.voidSuits.add(leadSuit);
      }
    }

    if (card.isWizard()) {
      opponent.estimatedWizards = Math.max(0, opponent.estimatedWizards - 1);
    }

    if (card.suit === this.trumpSuit && (card.value ?? 0) >= 10) {
      opponent.estimatedHighTrumps = Math.max(0, opponent.estimatedHighTrumps - 1);
    }

    this.updateAggressiveness(opponent, card, leadSuit, wasLeading);
  }

  /**
   * Update when a trick is won
   */
  recordTrickWon(winnerId: string): void {
    const opponent = this.opponents.get(winnerId);
    if (!opponent) return;

    opponent.tricksWon++;
    opponent.tricksNeeded = Math.max(0, (opponent.bid ?? 0) - opponent.tricksWon);
    opponent.isDesparate = opponent.tricksNeeded >= this.getRemainingTricks();
    opponent.isSatisfied = opponent.tricksNeeded <= 0;

    this.updateWinProbability(opponent);
  }

  /**
   * Update our own trick count (for context)
   */
  recordOurTrickWon(): void {
    this.totalTricks--;
  }

  /**
   * Get opponent profile
   */
  getOpponent(playerId: string): OpponentInfo | undefined {
    return this.opponents.get(playerId);
  }

  /**
   * Get all opponents
   */
  getAllOpponents(): OpponentInfo[] {
    return Array.from(this.opponents.values());
  }

  /**
   * Check if a player is known to be void in a suit
   */
  isVoidInSuit(playerId: string, suit: Suit): boolean {
    return this.opponents.get(playerId)?.voidSuits.has(suit) ?? false;
  }

  /**
   * Get suits a player is void in
   */
  getVoidSuits(playerId: string): Set<Suit> {
    return this.opponents.get(playerId)?.voidSuits ?? new Set();
  }

  /**
   * Check if a card has been seen
   */
  isCardSeen(card: Card): boolean {
    return this.seenCards.has(this.cardToKey(card));
  }

  /**
   * Get all unseen cards (for Monte Carlo sampling)
   */
  getUnseenCards(): Card[] {
    const unseen: Card[] = [];

    // Add unseen number cards
    for (const suit of ALL_SUITS) {
      for (let value = 1; value <= 13; value++) {
        const card = Card.createNumberCard(suit, value);
        if (!this.seenCards.has(this.cardToKey(card))) {
          unseen.push(card);
        }
      }
    }

    // Add unseen wizards and jesters
    // (simplified - in full implementation track specific ones)
    const seenWizards = Array.from(this.seenCards).filter(k => k.startsWith('WIZARD')).length;
    const seenJesters = Array.from(this.seenCards).filter(k => k.startsWith('JESTER')).length;

    for (let i = seenWizards; i < 4; i++) {
      unseen.push(Card.createWizard(i));
    }
    for (let i = seenJesters; i < 4; i++) {
      unseen.push(Card.createJester(i));
    }

    return unseen;
  }

  /**
   * Sample a valid determinization (possible opponent hands)
   *
   * Respects known constraints:
   * - Void suits (definite)
   * - Cards already played (definite)
   * - Hand sizes (definite)
   *
   * Plain random dealing can violate void constraints when cards are scarce, so this uses:
   * 1. Rejection sampling (try random, reject if invalid)
   * 2. Constraint propagation fallback (if rejection fails)
   *
   * Reference: Constraint Satisfaction in Card Game AI
   */
  sampleDeterminization(cardsPerPlayer: number): Map<string, Card[]> {
    // Try rejection sampling first (faster for most cases)
    const maxAttempts = 50;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = this.tryRandomDeterminization(cardsPerPlayer);
      if (result !== null) {
        return result;
      }
    }

    // Fall back to constraint-aware dealing
    return this.constraintAwareDeterminization(cardsPerPlayer);
  }

  /**
   * Try to create a valid determinization randomly
   * Returns null if constraints are violated
   */
  private tryRandomDeterminization(cardsPerPlayer: number): Map<string, Card[]> | null {
    const unseen = this.getUnseenCards();
    const shuffled = this.shuffleArray([...unseen]);
    const hands = new Map<string, Card[]>();

    let cardIndex = 0;

    for (const [playerId, opponent] of this.opponents) {
      const hand: Card[] = [];

      // Try to fill hand respecting constraints
      let attempts = 0;
      const maxLocalAttempts = shuffled.length - cardIndex;

      while (hand.length < cardsPerPlayer && attempts < maxLocalAttempts) {
        if (cardIndex >= shuffled.length) break;

        const card = shuffled[cardIndex];
        cardIndex++;
        attempts++;

        // Check if this card violates known constraints
        if (card.suit && opponent.voidSuits.has(card.suit)) {
          // Skip - opponent is void in this suit
          continue;
        }

        hand.push(card);
      }

      // If we couldn't fill the hand, this determinization is invalid
      if (hand.length < cardsPerPlayer) {
        return null;
      }

      hands.set(playerId, hand);
    }

    return hands;
  }

  /**
   * Create a determinization using constraint-aware dealing
   * This method always succeeds by distributing void-suited cards to other players
   */
  private constraintAwareDeterminization(cardsPerPlayer: number): Map<string, Card[]> {
    const unseen = this.getUnseenCards();
    const hands = new Map<string, Card[]>();
    const opponentList = Array.from(this.opponents.entries());

    // Initialize empty hands
    for (const [playerId] of opponentList) {
      hands.set(playerId, []);
    }

    // Separate cards by constraint compatibility
    // Cards that are void for some players need special handling
    const constrainedCards: Card[] = [];
    const unconstrainedCards: Card[] = [];

    for (const card of unseen) {
      const isConstrained = opponentList.some(([_, opp]) =>
        card.suit !== null && opp.voidSuits.has(card.suit)
      );

      if (isConstrained) {
        constrainedCards.push(card);
      } else {
        unconstrainedCards.push(card);
      }
    }

    // Shuffle both pools
    const shuffledConstrained = this.shuffleArray(constrainedCards);
    const shuffledUnconstrained = this.shuffleArray(unconstrainedCards);

    // First pass: distribute constrained cards to valid players only
    for (const card of shuffledConstrained) {
      // Find players who can receive this card (not void in its suit)
      const validPlayers = opponentList.filter(
        ([playerId, opp]) =>
          (hands.get(playerId)?.length ?? 0) < cardsPerPlayer &&
          (!card.suit || !opp.voidSuits.has(card.suit))
      );

      if (validPlayers.length > 0) {
        // Randomly choose among valid players
        const [playerId] = validPlayers[Math.floor(Math.random() * validPlayers.length)];
        const hand = hands.get(playerId);
        if (hand) hand.push(card);
      }
      // If no valid player exists, the card is "orphaned" - we'll handle this
    }

    // Second pass: distribute unconstrained cards to fill remaining slots
    let unconstrainedIndex = 0;
    for (const [playerId] of opponentList) {
      const hand = hands.get(playerId);
      if (!hand) continue;

      while (hand.length < cardsPerPlayer && unconstrainedIndex < shuffledUnconstrained.length) {
        hand.push(shuffledUnconstrained[unconstrainedIndex]);
        unconstrainedIndex++;
      }
    }

    // Final pass: if any hands are still short (constraint conflict), relax constraints
    // This should be rare, but ensures we always return valid hand sizes
    for (const [playerId] of opponentList) {
      const hand = hands.get(playerId);
      if (!hand) continue;

      while (hand.length < cardsPerPlayer && unconstrainedIndex < shuffledUnconstrained.length) {
        hand.push(shuffledUnconstrained[unconstrainedIndex]);
        unconstrainedIndex++;
      }

      // Absolute fallback: take any remaining constrained cards
      // (violates constraints, but better than invalid hand size)
      while (hand.length < cardsPerPlayer) {
        const remaining = shuffledConstrained.filter(
          c => !Array.from(hands.values()).flat().includes(c)
        );
        if (remaining.length === 0) break;
        hand.push(remaining[0]);
        shuffledConstrained.splice(shuffledConstrained.indexOf(remaining[0]), 1);
      }
    }

    return hands;
  }

  /**
   * Get count of desperate opponents (need every trick)
   */
  getDesperateOpponentCount(): number {
    return Array.from(this.opponents.values()).filter(o => o.isDesparate).length;
  }

  /**
   * Get count of satisfied opponents (made their bid)
   */
  getSatisfiedOpponentCount(): number {
    return Array.from(this.opponents.values()).filter(o => o.isSatisfied).length;
  }

  /**
   * Get remaining tricks in round
   */
  getRemainingTricks(): number {
    return this.totalTricks;
  }

  // Private helper methods

  private cardToKey(card: Card): string {
    // Use card's unique ID for consistent lookups
    // Wizards and Jesters have index-based IDs from creation
    return card.id;
  }

  private updateAggressiveness(
    opponent: OpponentInfo,
    card: Card,
    leadSuit: Suit | null,
    wasLeading: boolean
  ): void {
    const isHighCard = card.isWizard() ||
      (card.suit === this.trumpSuit && (card.value ?? 0) >= 10) ||
      (!card.isJester() && (card.value ?? 0) >= 12);

    // Playing high card when already satisfied = aggressive
    if (opponent.isSatisfied && isHighCard) {
      opponent.aggressiveness = Math.min(1, opponent.aggressiveness + 0.1);
    }

    // Playing low card when desperate = conservative
    if (opponent.isDesparate && !isHighCard && !card.isJester()) {
      opponent.aggressiveness = Math.max(0, opponent.aggressiveness - 0.1);
    }

    // Update trump usage rate
    if (card.suit === this.trumpSuit && !wasLeading && leadSuit !== this.trumpSuit) {
      opponent.trumpUsageRate = Math.min(1, opponent.trumpUsageRate + 0.15);
    }
  }

  /**
   * Update win probability with the binomial distribution:
   * P(X >= k) = Σ C(n,i) * p^i * (1-p)^(n-i) for i=k to n
   *   - Example: Need 2 of 3, winRate=0.6 → P=0.648
   *
   * A power law (successRate^needed) would be too pessimistic: 0.67² = 0.45.
   */
  private updateWinProbability(opponent: OpponentInfo): void {
    if (opponent.bid === null) {
      opponent.winProbability = 0.5;
      return;
    }

    const remaining = this.getRemainingTricks();
    const needed = opponent.tricksNeeded;

    if (needed <= 0) {
      // Already made bid - need to NOT win remaining tricks
      // P(win 0 of n) = (1-p)^n using binomial
      const loseRate = 0.4 + (1 - opponent.aggressiveness) * 0.2; // 0.4-0.6 based on play style
      opponent.winProbability = this.binomialCdf(0, remaining, 1 - loseRate);
    } else if (needed > remaining) {
      // Impossible to make bid
      opponent.winProbability = 0;
    } else {
      // Need k or more of n tricks - use binomial CDF
      // Base win rate derived from opponent strength indicators
      const baseWinRate = 0.5 + (opponent.aggressiveness - 0.5) * 0.2;

      // Adjust for estimated card strength
      const wizardBonus = Math.min(0.15, opponent.estimatedWizards * 0.05);
      const trumpBonus = Math.min(0.1, opponent.estimatedHighTrumps * 0.025);
      const adjustedWinRate = Math.min(0.85, baseWinRate + wizardBonus + trumpBonus);

      opponent.winProbability = this.binomialCdf(needed, remaining, adjustedWinRate);
    }
  }

  /**
   * Binomial coefficient: C(n, k) = n! / (k! * (n-k)!)
   */
  private binomialCoeff(n: number, k: number): number {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;

    // Use smaller k for efficiency
    if (k > n - k) k = n - k;

    let result = 1;
    for (let i = 0; i < k; i++) {
      result = (result * (n - i)) / (i + 1);
    }
    return Math.round(result);
  }

  /**
   * Binomial CDF: P(X >= k) where X ~ Binomial(n, p)
   * Sum of P(X = i) for i = k to n
   */
  private binomialCdf(k: number, n: number, p: number): number {
    if (k > n) return 0;
    if (k <= 0) return 1;

    let sum = 0;
    for (let i = k; i <= n; i++) {
      sum += this.binomialCoeff(n, i) * Math.pow(p, i) * Math.pow(1 - p, n - i);
    }
    return Math.min(1, Math.max(0, sum));
  }

  /**
   * Bayesian update of card probability estimates
   *
   * Key insight: When an opponent plays a card, it reveals information about
   * what cards they DON'T have. If they needed to win and played low, they
   * likely don't have high cards.
   *
   * Bayes rule:
   *   P(has card X | played card Y) = P(played Y | has X) * P(has X) / P(played Y)
   *
   * Where:
   *   - P(has X) = prior probability (based on previous estimate)
   *   - P(played Y | has X) = likelihood of playing Y given they have X
   *   - P(played Y) = marginal probability of playing Y
   *
   * Reference: "Modeling Other Players with Bayesian Beliefs" (arXiv:2405.14122)
   */
  updateBayesianBeliefs(
    playerId: string,
    playedCard: Card,
    leadSuit: Suit | null,
    currentTrickCards: { playerId: string; card: Card }[],
    wasLeading: boolean
  ): void {
    const opponent = this.opponents.get(playerId);
    if (!opponent) return;

    // Calculate if this play was "optimal" given their situation
    const tricksNeeded = opponent.tricksNeeded;
    const tricksRemaining = this.getRemainingTricks();

    // Did they need to win this trick?
    const neededToWin = tricksNeeded > 0 && tricksNeeded >= tricksRemaining;

    // Did they need to AVOID winning?
    const neededToLose = tricksNeeded <= 0;

    // Determine if the played card could win the current trick
    const couldWin = this.cardCouldWinTrick(playedCard, currentTrickCards, leadSuit);
    const isHighCard = playedCard.isWizard() ||
      (playedCard.suit === this.trumpSuit && (playedCard.value ?? 0) >= 10) ||
      (!playedCard.isJester() && (playedCard.value ?? 0) >= 11);

    // ========================================================================
    // Bayesian updates
    // ========================================================================

    // Calculate prior probabilities
    const cardsPlayed = opponent.knownCards.length;
    const cardsRemaining = Math.max(1, this.currentRound - cardsPlayed);
    const priorHasWizard = Math.min(1, opponent.estimatedWizards / cardsRemaining);
    const priorHasHighTrump = Math.min(1, opponent.estimatedHighTrumps / cardsRemaining);

    // Bayesian update for wizard holdings
    if (neededToWin && !couldWin && !isHighCard) {
      // They needed to win but played a losing card
      // Apply Bayes rule: P(has wizard | played low) = P(played low | has wizard) * P(wizard) / P(low)

      // Likelihood: P(played low | has wizard)
      // A rational player with wizard would save it ~15% of the time (strategic hold)
      const pPlayedLowGivenWizard = 0.15;

      // Likelihood: P(played low | no wizard)
      // Without wizard, ~85% chance they play low when losing
      const pPlayedLowGivenNoWizard = 0.85;

      // Marginal: P(played low) = P(low|wizard)*P(wizard) + P(low|no wizard)*P(no wizard)
      const pPlayedLow = pPlayedLowGivenWizard * priorHasWizard +
                         pPlayedLowGivenNoWizard * (1 - priorHasWizard);

      // Posterior: P(has wizard | played low)
      const posteriorHasWizard = pPlayedLow > 0
        ? (pPlayedLowGivenWizard * priorHasWizard) / pPlayedLow
        : priorHasWizard;

      // Update estimate: convert probability back to expected count
      opponent.estimatedWizards = posteriorHasWizard * cardsRemaining;

      // Same Bayesian update for high trumps
      const pPlayedLowGivenHighTrump = 0.20; // Might save trump
      const pPlayedLowGivenNoHighTrump = 0.80;

      const pPlayedLowTrump = pPlayedLowGivenHighTrump * priorHasHighTrump +
                              pPlayedLowGivenNoHighTrump * (1 - priorHasHighTrump);

      const posteriorHasHighTrump = pPlayedLowTrump > 0
        ? (pPlayedLowGivenHighTrump * priorHasHighTrump) / pPlayedLowTrump
        : priorHasHighTrump;

      opponent.estimatedHighTrumps = posteriorHasHighTrump * cardsRemaining;
    }

    if (neededToWin && playedCard.isWizard()) {
      // They used a wizard when desperate - strong evidence it was their best card
      // Bayes: P(has another wizard | used wizard when desperate)

      // Likelihood: P(used wizard | has 2+ wizards)
      // With multiple wizards, ~60% chance they use one when desperate
      const pUsedWizardGivenMultiple = 0.60;

      // Likelihood: P(used wizard | has exactly 1 wizard)
      // With only one wizard, ~95% chance they use it when desperate
      const pUsedWizardGivenOne = 0.95;

      // Prior: probability they had multiple wizards
      const priorMultipleWizards = Math.min(0.5, opponent.estimatedWizards / 2);

      // Marginal: P(used wizard)
      const pUsedWizard = pUsedWizardGivenMultiple * priorMultipleWizards +
                          pUsedWizardGivenOne * (1 - priorMultipleWizards);

      // Posterior: P(had multiple | used wizard)
      const posteriorMultiple = pUsedWizard > 0
        ? (pUsedWizardGivenMultiple * priorMultipleWizards) / pUsedWizard
        : 0;

      // Expected remaining wizards = P(multiple) * 1 + P(single) * 0
      opponent.estimatedWizards = Math.max(0, posteriorMultiple * 1);
    }

    if (neededToLose && couldWin && isHighCard) {
      // They played a winning card when they didn't need to
      // Either aggressive play style or forced to
      if (leadSuit && playedCard.suit !== leadSuit) {
        // They were forced to play off-suit - void detection handles this
      } else {
        // Bayes update for aggressiveness
        // P(aggressive | played high when satisfied)
        const priorAggressive = opponent.aggressiveness;

        const pPlayedHighGivenAggressive = 0.70;
        const pPlayedHighGivenConservative = 0.25;

        const pPlayedHigh = pPlayedHighGivenAggressive * priorAggressive +
                            pPlayedHighGivenConservative * (1 - priorAggressive);

        const posteriorAggressive = pPlayedHigh > 0
          ? (pPlayedHighGivenAggressive * priorAggressive) / pPlayedHigh
          : priorAggressive;

        opponent.aggressiveness = posteriorAggressive;
      }
    }

    // Update trump usage patterns using Bayesian inference
    if (playedCard.suit === this.trumpSuit && !playedCard.isWizard()) {
      const priorTrumpUsage = opponent.trumpUsageRate;

      if (wasLeading) {
        // Leading trump - update aggressiveness belief
        const pLeadTrumpGivenAggressive = 0.40;
        const pLeadTrumpGivenConservative = 0.15;

        const pLeadTrump = pLeadTrumpGivenAggressive * priorTrumpUsage +
                           pLeadTrumpGivenConservative * (1 - priorTrumpUsage);

        const posteriorTrumpUsage = pLeadTrump > 0
          ? (pLeadTrumpGivenAggressive * priorTrumpUsage) / pLeadTrump
          : priorTrumpUsage;

        opponent.trumpUsageRate = posteriorTrumpUsage;
      } else if (leadSuit && leadSuit !== this.trumpSuit) {
        // Trumping in - strong evidence of trump usage tendency
        const pTrumpInGivenLiberal = 0.85;
        const pTrumpInGivenConservative = 0.50;

        const pTrumpIn = pTrumpInGivenLiberal * priorTrumpUsage +
                         pTrumpInGivenConservative * (1 - priorTrumpUsage);

        const posteriorTrumpUsage = pTrumpIn > 0
          ? (pTrumpInGivenLiberal * priorTrumpUsage) / pTrumpIn
          : priorTrumpUsage;

        opponent.trumpUsageRate = posteriorTrumpUsage;
      }
    }
  }

  /**
   * Check if a card could take the current trick (the shared trick rules decide)
   */
  private cardCouldWinTrick(
    card: Card,
    currentTrickCards: { playerId: string; card: Card }[],
    _leadSuit: Suit | null
  ): boolean {
    return wouldTakeTrick(currentTrickCards.map((played) => played.card), card, this.trumpSuit, this.cardRules);
  }

  /**
   * Get probability that opponent holds a specific card type
   * Uses Bayesian reasoning with known information
   */
  getCardProbability(
    playerId: string,
    cardType: 'wizard' | 'highTrump' | 'anyTrump'
  ): number {
    const opponent = this.opponents.get(playerId);
    if (!opponent) return 0.25; // Default

    const cardsPlayed = opponent.knownCards.length;
    const cardsRemaining = this.currentRound - cardsPlayed;
    if (cardsRemaining <= 0) return 0;

    switch (cardType) {
      case 'wizard':
        // P(has wizard) based on estimated count and cards remaining
        return Math.min(1, opponent.estimatedWizards / cardsRemaining);

      case 'highTrump':
        return Math.min(1, opponent.estimatedHighTrumps / cardsRemaining);

      case 'anyTrump':
        // If void in trump, probability is 0
        if (this.trumpSuit && opponent.voidSuits.has(this.trumpSuit)) {
          return 0;
        }
        // Estimate based on high trump count + some lower trumps
        const estimatedTrumps = opponent.estimatedHighTrumps * 1.5;
        return Math.min(1, estimatedTrumps / cardsRemaining);
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

/**
 * Factory function to create an information set
 */
export function createInformationSet(): InformationSet {
  return new InformationSet();
}
