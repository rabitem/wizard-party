/**
 * Card Evaluator Service
 *
 * Implements the Card Power Score (CPS) algorithm based on research:
 * - "Improving State Evaluation, Inference, and Search in Trick-Based Card Games"
 * - Bridge hand evaluation methodology adapted for Wizard
 * - Hypergeometric distribution for accurate win probability
 * - Card correlation modeling for improved accuracy
 *
 * Mathematical Foundation:
 * CPS(card) = BaseValue + TrumpBonus + PositionalModifier
 *
 * Win Probability Formula (hypergeometric):
 * P(win) = P(no opponent holds a card that beats ours)
 *        = C(N-K, n) / C(N, n) where N=unknown, K=dangerous, n=opponent cards
 *
 * References:
 * - "Automatic Bidding for the Game of Skat" (Keller & Kupferschmid)
 * - "Transformer Based Planning in Observation Space" (arXiv:2404.13150)
 */

import { Card } from '../entities/card';
import { Suit, ALL_SUITS } from '../value-objects/card-types';
import { wouldTakePlays } from './bot-rules';
import {
  ICardEvaluator,
  CardPowerScore,
  HandEvaluation,
  GameContext,
} from './types';
import {
  hypergeometricWinProbability,
  analyzeHandWithCorrelation,
  calculateDynamicTrumpingProbability,
  exponentialCardValueNormalization,
} from './probability-math';
import {
  CARD_POWER,
  DECK,
} from '../constants/bot-ai.constants';

/**
 * Card Evaluator - Single Responsibility: Evaluate card/hand strength
 *
 * Implements ICardEvaluator interface for Dependency Inversion
 */
export class CardEvaluator implements ICardEvaluator {
  /**
   * Evaluate a single card's power score
   *
   * Uses empirically-derived constants from research instead of magic numbers.
   *
   * @param card - The card to evaluate
   * @param trumpSuit - Current trump suit (null if no trump)
   * @param leadSuit - Lead suit of current trick (null if leading)
   * @returns CardPowerScore with absolute and contextual scores
   */
  evaluateCard(
    card: Card,
    trumpSuit: Suit | null,
    leadSuit: Suit | null
  ): CardPowerScore {
    if (card.isWizard()) {
      return {
        card,
        absoluteScore: 1.0,
        contextualScore: 1.0,
        winProbability: 1.0,
      };
    }

    if (card.isJester()) {
      return {
        card,
        absoluteScore: 0.0,
        contextualScore: 0.0,
        winProbability: 0.0,
      };
    }

    const normalizedValue = exponentialCardValueNormalization(card.value ?? 0);
    const isTrump = card.suit === trumpSuit;
    const followsLead = card.suit === leadSuit;

    // Absolute score using empirically-derived constants
    // Formula: CPS = BaseBonus + NormalizedValue * ValueWeight
    let absoluteScore: number;
    if (isTrump) {
      // Trump: base bonus + exponential value-weighted component
      // Range: [0.22, 1.0] for trump 2 to trump K
      absoluteScore = CARD_POWER.TRUMP_BASE_BONUS + normalizedValue * CARD_POWER.TRUMP_VALUE_WEIGHT;
    } else {
      // Non-trump: exponential value-weighted, capped below trump threshold
      // Range: [0, 0.65] for non-trump 2 to non-trump K
      absoluteScore = normalizedValue * CARD_POWER.NON_TRUMP_VALUE_WEIGHT;
    }

    // Contextual score: adjusted for current trick context
    let contextualScore = absoluteScore;

    if (leadSuit !== null) {
      // Trick is in progress
      if (isTrump && leadSuit !== trumpSuit) {
        // Trumping in - high value
        contextualScore = CARD_POWER.TRUMPING_IN_BASE + normalizedValue * CARD_POWER.TRUMPING_IN_VALUE_WEIGHT;
      } else if (!followsLead && !isTrump) {
        // Can't follow and not trumping - worthless
        contextualScore = 0.0;
      } else if (followsLead) {
        // Following suit - exponential value matters
        contextualScore = normalizedValue * CARD_POWER.FOLLOW_SUIT_WEIGHT;
      }
    }

    return {
      card,
      absoluteScore,
      contextualScore,
      winProbability: this.estimateWinProbabilitySimple(card, trumpSuit, 4),
    };
  }

