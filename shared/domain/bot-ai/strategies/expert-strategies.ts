/**
 * Expert Bot Strategies
 *
 * Level 5 (Expert) bot implementation using advanced algorithms:
 * - ISMCTS for card play decisions
 * - CFR for bidding decisions
 * - Bayesian opponent modeling
 * - EPIMC for strategy fusion fix
 * - Neural card inference
 */

import { Card } from '../../entities/card';
import type { PlayedCard } from '../../entities/trick';
import { CardEvaluator } from '../card-evaluator';
import { scaleIterations } from '../decision-budget';
import { withSuitToFollow, wouldTakePlays } from '../bot-rules';
import {
  IBiddingStrategy,
  IPlayingStrategy,
  GameContext,
  BotConfig,
  BotPersonality,
} from '../types';
import { InformationSet, createInformationSet } from '../information-set';
import { analyzeHandForBidding } from '../probability-math';

import { createISMCTS } from '../algorithms/ismcts';
import { getCFRTrainer, type CFRBiddingTrainer } from '../algorithms/cfr-bidding';
import { createBayesianOpponentModel, type BayesianOpponentModel } from '../algorithms/bayesian-opponent';
import { createAlphaBetaSearch } from '../algorithms/alpha-beta';
import { createEPIMC } from '../algorithms/epimc';
import { createCardInferenceEngine, type CardInferenceEngine } from '../algorithms/card-inference';

/**
 * Configuration for expert-level algorithms
 */
export interface ExpertStrategyConfig {
  useISMCTS: boolean;
  ismctsIterations: number;
  useEPIMC: boolean;
  useCFR: boolean;
  useBayesian: boolean;
  useCardInference: boolean;
  useAlphaBeta: boolean;
  alphaBetaDepth: number;
}

export const DEFAULT_EXPERT_CONFIG: ExpertStrategyConfig = {
  useISMCTS: true,
  ismctsIterations: 500,
  useEPIMC: false,
  useCFR: true,
  useBayesian: true,
  useCardInference: true,
  useAlphaBeta: false,
  alphaBetaDepth: 4,
};

/**
 * Expert Bidding Strategy
 *
 * Uses CFR-trained policy blended with probabilistic hand analysis.
 */
export class ExpertBiddingStrategy implements IBiddingStrategy {
  private evaluator: CardEvaluator;
  private cfrTrainer: CFRBiddingTrainer;
  private bayesianModel: BayesianOpponentModel;
  private config: ExpertStrategyConfig;

  constructor(config: Partial<ExpertStrategyConfig> = {}) {
    this.config = { ...DEFAULT_EXPERT_CONFIG, ...config };
    this.evaluator = new CardEvaluator();
    this.cfrTrainer = getCFRTrainer();
    this.bayesianModel = createBayesianOpponentModel();
  }

  calculateBid(context: GameContext, botConfig: BotConfig): number {
    const handData = context.hand.map(card => ({
      value: card.value,
      suit: card.suit,
      isWizard: card.isWizard(),
      isJester: card.isJester(),
    }));

    const analysis = analyzeHandForBidding(
      handData,
      context.trumpSuit,
      context.numPlayers,
      context.playerPosition
    );

    let bid: number;

    if (this.config.useCFR) {
      const infoSet = this.cfrTrainer.createInfoSet({
        hand: context.hand,
        trumpSuit: context.trumpSuit,
        position: context.playerPosition,
        numPlayers: context.numPlayers,
        previousBids: Array.from(context.playerBids.values()),
        forbiddenBid: context.forbiddenBid,
      });

      bid = this.cfrTrainer.getBestBid(infoSet);
      bid = (bid + analysis.expectedTricks) / 2;
    } else {
      bid = analysis.expectedTricks;
    }

    bid = this.applyStrategicAdjustments(bid, context, analysis);
    bid = this.applyPersonality(bid, botConfig);
    bid = this.ensureValidBid(Math.round(bid), context);

    return bid;
  }

  private applyStrategicAdjustments(
    baseBid: number,
    context: GameContext,
    analysis: ReturnType<typeof analyzeHandForBidding>
  ): number {
    const totalBidsSoFar = Array.from(context.playerBids.values()).reduce((a, b) => a + b, 0);
    const playersBidSoFar = context.playerBids.size;

    if (playersBidSoFar === context.numPlayers - 1) {
      const tricksAvailable = context.currentRound - totalBidsSoFar;

      if (tricksAvailable > baseBid + 1) {
        return baseBid + Math.min(0.5, (tricksAvailable - baseBid) * 0.3);
      } else if (tricksAvailable < baseBid - 0.5) {
        return baseBid - 0.3;
      }
    }

    if (playersBidSoFar > 0) {
      const avgBid = totalBidsSoFar / playersBidSoFar;
      const projectedTotal = totalBidsSoFar + baseBid + avgBid * (context.numPlayers - playersBidSoFar - 1);

      if (projectedTotal > context.currentRound * 1.2) {
        return baseBid - 0.4;
      }
    }

    if (analysis.confidence < 0.4) {
      return baseBid * 0.9;
    } else if (analysis.confidence > 0.7) {
      return baseBid * 1.05;
    }

    return baseBid;
  }

