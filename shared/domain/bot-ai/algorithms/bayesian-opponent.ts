/**
 * Bayesian Opponent Modeling
 *
 * Uses Bayesian inference to maintain probability distributions
 * over opponent hands based on observed actions.
 *
 * Key concepts:
 * - Prior: Initial belief about opponent hands (uniform)
 * - Likelihood: P(action | hand) - how likely this action given hand
 * - Posterior: P(hand | action) ∝ P(action | hand) × P(hand)
 *
 * References:
 * - "Opponent Modeling in Poker" (Billings et al.)
 * - "Bayesian Inference in Card Games" (various)
 */

import { Card } from '../../entities/card';
import { Suit } from '../../value-objects/card-types';

/**
 * Abstract hand representation for probability tracking
 * (Can't track all possible hands - too many)
 */
interface HandCategory {
  /** Number of wizards (0-4) */
  wizards: number;

  /** Number of jesters (0-4) */
  jesters: number;

  /** Trump cards by strength category */
  trumpStrength: 'none' | 'weak' | 'medium' | 'strong';

  /** Number of void suits (0-4) */
  voidSuits: number;

  /** Overall hand strength for bidding */
  bidStrength: number; // Expected tricks
}


/**
 * Opponent belief state
 */
interface OpponentBelief {
  playerId: string;

  /** Probability distribution over hand categories */
  handDistribution: Map<string, number>;

  /** Known void suits (definite information) */
  knownVoids: Set<Suit>;

  /** Estimated remaining wizards */
  expectedWizards: number;

  /** Estimated remaining high trumps (10+) */
  expectedHighTrumps: number;

  /** Bid placed */
  bid: number | null;

  /** Tricks won so far */
  tricksWon: number;

  /** Cards played (observed) */
  cardsPlayed: Card[];

  /** Aggressiveness estimate (0-1) */
  aggressiveness: number;

  /** How desperate they are (need every remaining trick) */
  desperation: number;
}

/**
 * Configuration for Bayesian modeling
 */
export interface BayesianConfig {
  /** Number of hand categories to track */
  numCategories: number;

  /** Minimum probability to keep a category */
  pruneThreshold: number;

  /** Smoothing factor to prevent zero probabilities */
  smoothingFactor: number;
}

/**
 * Default Bayesian configuration
 */
export const DEFAULT_BAYESIAN_CONFIG: BayesianConfig = {
  numCategories: 50,
  pruneThreshold: 0.001,
  smoothingFactor: 0.01,
};

/**
 * Bayesian Opponent Model
 */
export class BayesianOpponentModel {
  private beliefs: Map<string, OpponentBelief> = new Map();
  private config: BayesianConfig;
  private trumpSuit: Suit | null = null;
  private currentRound: number = 1;

  constructor(config: Partial<BayesianConfig> = {}) {
    this.config = { ...DEFAULT_BAYESIAN_CONFIG, ...config };
  }

  /**
   * Initialize beliefs for a new round
   */
  initializeRound(
    opponentIds: string[],
    trumpSuit: Suit | null,
    roundNumber: number
  ): void {
    this.trumpSuit = trumpSuit;
    this.currentRound = roundNumber;
    this.beliefs.clear();

    for (const playerId of opponentIds) {
      this.beliefs.set(playerId, this.createInitialBelief(playerId));
    }
  }

  /**
   * Create initial uniform belief for an opponent
   */
  private createInitialBelief(playerId: string): OpponentBelief {
    // Generate hand categories
    const distribution = new Map<string, number>();
    const categories = this.generateHandCategories();

    // Uniform prior
    const uniformProb = 1 / categories.length;
    for (const cat of categories) {
      distribution.set(this.categoryToKey(cat), uniformProb);
    }

    return {
      playerId,
      handDistribution: distribution,
      knownVoids: new Set(),
      expectedWizards: 1, // Prior expectation
      expectedHighTrumps: 2,
      bid: null,
      tricksWon: 0,
      cardsPlayed: [],
      aggressiveness: 0.5,
      desperation: 0,
    };
  }