  /**
   * Evaluate an entire hand for bidding purposes
   *
   * Now uses correlation-aware analysis for more accurate expected tricks.
   * Cards in the same suit are NOT independent - having A-K makes K much stronger.
   *
   * @param hand - Cards in hand
   * @param trumpSuit - Current trump suit
   * @param numPlayers - Number of players (affects probabilities)
   * @returns HandEvaluation with expected tricks and confidence
   */
  evaluateHand(
    hand: Card[],
    trumpSuit: Suit | null,
    numPlayers: number
  ): HandEvaluation {
    const cards: CardPowerScore[] = hand.map((card) =>
      this.evaluateCard(card, trumpSuit, null)
    );

    // Use correlation-aware analysis for more accurate expected tricks
    const handData = hand.map(card => ({
      value: card.value,
      suit: card.suit,
      isWizard: card.isWizard(),
      isJester: card.isJester(),
    }));

    // Use the new correlation-aware analysis
    const analysis = analyzeHandWithCorrelation(
      handData,
      trumpSuit,
      numPlayers,
      0 // Position not known during hand evaluation, default to first
    );

    // Identify strong and weak suits
    const suitStrengths = this.evaluateSuitStrengths(hand, trumpSuit);
    const sortedSuits = [...ALL_SUITS].sort(
      (a, b) => (suitStrengths.get(b) ?? 0) - (suitStrengths.get(a) ?? 0)
    );

    return {
      cards,
      expectedTricks: analysis.expectedTricks,
      confidence: analysis.confidence,
      strongSuits: sortedSuits.slice(0, 2).filter((s) => (suitStrengths.get(s) ?? 0) > 0),
      weakSuits: sortedSuits.slice(-2).filter((s) => (suitStrengths.get(s) ?? 0) < 0.3),
    };
  }

  /**
   * Calculate win probability for a specific card in game context
   *
   * Uses hypergeometric distribution for accurate probability:
   * P(win) = P(no opponent holds a card that beats ours)
   *
   * This is mathematically correct unlike the naive independence assumption.
   *
   * @param card - Card to evaluate
   * @param context - Full game context
   * @returns Probability [0, 1] that this card wins
   */
  calculateWinProbability(card: Card, context: GameContext): number {
    if (card.isWizard()) return 1.0;
    if (card.isJester()) return 0.0;

    const { trumpSuit, numPlayers, hand, currentTrickCards } = context;

    // Count known cards (in hand + played)
    const playedCards = this.getPlayedCardsFromContext(context);
    const unknownCount = DECK.TOTAL_CARDS - hand.length - playedCards.length - DECK.NUM_WIZARDS - DECK.NUM_JESTERS;

    if (unknownCount <= 0) return 0.5;

    const isTrump = card.suit === trumpSuit;
    const opponentsRemaining = numPlayers - 1 - currentTrickCards.length;

    if (opponentsRemaining <= 0) {
      // We're last to play - check if we beat current winner
      return this.wouldBeatCurrentWinner(card, context) ? 1.0 : 0.0;
    }

    // Count cards that beat us, excluding cards we've seen
    const cardsAbove = this.countCardsThatBeatUs(card, trumpSuit, playedCards);

    // Calculate opponent card count
    const cardsPerOpponent = hand.length; // All players have same hand size
    const opponentCardCount = opponentsRemaining * cardsPerOpponent;

    // Use hypergeometric distribution
    const winProb = hypergeometricWinProbability(
      cardsAbove,
      unknownCount,
      Math.min(opponentCardCount, unknownCount)
    );

    // If not trump, also consider being trumped using dynamic model
    if (!isTrump && trumpSuit) {
      const unknownTrumps = this.countUnknownTrumps(trumpSuit, hand, playedCards);
      const trumpingProb = this.estimateTrumpingProbability(
        card.suit,
        unknownTrumps,
        opponentsRemaining,
        cardsPerOpponent,
        hand
      );
      return winProb * (1 - trumpingProb);
    }

    return winProb;
  }

  /**
   * Check if card would take the current trick (the shared trick rules decide)
   */
  private wouldBeatCurrentWinner(card: Card, context: GameContext): boolean {
    return wouldTakePlays(context.currentTrickCards, card, context.trumpSuit, context.cardRules);
  }

  /**
   * Count cards that beat our card, excluding seen cards
   */
  private countCardsThatBeatUs(
    card: Card,
    trumpSuit: Suit | null,
    seenCards: Card[]
  ): number {
    const value = card.value ?? 0;
    const isTrump = card.suit === trumpSuit;

    // Count seen cards that would beat us
    const seenBeaters = seenCards.filter(seen => {
      if (seen.isWizard()) return true;
      if (seen.isJester()) return false;

      // Same suit, higher value
      if (seen.suit === card.suit && (seen.value ?? 0) > value) return true;

      // If we're not trump, any trump beats us
      if (!isTrump && seen.suit === trumpSuit) return true;

      return false;
    }).length;

    // Total possible beaters
    let totalBeaters = DECK.NUM_WIZARDS; // Wizards always beat us

    if (isTrump) {
      // Only higher trumps beat us
      totalBeaters += DECK.CARDS_PER_SUIT - value;
    } else {
      // Higher cards in suit + all trumps beat us
      totalBeaters += DECK.CARDS_PER_SUIT - value; // Higher in suit
      if (trumpSuit) {
        totalBeaters += DECK.CARDS_PER_SUIT; // All trumps
      }
    }

    return Math.max(0, totalBeaters - seenBeaters);
  }

