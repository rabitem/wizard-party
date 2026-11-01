/**
 * Neural-Inspired Card Inference System
 */

import { Card } from '../../entities/card';
import { Suit, ALL_SUITS } from '../../value-objects/card-types';
import type { PlayedCard } from '../../entities/trick';
import { GameContext } from '../types';
import { revealsVoid, withSuitToFollow } from '../bot-rules';
import { OPPONENT_MODEL } from '../../constants/bot-ai.constants';
import {
  CardProbabilityDistribution,
  InferenceFeatures,
  INFERENCE_WEIGHTS,
  createDefaultFeatures,
} from './card-inference.types';
import { computeFeaturesForPlayer } from './card-inference.features';

export type { CardProbabilityDistribution } from './card-inference.types';

export class CardInferenceEngine {
  private context: GameContext;
  private seenCards: Set<string> = new Set();
  private playerFeatures: Map<string, InferenceFeatures> = new Map();
  private distributions: Map<string, CardProbabilityDistribution> = new Map();

  constructor(context: GameContext) {
    this.context = context;
    this.initializeSeenCards();
    this.computeAllPlayerFeatures();
  }

  inferAllDistributions(): Map<string, CardProbabilityDistribution> {
    for (const [playerId, bid] of this.context.playerBids) {
      if (playerId === this.context.playerId) continue;
      const distribution = this.inferPlayerDistribution(playerId, bid);
      this.distributions.set(playerId, distribution);
    }
    this.applyConstraints();
    return this.distributions;
  }

  private inferPlayerDistribution(playerId: string, bid: number): CardProbabilityDistribution {
    const features = this.playerFeatures.get(playerId) || createDefaultFeatures(this.context.hand.length);
    const unseenCards = this.getUnseenCards();
    const cardProbabilities = this.initializeProbabilities(unseenCards);

    this.applyBidInference(cardProbabilities, features, bid, unseenCards);
    this.applyPlayInference(cardProbabilities, playerId, unseenCards);

    const expectedWizards = this.inferWizardCount(features);
    const expectedHighTrumps = this.inferHighTrumpCount(features);
    const voidSuits = this.detectVoids(playerId);

    this.applyVoidConstraints(cardProbabilities, unseenCards, voidSuits);
    this.normalizeProbabilities(cardProbabilities);

    const confidence = this.calculateConfidence(features, voidSuits.size);

    return { playerId, cardProbabilities, expectedWizards, expectedHighTrumps, voidSuits, confidence };
  }

  private initializeProbabilities(unseenCards: Card[]): Map<string, number> {
    const probabilities = new Map<string, number>();
    const uniformPrior = 1 / Math.max(1, unseenCards.length);
    for (const card of unseenCards) {
      probabilities.set(card.id, uniformPrior);
    }
    return probabilities;
  }

  private applyBidInference(
    probabilities: Map<string, number>,
    features: InferenceFeatures,
    bid: number,
    unseenCards: Card[]
  ): void {
    const { bidRatio, bidPosition } = features;
    const expectedStrength = INFERENCE_WEIGHTS.CARD_STRENGTH_WEIGHTS.bidRatioEffect * bidRatio +
      INFERENCE_WEIGHTS.CARD_STRENGTH_WEIGHTS.positionEffect * (1 - bidPosition);

    for (const card of unseenCards) {
      const currentProb = probabilities.get(card.id) || 0;
      const adjustment = this.calculateBidAdjustment(card, bidRatio, expectedStrength);
      probabilities.set(card.id, currentProb * adjustment);
    }
  }

  private calculateBidAdjustment(card: Card, bidRatio: number, expectedStrength: number): number {
    let adjustment = 1.0;

    if (card.isWizard()) {
      adjustment = 1 + (bidRatio - 0.4) * INFERENCE_WEIGHTS.WIZARD_WEIGHTS.bidRatio;
    } else if (card.isJester()) {
      adjustment = 1 + (0.5 - bidRatio) * 0.5;
    } else {
      const cardStrength = (card.value ?? 0) / 13;
      const isTrump = card.suit === this.context.trumpSuit;
      adjustment = isTrump
        ? 1 + (bidRatio - 0.3) * cardStrength * 2
        : 1 + (expectedStrength - 0.3) * cardStrength;
    }

    return Math.max(0.1, Math.min(3.0, adjustment));
  }