  /**
   * Update beliefs based on an observed bid
   */
  updateFromBid(playerId: string, bid: number, position: number): void {
    const belief = this.beliefs.get(playerId);
    if (!belief) return;

    belief.bid = bid;

    // Calculate likelihood P(bid | hand_category) for each category
    const newDistribution = new Map<string, number>();
    let totalProb = 0;

    for (const [key, priorProb] of belief.handDistribution) {
      const category = this.keyToCategory(key);
      const likelihood = this.calculateBidLikelihood(bid, category, position);

      // Bayes' rule: posterior ∝ likelihood × prior
      const posteriorProb = likelihood * priorProb;
      newDistribution.set(key, posteriorProb);
      totalProb += posteriorProb;
    }

    // Normalize
    if (totalProb > 0) {
      for (const [key, prob] of newDistribution) {
        newDistribution.set(key, prob / totalProb);
      }
    }

    // Prune low probability categories and add smoothing
    this.pruneAndSmooth(newDistribution);

    belief.handDistribution = newDistribution;

    // Update aggregate estimates
    this.updateAggregateEstimates(belief);
  }

  /**
   * Update beliefs based on a card play
   */
  updateFromPlay(
    playerId: string,
    card: Card,
    leadSuit: Suit | null,
    wasLeading: boolean,
    trickWon: boolean
  ): void {
    const belief = this.beliefs.get(playerId);
    if (!belief) return;

    belief.cardsPlayed.push(card);

    if (trickWon) {
      belief.tricksWon++;
    }

    // Definite void inference
    if (!wasLeading && leadSuit && !card.isWizard() && !card.isJester()) {
      if (card.suit !== leadSuit) {
        belief.knownVoids.add(leadSuit);
      }
    }

    // Update wizard count
    if (card.isWizard()) {
      belief.expectedWizards = Math.max(0, belief.expectedWizards - 1);
    }

    // Update high trump count
    if (card.suit === this.trumpSuit && (card.value ?? 0) >= 10) {
      belief.expectedHighTrumps = Math.max(0, belief.expectedHighTrumps - 1);
    }

    // Bayesian update on hand distribution
    const newDistribution = new Map<string, number>();
    let totalProb = 0;

    for (const [key, priorProb] of belief.handDistribution) {
      const category = this.keyToCategory(key);
      const likelihood = this.calculatePlayLikelihood(
        card,
        category,
        leadSuit,
        wasLeading,
        belief
      );

      const posteriorProb = likelihood * priorProb;
      newDistribution.set(key, posteriorProb);
      totalProb += posteriorProb;
    }

    // Normalize
    if (totalProb > 0) {
      for (const [key, prob] of newDistribution) {
        newDistribution.set(key, prob / totalProb);
      }
    }

    this.pruneAndSmooth(newDistribution);
    belief.handDistribution = newDistribution;

    // Update aggregate estimates
    this.updateAggregateEstimates(belief);
    this.updateDesperation(belief);
  }

  /**
   * Update when a trick is completed
   */
  updateTrickComplete(winnerId: string): void {
    const belief = this.beliefs.get(winnerId);
    if (belief) {
      belief.tricksWon++;
      this.updateDesperation(belief);
    }
  }

  /**
   * Get current belief about an opponent
   */
  getBelief(playerId: string): OpponentBelief | undefined {
    return this.beliefs.get(playerId);
  }

  /**
   * Get all opponent beliefs
   */
  getAllBeliefs(): OpponentBelief[] {
    return Array.from(this.beliefs.values());
  }

  /**
   * Get probability that opponent has at least one wizard
   */
  getWizardProbability(playerId: string): number {
    const belief = this.beliefs.get(playerId);
    if (!belief) return 0.25; // Default

    let prob = 0;
    for (const [key, p] of belief.handDistribution) {
      const cat = this.keyToCategory(key);
      if (cat.wizards > 0) {
        prob += p;
      }
    }
    return prob;
  }

  /**
   * Get probability that opponent can trump a given suit
   */
  getTrumpProbability(playerId: string, suit: Suit): number {
    const belief = this.beliefs.get(playerId);
    if (!belief) return 0.3;

    // If they're not void in the suit, they can't trump
    if (!belief.knownVoids.has(suit)) {
      // Estimate void probability
      const cardsPlayed = belief.cardsPlayed.filter(c => c.suit === suit).length;
      if (cardsPlayed === 0) {
        // Haven't been tested yet
        return 0.2;
      }
      return 0; // They followed suit, not void
    }

    // They're void - check trump probability
    let prob = 0;
    for (const [key, p] of belief.handDistribution) {
      const cat = this.keyToCategory(key);
      if (cat.trumpStrength !== 'none') {
        prob += p;
      }
    }
    return prob;
  }