  /**
   * Count unknown trumps
   */
  private countUnknownTrumps(trumpSuit: Suit, hand: Card[], seenCards: Card[]): number {
    const trumpsInHand = hand.filter(c => c.suit === trumpSuit).length;
    const trumpsSeen = seenCards.filter(c => c.suit === trumpSuit).length;
    return Math.max(0, DECK.CARDS_PER_SUIT - trumpsInHand - trumpsSeen);
  }

  /**
   * Estimate probability of being trumped using dynamic trumping model
   */
  private estimateTrumpingProbability(
    ourSuit: Suit | null,
    unknownTrumps: number,
    opponentsRemaining: number,
    cardsPerOpponent: number,
    hand: Card[]
  ): number {
    if (unknownTrumps <= 0 || !ourSuit) return 0;

    // Count our cards in suit - more = less likely opponents are void
    const ourSuitCount = hand.filter(c => c.suit === ourSuit).length;
    const unseenInOurSuit = DECK.CARDS_PER_SUIT - ourSuitCount;

    // Total unknown cards (deck minus our hand)
    const totalUnknownCards = DECK.TOTAL_CARDS - hand.length;

    // Use the new dynamic trumping probability model
    return calculateDynamicTrumpingProbability({
      numOpponents: opponentsRemaining,
      cardsPerOpponent,
      unknownTrumps,
      unseenInLeadSuit: unseenInOurSuit,
      totalUnknownCards,
      knownVoids: new Set<string>(),  // No known voids in this context
      tricksNeeded: 0,  // Unknown during evaluation
      tricksRemaining: cardsPerOpponent,
      isDefending: false,
    });
  }

  /**
   * Win probability estimate using hypergeometric distribution
   *
   * Uses research-backed probability model:
   * - Hypergeometric distribution for exact card probabilities
   * - Dynamic trumping probability model
   * - Accounts for sequential play (not simultaneous)
   */
  private estimateWinProbabilitySimple(
    card: Card,
    trumpSuit: Suit | null,
    numPlayers: number
  ): number {
    if (card.isWizard()) return 1.0;
    if (card.isJester()) return 0.0;

    const value = card.value ?? 0;
    const isTrump = card.suit === trumpSuit;
    const opponentsRemaining = numPlayers - 1;

    // Cards that beat us in our suit
    const cardsAboveInSuit = DECK.CARDS_PER_SUIT - value;

    // Unknown cards (approximate for simple estimate)
    // In a typical hand, we have ~round number of cards
    const avgHandSize = 10; // Approximate mid-game
    const unknownCards = DECK.TOTAL_CARDS - avgHandSize - DECK.NUM_WIZARDS - DECK.NUM_JESTERS;
    const unknownInSuit = DECK.CARDS_PER_SUIT; // Conservative estimate
    const unknownTrumps = trumpSuit ? DECK.CARDS_PER_SUIT : 0;

    // Total cards opponents might hold
    const opponentCards = opponentsRemaining * avgHandSize;

    if (isTrump) {
      // Trump: only higher trumps beat us (wizards handled separately)
      // Use hypergeometric: P(no opponent has higher trump)
      return hypergeometricWinProbability(
        cardsAboveInSuit,
        unknownTrumps,
        Math.min(opponentCards, unknownTrumps * 3)
      );
    } 
      // Non-trump: can be beaten by higher cards in suit OR trumps

      // P(win in suit) - no one has higher card in our suit
      const winInSuitProb = hypergeometricWinProbability(
        cardsAboveInSuit,
        unknownInSuit,
        Math.min(opponentCards, unknownInSuit * 3)
      );

      // P(not trumped) - use dynamic trumping probability model
      let notTrumpedProb = 1.0;
      if (trumpSuit && card.suit) {
        const trumpProb = calculateDynamicTrumpingProbability({
          numOpponents: opponentsRemaining,
          cardsPerOpponent: avgHandSize,
          unknownTrumps,
          unseenInLeadSuit: unknownInSuit,
          totalUnknownCards: unknownCards,
          knownVoids: new Set<string>(),
          tricksNeeded: 0,
          tricksRemaining: avgHandSize,
          isDefending: false,
        });
        notTrumpedProb = 1 - trumpProb;
      }

      // Lead probability affects when this card gets played
      // Higher cards more likely to be played when leading
      let leadValueBonus = 0.8;
      if (value >= 10) leadValueBonus = 1.2;
      else if (value >= 7) leadValueBonus = 1.0;

      return winInSuitProb * notTrumpedProb * leadValueBonus * 0.85;
    
  }