  private applyPersonality(bid: number, config: BotConfig): number {
    switch (config.personality) {
      case BotPersonality.AGGRESSIVE:
        return bid + 0.4;
      case BotPersonality.CONSERVATIVE:
        return bid - 0.4;
      case BotPersonality.CHAOTIC:
        return bid + (Math.random() - 0.5) * 2;
      default:
        return bid;
    }
  }

  private ensureValidBid(bid: number, context: GameContext): number {
    bid = Math.max(0, Math.min(context.hand.length, bid));

    if (context.forbiddenBid !== null && bid === context.forbiddenBid) {
      if (bid > 0 && this.handStrength(context) < 0.5) {
        return bid - 1;
      } else if (bid < context.hand.length) {
        return bid + 1;
      }
      return bid - 1;
    }

    return bid;
  }

  private handStrength(context: GameContext): number {
    let strength = 0;
    for (const card of context.hand) {
      if (card.isWizard()) strength += 1;
      else if (card.isJester()) strength += 0;
      else if (card.suit === context.trumpSuit) strength += 0.5 + (card.value ?? 0) / 26;
      else strength += (card.value ?? 0) / 39;
    }
    return strength / context.hand.length;
  }
}

/**
 * What the bot believes about the other hands, rebuilt from the public record
 * (bids it may see, every card played so far) for each decision.
 */
interface ExpertBeliefs {
  informationSet: InformationSet;
  bayesianModel: BayesianOpponentModel;
  cardInference: CardInferenceEngine | null;
}

type PlayObjective = 'win' | 'lose' | 'flexible';

/**
 * Expert Playing Strategy
 *
 * Algorithm priority:
 * 1. EPIMC - Best accuracy, fixes strategy fusion
 * 2. ISMCTS with card inference - Good speed/accuracy balance
 * 3. Alpha-Beta - Fast tactical decisions
 * 4. Heuristics - Fallback
 *
 * Stateless between decisions: the beliefs are rebuilt from the GameContext every
 * time, so one instance can never carry one seat's (or one room's) private
 * information into another seat's decision. Searches stop at context.budget.
 */
export class ExpertPlayingStrategy implements IPlayingStrategy {
  private readonly evaluator: CardEvaluator;
  private readonly config: ExpertStrategyConfig;

  constructor(config: Partial<ExpertStrategyConfig> = {}) {
    this.config = { ...DEFAULT_EXPERT_CONFIG, ...config };
    this.evaluator = new CardEvaluator();
  }

  selectCard(context: GameContext, playableCards: Card[], botConfig: BotConfig): Card {
    if (playableCards.length === 1) {
      return playableCards[0];
    }

    const beliefs = this.buildBeliefs(context);

    let selectedCard: Card;

    if (this.config.useEPIMC) {
      selectedCard = this.selectWithEPIMC(context, playableCards, beliefs);
    } else if (this.config.useISMCTS) {
      selectedCard = this.selectWithISMCTS(context, playableCards, beliefs);
    } else if (this.config.useAlphaBeta) {
      selectedCard = this.selectWithAlphaBeta(context, playableCards, beliefs);
    } else {
      selectedCard = this.selectWithHeuristics(context, playableCards, beliefs);
    }

    return this.applyPersonalityVariance(selectedCard, playableCards, botConfig);
  }

  private selectWithISMCTS(context: GameContext, playableCards: Card[], beliefs: ExpertBeliefs): Card {
    const { cardInference } = beliefs;
    const ismcts = createISMCTS(
      beliefs.informationSet,
      context.playerId,
      {
        iterations: scaleIterations(this.config.ismctsIterations, context.hand.length),
        informedSampler: cardInference
          ? () => cardInference.sampleInformedDeterminization()
          : undefined,
      }
    );

    return ismcts.selectCard(context, playableCards);
  }

  private selectWithEPIMC(context: GameContext, playableCards: Card[], beliefs: ExpertBeliefs): Card {
    const epimc = createEPIMC(beliefs.informationSet, context.playerId, context.numPlayers);
    return epimc.selectCard(context, playableCards);
  }

  private selectWithAlphaBeta(context: GameContext, playableCards: Card[], beliefs: ExpertBeliefs): Card {
    const search = createAlphaBetaSearch(
      beliefs.informationSet,
      context.playerId,
      { maxDepth: this.config.alphaBetaDepth }
    );

    return search.findBestCard(context, playableCards).action;
  }

  private selectWithHeuristics(context: GameContext, playableCards: Card[], beliefs: ExpertBeliefs): Card {
    const objective = this.determineObjective(context);

    const scoredCards = playableCards.map(card => ({
      card,
      score: this.evaluateCard(card, context, objective, beliefs),
    }));

    scoredCards.sort((a, b) => b.score - a.score);

    return scoredCards[0].card;
  }

  private determineObjective(context: GameContext): PlayObjective {
    if (context.myBid === null) return 'flexible';

    const tricksNeeded = context.myBid - context.myTricksWon;
    const tricksRemaining = context.hand.length;

    if (tricksNeeded <= 0) return 'lose';
    if (tricksNeeded >= tricksRemaining) return 'win';
    return 'flexible';
  }