  /**
   * Get expected tricks remaining for opponent
   */
  getExpectedRemainingTricks(playerId: string): number {
    const belief = this.beliefs.get(playerId);
    if (!belief) return 1;

    let expected = 0;
    for (const [key, p] of belief.handDistribution) {
      const cat = this.keyToCategory(key);
      expected += p * cat.bidStrength;
    }

    // Adjust for cards already played
    const cardsRemaining = this.currentRound - belief.cardsPlayed.length;
    const adjustmentFactor = cardsRemaining / this.currentRound;

    return expected * adjustmentFactor;
  }

  /**
   * Check if opponent is desperate (needs every remaining trick)
   */
  isDesparate(playerId: string): boolean {
    const belief = this.beliefs.get(playerId);
    if (!belief || belief.bid === null) return false;

    const tricksNeeded = belief.bid - belief.tricksWon;
    const tricksRemaining = this.currentRound - belief.cardsPlayed.length;

    return tricksNeeded >= tricksRemaining && tricksNeeded > 0;
  }

  /**
   * Check if opponent is satisfied (made their bid)
   */
  isSatisfied(playerId: string): boolean {
    const belief = this.beliefs.get(playerId);
    if (!belief || belief.bid === null) return false;

    return belief.tricksWon >= belief.bid;
  }

  // Private helper methods

  private calculateBidStrength(
    wizards: number,
    trump: 'none' | 'weak' | 'medium' | 'strong',
    voids: number
  ): number {
    let bidStrength = wizards;
    if (trump === 'strong') bidStrength += this.currentRound * 0.3;
    else if (trump === 'medium') bidStrength += this.currentRound * 0.2;
    else if (trump === 'weak') bidStrength += this.currentRound * 0.1;
    bidStrength += voids * 0.25;
    return Math.min(this.currentRound, bidStrength);
  }

  /**
   * Generate representative hand categories
   */
  private generateHandCategories(): HandCategory[] {
    const wizardCounts = [0, 1, 2];
    const jesterCounts = [0, 1];
    const trumpStrengths: Array<'none' | 'weak' | 'medium' | 'strong'> = ['none', 'weak', 'medium', 'strong'];
    const voidCounts = [0, 1, 2];

    // Build combinations using intermediate arrays to avoid deep nesting
    const combinations: Array<{ wizards: number; jesters: number; trump: 'none' | 'weak' | 'medium' | 'strong'; voids: number }> = [];
    for (const wizards of wizardCounts) {
      for (const jesters of jesterCounts) {
        for (const trump of trumpStrengths) {
          for (const voids of voidCounts) {
            combinations.push({ wizards, jesters, trump, voids });
          }
        }
      }
    }

    return combinations.map(({ wizards, jesters, trump, voids }) => ({
      wizards,
      jesters,
      trumpStrength: trump,
      voidSuits: voids,
      bidStrength: this.calculateBidStrength(wizards, trump, voids),
    }));
  }

  /**
   * Calculate likelihood of a bid given a hand category
   */
  private calculateBidLikelihood(
    bid: number,
    category: HandCategory,
    position: number
  ): number {
    const expectedBid = category.bidStrength;

    // Gaussian likelihood centered on expected bid
    const sigma = 1.0 + this.currentRound * 0.1;
    const diff = bid - expectedBid;
    const likelihood = Math.exp(-(diff * diff) / (2 * sigma * sigma));

    // Position adjustment (later positions have more info, tighter bids)
    const positionFactor = 1 + position * 0.1;

    return likelihood * positionFactor;
  }

  private getWizardLikelihood(category: HandCategory, desperation: number): number {
    let factor = category.wizards > 0 ? 1.0 : 0.1;
    if (desperation > 0.5) factor *= 1.5;
    return factor;
  }

  private getJesterLikelihood(category: HandCategory, belief: OpponentBelief): number {
    let factor = category.jesters > 0 ? 1.0 : 0.1;
    if (belief.bid !== null && belief.tricksWon >= belief.bid) factor *= 2.0;
    return factor;
  }

  private getTrumpLikelihood(category: HandCategory): number {
    const multipliers = { strong: 1.5, medium: 1.2, weak: 0.8, none: 0.1 };
    return multipliers[category.trumpStrength];
  }