  private applyPlayInference(probabilities: Map<string, number>, playerId: string, unseenCards: Card[]): void {
    const features = this.playerFeatures.get(playerId);
    if (!features) return;

    if (features.isDesparate && features.failedToWin > 0) {
      this.applyDesperateNoWinInference(probabilities, unseenCards);
    }

    if (features.trumpedIn > 1) {
      this.applyExcessTrumpInference(probabilities, unseenCards, features.trumpedIn);
    }

    if (features.isSatisfied && features.playedHigh > features.tricksRemaining) {
      this.applyExcessWinnersInference(probabilities, unseenCards);
    }
  }

  private applyDesperateNoWinInference(probabilities: Map<string, number>, unseenCards: Card[]): void {
    for (const card of unseenCards) {
      if (card.isWizard()) {
        const current = probabilities.get(card.id) || 0;
        probabilities.set(card.id, current * OPPONENT_MODEL.DESPERATE_NO_WIN_WIZARD_FACTOR);
      }
      if (card.suit === this.context.trumpSuit && (card.value ?? 0) >= 10) {
        const current = probabilities.get(card.id) || 0;
        probabilities.set(card.id, current * OPPONENT_MODEL.DESPERATE_NO_WIN_TRUMP_FACTOR);
      }
    }
  }

  private applyExcessTrumpInference(probabilities: Map<string, number>, unseenCards: Card[], trumpedIn: number): void {
    for (const card of unseenCards) {
      if (card.suit === this.context.trumpSuit) {
        const current = probabilities.get(card.id) || 0;
        probabilities.set(card.id, current * (1 + trumpedIn * 0.2));
      }
    }
  }

  private applyExcessWinnersInference(probabilities: Map<string, number>, unseenCards: Card[]): void {
    for (const card of unseenCards) {
      if (card.isWizard() || (card.value ?? 0) >= 11) {
        const current = probabilities.get(card.id) || 0;
        probabilities.set(card.id, current * 1.3);
      }
    }
  }

  private inferWizardCount(features: InferenceFeatures): number {
    const w = INFERENCE_WEIGHTS.WIZARD_WEIGHTS;
    const expected = w.BASE +
      w.bidRatio * features.bidRatio +
      w.bidPosition * features.bidPosition +
      w.bidAggressiveness * features.bidAggressiveness +
      w.playedHigh * Math.min(1, features.playedHigh / 3) +
      w.failedToWin * Math.min(1, features.failedToWin);
    return Math.max(0, Math.min(4, expected));
  }

  private inferHighTrumpCount(features: InferenceFeatures): number {
    const w = INFERENCE_WEIGHTS.HIGH_TRUMP_WEIGHTS;
    const expected = w.BASE +
      w.bidRatio * features.bidRatio +
      w.trumpedIn * Math.min(1, features.trumpedIn / 2) +
      w.playedHigh * Math.min(1, features.playedHigh / 4);
    return Math.max(0, Math.min(4, expected));
  }

  private detectVoids(playerId: string): Set<Suit> {
    const voids = new Set<Suit>();
    this.detectVoidsFromCompletedTricks(playerId, voids);
    this.detectVoidsFromCurrentTrick(playerId, voids);
    return voids;
  }

  private detectVoidsFromCompletedTricks(playerId: string, voids: Set<Suit>): void {
    for (const trick of this.context.completedTricks) {
      this.detectVoidsInTrick(trick, playerId, voids);
    }
  }

  private detectVoidsFromCurrentTrick(playerId: string, voids: Set<Suit>): void {
    this.detectVoidsInTrick(this.context.currentTrickCards, playerId, voids);
  }

  /** A number card off the suit that had to be followed reveals a void. */
  private detectVoidsInTrick(trick: PlayedCard[], playerId: string, voids: Set<Suit>): void {
    for (const { play, followSuit } of withSuitToFollow(trick)) {
      if (play.playerId === playerId && revealsVoid(play.card, followSuit)) {
        voids.add(followSuit);
      }
    }
  }

  private applyVoidConstraints(probabilities: Map<string, number>, unseenCards: Card[], voidSuits: Set<Suit>): void {
    for (const card of unseenCards) {
      if (card.suit && voidSuits.has(card.suit)) {
        probabilities.set(card.id, 0);
      }
    }
  }