  /**
   * Calculate expected win probability considering hand composition
   */
  private calculateExpectedWinProbability(
    card: Card,
    trumpSuit: Suit | null,
    numPlayers: number,
    hand: Card[]
  ): number {
    if (card.isWizard()) return 1.0;
    if (card.isJester()) return 0.0;

    const isTrump = card.suit === trumpSuit;

    // Count wizards and high cards in hand (affects overall strategy)
    const wizardCount = hand.filter((c) => c.isWizard()).length;
    const highTrumpCount = hand.filter(
      (c) => c.suit === trumpSuit && (c.value ?? 0) >= 10
    ).length;

    // Base probability from simple estimate
    let baseProb = this.estimateWinProbabilitySimple(card, trumpSuit, numPlayers);

    // Adjust based on hand composition
    // More wizards = more control, can save this card for right moment
    if (wizardCount > 0 && !card.isWizard()) {
      baseProb *= 1.1; // Slight boost - better trick control
    }

    // Strong trump holding increases non-trump viability (can trump in later)
    if (!isTrump && highTrumpCount >= 2) {
      baseProb *= 1.15;
    }

    return Math.min(1.0, baseProb);
  }

  /**
   * Evaluate strength of each suit in hand
   * Used for trump selection and play decisions
   *
   * Uses exponential card value normalization for accurate strength assessment.
   */
  evaluateSuitStrengths(hand: Card[], trumpSuit: Suit | null): Map<Suit, number> {
    const strengths = new Map<Suit, number>();

    for (const suit of ALL_SUITS) {
      const suitCards = hand.filter((c) => c.suit === suit);
      let strength = 0;

      for (const card of suitCards) {
        const value = card.value ?? 0;
        // Use EXPONENTIAL normalization for accurate value assessment
        const normalizedValue = exponentialCardValueNormalization(value);
        strength += normalizedValue;

        // Additional bonus for sequential high cards (correlation effect)
        if (value >= 11) strength += 0.2; // J, Q, K get bonus
        if (value === 13) strength += 0.15; // K gets extra
      }

      // Length bonus - more cards = more control
      // Diminishing returns: 1st card = 0.2, 2nd = 0.15, 3rd+ = 0.1
      strength += Math.min(suitCards.length, 1) * 0.2 +
                  Math.min(Math.max(suitCards.length - 1, 0), 1) * 0.15 +
                  Math.max(suitCards.length - 2, 0) * 0.1;

      // Trump bonus
      if (suit === trumpSuit) {
        strength *= 1.5;
      }

      strengths.set(suit, strength);
    }

    return strengths;
  }

  /**
   * Count how many cards this card can beat
   * Considers trump suit and what's already been played
   */
  private countCardsBeaten(
    card: Card,
    trumpSuit: Suit | null
  ): number {
    if (card.isWizard()) return DECK.TOTAL_CARDS - DECK.NUM_WIZARDS; // All except other wizards
    if (card.isJester()) return 0;

    const isTrump = card.suit === trumpSuit;
    const value = card.value ?? 0;
    let beaten = 0;

    // Count jesters (always beaten)
    beaten += DECK.NUM_JESTERS;

    // Count lower cards of same suit
    beaten += value - 1; // Cards 1 through (value-1)

    // If trump, also beats all non-trump number cards
    if (isTrump) {
      beaten += (ALL_SUITS.length - 1) * DECK.CARDS_PER_SUIT; // All other suits
    }

    return Math.max(0, beaten);
  }

  /**
   * Extract played cards from game context
   */
  private getPlayedCardsFromContext(context: GameContext): Card[] {
    const played: Card[] = [];

    // Cards from current trick
    for (const playedCard of context.currentTrickCards) {
      played.push(Card.fromJSON(playedCard.card));
    }

    // Cards from completed tricks
    for (const trick of context.completedTricks) {
      for (const playedCard of trick) {
        played.push(Card.fromJSON(playedCard.card));
      }
    }

    // Trump card if revealed
    if (context.trumpCard) {
      played.push(context.trumpCard);
    }

    return played;
  }
}