  private evaluateCard(
    card: Card,
    context: GameContext,
    objective: PlayObjective,
    beliefs: ExpertBeliefs
  ): number {
    const cardScore = this.evaluator.evaluateCard(card, context.trumpSuit, context.leadSuit);
    const wouldWin = this.wouldWinTrick(card, context);

    let score = 0;

    switch (objective) {
      case 'win':
        score = wouldWin ? 100 - cardScore.absoluteScore * 30 : -50;
        break;

      case 'lose':
        score = wouldWin
          ? -100 + (1 - cardScore.absoluteScore) * 30
          : 100 - cardScore.absoluteScore * 20;
        break;

      case 'flexible':
        score = 50 - cardScore.absoluteScore * 10;
        break;
    }

    if (this.config.useBayesian) {
      score += this.bayesianAdjustment(card, context, objective, beliefs.bayesianModel);
    }

    return score;
  }

  private bayesianAdjustment(
    card: Card,
    context: GameContext,
    objective: PlayObjective,
    bayesianModel: BayesianOpponentModel
  ): number {
    let adjustment = 0;

    for (const [playerId] of context.playerBids) {
      if (playerId === context.playerId) continue;

      if (bayesianModel.isDesparate(playerId) && objective === 'win' && card.isWizard()) {
        adjustment += 20;
      }

      if (bayesianModel.isSatisfied(playerId) && objective === 'win') {
        adjustment += 10;
      }
    }

    return adjustment;
  }

  private wouldWinTrick(card: Card, context: GameContext): boolean {
    if (context.currentTrickCards.length === 0) {
      return card.isWizard();
    }
    return wouldTakePlays(context.currentTrickCards, card, context.trumpSuit, context.cardRules);
  }

  private applyPersonalityVariance(
    selected: Card,
    playableCards: Card[],
    config: BotConfig
  ): Card {
    if (config.personality === BotPersonality.CHAOTIC && Math.random() < 0.15) {
      return playableCards[Math.floor(Math.random() * playableCards.length)];
    }

    return selected;
  }

  /**
   * Rebuild the beliefs from what this seat can see: visible bids, then every
   * card played this round in order, each with the suit its player had to follow,
   * then the tricks each opponent has taken.
   */
  private buildBeliefs(context: GameContext): ExpertBeliefs {
    // The models reason about the whole round, so they need the cards dealt (the
    // round size), not the cards still in hand: one card left per completed trick.
    const cardsDealt = context.hand.length + context.completedTricks.length;

    const informationSet = createInformationSet();
    informationSet.initializeRound({
      hand: context.hand,
      trumpSuit: context.trumpSuit,
      trumpCard: context.trumpCard,
      playerIds: context.playerIds,
      ourPlayerId: context.playerId,
      roundNumber: cardsDealt,
      cardRules: context.cardRules,
    });

    const bayesianModel = createBayesianOpponentModel();
    const opponentIds = context.playerIds.filter(id => id !== context.playerId);
    bayesianModel.initializeRound(opponentIds, context.trumpSuit, cardsDealt);

    for (const [playerId, bid] of context.playerBids) {
      if (playerId === context.playerId) continue;
      informationSet.recordBid(playerId, bid);
      bayesianModel.updateFromBid(playerId, bid, context.playerIds.indexOf(playerId));
    }

    for (const trick of context.completedTricks) {
      this.recordTrick(context, trick, informationSet, bayesianModel);
    }
    this.recordTrick(context, context.currentTrickCards, informationSet, bayesianModel);

    // Tricks taken are public: use the game's count (a Bomb-voided trick credits nobody).
    for (const opponentId of opponentIds) {
      const tricksWon = context.playerTricksWon.get(opponentId) ?? 0;
      for (let trick = 0; trick < tricksWon; trick++) {
        informationSet.recordTrickWon(opponentId);
        bayesianModel.updateTrickComplete(opponentId);
      }
    }

    const cardInference = this.config.useCardInference ? createCardInferenceEngine(context) : null;
    return { informationSet, bayesianModel, cardInference };
  }

  private recordTrick(
    context: GameContext,
    trick: readonly PlayedCard[],
    informationSet: InformationSet,
    bayesianModel: BayesianOpponentModel
  ): void {
    withSuitToFollow(trick).forEach(({ play, followSuit }, index) => {
      const card = Card.fromJSON(play.card);
      const isLeading = index === 0;
      // Our own cards only count as seen; opponents' cards also shape their profile.
      informationSet.recordCardPlayed(play.playerId, card, followSuit, isLeading);
      if (play.playerId !== context.playerId) {
        bayesianModel.updateFromPlay(play.playerId, card, followSuit, isLeading, false);
      }
    });
  }
}

export function createExpertBiddingStrategy(
  config?: Partial<ExpertStrategyConfig>
): IBiddingStrategy {
  return new ExpertBiddingStrategy(config);
}

export function createExpertPlayingStrategy(
  config?: Partial<ExpertStrategyConfig>
): IPlayingStrategy {
  return new ExpertPlayingStrategy(config);
}