  /**
   * Calculate likelihood of a play given a hand category
   */
  private calculatePlayLikelihood(
    card: Card,
    category: HandCategory,
    leadSuit: Suit | null,
    wasLeading: boolean,
    belief: OpponentBelief
  ): number {
    let likelihood = 1.0;

    if (card.isWizard()) {
      likelihood *= this.getWizardLikelihood(category, belief.desperation);
    } else if (card.isJester()) {
      likelihood *= this.getJesterLikelihood(category, belief);
    } else if (card.suit === this.trumpSuit) {
      likelihood *= this.getTrumpLikelihood(category);
    }

    // Void inference
    const isVoidPlay = !wasLeading && leadSuit && card.suit !== leadSuit && !card.isWizard() && !card.isJester();
    if (isVoidPlay) {
      likelihood *= category.voidSuits > 0 ? 1.5 : 0.5;
    }

    return Math.max(this.config.smoothingFactor, likelihood);
  }

  /**
   * Prune low probability categories and add smoothing
   */
  private pruneAndSmooth(distribution: Map<string, number>): void {
    // Remove categories below threshold
    for (const [key, prob] of distribution) {
      if (prob < this.config.pruneThreshold) {
        distribution.delete(key);
      }
    }

    // Add smoothing to prevent zero probabilities
    const smoothingTotal = distribution.size * this.config.smoothingFactor;
    const normalizationFactor = 1 + smoothingTotal;

    for (const [key, prob] of distribution) {
      distribution.set(key, (prob + this.config.smoothingFactor) / normalizationFactor);
    }
  }

  /**
   * Update aggregate estimates from distribution
   */
  private updateAggregateEstimates(belief: OpponentBelief): void {
    let expectedWizards = 0;
    let expectedTrump = 0;
    let aggressiveness = 0;

    for (const [key, prob] of belief.handDistribution) {
      const cat = this.keyToCategory(key);
      expectedWizards += prob * cat.wizards;

      switch (cat.trumpStrength) {
        case 'strong': expectedTrump += prob * 3; break;
        case 'medium': expectedTrump += prob * 2; break;
        case 'weak': expectedTrump += prob * 1; break;
      }

      // Aggressiveness correlates with hand strength
      aggressiveness += prob * (cat.bidStrength / this.currentRound);
    }

    // Adjust for cards already played
    const cardsPlayedFactor = 1 - belief.cardsPlayed.length / this.currentRound;

    belief.expectedWizards = expectedWizards * cardsPlayedFactor;
    belief.expectedHighTrumps = expectedTrump * cardsPlayedFactor;
    belief.aggressiveness = Math.min(1, aggressiveness);
  }

  /**
   * Update desperation level
   */
  private updateDesperation(belief: OpponentBelief): void {
    if (belief.bid === null) {
      belief.desperation = 0;
      return;
    }

    const tricksNeeded = belief.bid - belief.tricksWon;
    const tricksRemaining = this.currentRound - belief.cardsPlayed.length;

    if (tricksNeeded <= 0) {
      // Made bid - desperation is about not winning more
      belief.desperation = 0;
    } else if (tricksNeeded > tricksRemaining) {
      // Can't make bid
      belief.desperation = 1;
    } else {
      // Need some fraction of remaining tricks
      belief.desperation = tricksNeeded / Math.max(1, tricksRemaining);
    }
  }

  /**
   * Convert category to string key
   */
  private categoryToKey(cat: HandCategory): string {
    return `${cat.wizards}|${cat.jesters}|${cat.trumpStrength}|${cat.voidSuits}`;
  }

  /**
   * Convert string key back to category
   */
  private keyToCategory(key: string): HandCategory {
    const [wizards, jesters, trump, voids] = key.split('|');
    const trumpStrength = trump as 'none' | 'weak' | 'medium' | 'strong';

    let bidStrength = parseInt(wizards);
    switch (trumpStrength) {
      case 'strong': bidStrength += this.currentRound * 0.3; break;
      case 'medium': bidStrength += this.currentRound * 0.2; break;
      case 'weak': bidStrength += this.currentRound * 0.1; break;
    }
    bidStrength += parseInt(voids) * 0.25;

    return {
      wizards: parseInt(wizards),
      jesters: parseInt(jesters),
      trumpStrength,
      voidSuits: parseInt(voids),
      bidStrength: Math.min(this.currentRound, bidStrength),
    };
  }
}

/**
 * Factory function to create Bayesian opponent model
 */
export function createBayesianOpponentModel(
  config?: Partial<BayesianConfig>
): BayesianOpponentModel {
  return new BayesianOpponentModel(config);
}