  private applyConstraints(): void {
    const handSize = this.context.hand.length;
    const unseenCards = this.getUnseenCards();

    for (const card of unseenCards) {
      let totalProb = 0;
      for (const dist of this.distributions.values()) {
        totalProb += dist.cardProbabilities.get(card.id) || 0;
      }
      if (totalProb > 0) {
        for (const dist of this.distributions.values()) {
          const current = dist.cardProbabilities.get(card.id) || 0;
          dist.cardProbabilities.set(card.id, current / totalProb);
        }
      }
    }

    for (const dist of this.distributions.values()) {
      let totalExpected = 0;
      for (const prob of dist.cardProbabilities.values()) {
        totalExpected += prob;
      }
      if (totalExpected > 0) {
        const scale = handSize / totalExpected;
        for (const [cardId, prob] of dist.cardProbabilities) {
          dist.cardProbabilities.set(cardId, prob * scale);
        }
      }
    }
  }

  private calculateConfidence(features: InferenceFeatures, voidCount: number): number {
    let confidence = 0.3;
    confidence += Math.min(0.3, this.context.completedTricks.length * 0.05);
    confidence += voidCount * 0.1;
    if (features.isDesparate || features.isSatisfied) confidence += 0.1;
    if (features.failedToWin > 0 && features.isDesparate) confidence += 0.15;
    return Math.min(1, confidence);
  }

  private initializeSeenCards(): void {
    for (const card of this.context.hand) this.seenCards.add(card.id);
    for (const trick of this.context.completedTricks) {
      for (const played of trick) this.seenCards.add(Card.fromJSON(played.card).id);
    }
    for (const played of this.context.currentTrickCards) {
      this.seenCards.add(Card.fromJSON(played.card).id);
    }
    if (this.context.trumpCard) this.seenCards.add(this.context.trumpCard.id);
  }

  private getUnseenCards(): Card[] {
    const unseen: Card[] = [];
    for (const suit of ALL_SUITS) {
      for (let value = 1; value <= 13; value++) {
        const card = Card.createNumberCard(suit, value);
        if (!this.seenCards.has(card.id)) unseen.push(card);
      }
    }
    for (let i = 1; i <= 4; i++) {
      const wizard = Card.createWizard(i);
      const jester = Card.createJester(i);
      if (!this.seenCards.has(wizard.id)) unseen.push(wizard);
      if (!this.seenCards.has(jester.id)) unseen.push(jester);
    }
    return unseen;
  }

  private computeAllPlayerFeatures(): void {
    for (const [playerId, bid] of this.context.playerBids) {
      if (playerId === this.context.playerId) continue;
      const features = computeFeaturesForPlayer(this.context, playerId, bid);
      this.playerFeatures.set(playerId, features);
    }
  }

  private normalizeProbabilities(probabilities: Map<string, number>): void {
    let total = 0;
    for (const prob of probabilities.values()) total += prob;
    if (total > 0) {
      for (const [key, prob] of probabilities) probabilities.set(key, prob / total);
    }
  }

  sampleInformedDeterminization(): Map<string, Card[]> {
    if (this.distributions.size === 0) this.inferAllDistributions();

    const hands = new Map<string, Card[]>();
    const unseenCards = this.getUnseenCards();
    const handSize = this.context.hand.length;
    const usedCards = new Set<string>();

    for (const [playerId, dist] of this.distributions) {
      const hand: Card[] = [];
      const cardProbs = Array.from(dist.cardProbabilities.entries())
        .filter(([cardId]) => !usedCards.has(cardId))
        .sort((a, b) => b[1] - a[1]);

      for (let i = 0; i < handSize && cardProbs.length > 0; i++) {
        const totalProb = cardProbs.reduce((sum, [, prob]) => sum + prob, 0);
        let random = Math.random() * totalProb;

        let selectedIdx = 0;
        for (let j = 0; j < cardProbs.length; j++) {
          random -= cardProbs[j][1];
          if (random <= 0) { selectedIdx = j; break; }
        }

        const [cardId] = cardProbs.splice(selectedIdx, 1)[0];
        const card = unseenCards.find(c => c.id === cardId);
        if (card) { hand.push(card); usedCards.add(cardId); }
      }

      hands.set(playerId, hand);
    }

    return hands;
  }
}

export function createCardInferenceEngine(context: GameContext): CardInferenceEngine {
  return new CardInferenceEngine(context);
}

export function sampleInformedDeterminization(context: GameContext): Map<string, Card[]> {
  return createCardInferenceEngine(context).sampleInformedDeterminization();
}
