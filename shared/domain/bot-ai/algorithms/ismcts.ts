/**
 * Information Set Monte Carlo Tree Search (ISMCTS)
 */

import { Card } from '../../entities/card';
import { GameContext } from '../types';
import { InformationSet } from '../information-set';
import {
  ISMCTSNode,
  Determinization,
  ISMCTSConfig,
  DEFAULT_ISMCTS_CONFIG,
  createNode,
} from './ismcts.types';
import {
  getLowestCard,
  getHighestCard,
  wouldWinTrick,
  copyDeterminization,
  cardToKey,
  getLegalActionsForPlayer,
  applyAction,
} from './ismcts.utils';
import { evaluateState } from './ismcts.evaluation';
import { isBudgetExhausted } from '../decision-budget';

export type { ISMCTSConfig } from './ismcts.types';
export { DEFAULT_ISMCTS_CONFIG } from './ismcts.types';

export class ISMCTS {
  private config: ISMCTSConfig;
  private informationSet: InformationSet;
  private ourPlayerId: string;

  constructor(informationSet: InformationSet, ourPlayerId: string, config: Partial<ISMCTSConfig> = {}) {
    this.config = { ...DEFAULT_ISMCTS_CONFIG, ...config };
    this.informationSet = informationSet;
    this.ourPlayerId = ourPlayerId;
  }

  selectCard(context: GameContext, playableCards: Card[]): Card {
    if (playableCards.length === 0) throw new Error('No playable cards');
    if (playableCards.length === 1) return playableCards[0];

    const root = createNode(null, null, this.ourPlayerId);
    let iterations = 0;

    // Anytime search: stop at the decision deadline with the best move so far.
    while (iterations < this.config.iterations) {
      if (isBudgetExhausted(context.budget)) break;

      const determinization = this.sampleDeterminization(context);
      const { node, reward } = this.selectAndSimulate(root, determinization, context, playableCards);
      this.backpropagate(node, reward);
      iterations++;
    }

    return this.selectBestAction(root, playableCards);
  }

  private sampleDeterminization(context: GameContext): Determinization {
    const hands = this.config.informedSampler
      ? this.config.informedSampler()
      : this.informationSet.sampleDeterminization(context.hand.length);

    hands.set(this.ourPlayerId, [...context.hand]);

    return {
      hands,
      trickCards: [...context.currentTrickCards],
      tricksWon: new Map(),
      lead: context.lead,
      trumpSuit: context.trumpSuit,
      numPlayers: context.numPlayers,
      cardRules: context.cardRules,
    };
  }

  private selectAndSimulate(
    root: ISMCTSNode,
    det: Determinization,
    context: GameContext,
    playableCards: Card[]
  ): { node: ISMCTSNode; reward: number } {
    let node = root;
    let depth = 0;

    for (const card of playableCards) {
      const key = cardToKey(card);
      if (!node.children.has(key)) {
        node.children.set(key, createNode(card, node, this.getNextPlayer(context)));
      }
      const childNode = node.children.get(key);
      if (childNode) childNode.availabilityCount++;
    }

    while (depth < this.config.maxDepth) {
      const legalActions = getLegalActionsForPlayer(det, node.playerToMove);
      if (legalActions.length === 0) {
        return { node, reward: evaluateState(det, context, this.ourPlayerId) };
      }

      const unexpanded = legalActions.filter(card => !node.children.has(cardToKey(card)));
      if (unexpanded.length > 0) {
        const action = unexpanded[Math.floor(Math.random() * unexpanded.length)];
        const child = createNode(action, node, this.getNextPlayer(context, node.playerToMove));
        child.availabilityCount = 1;
        node.children.set(cardToKey(action), child);

        const reward = this.simulate(child, det, context, depth + 1);
        return { node: child, reward };
      }

      node = this.selectChild(node, legalActions);
      node.availabilityCount++;
      depth++;

      if (node.action && node.parent) {
        applyAction(det, node.action, node.parent.playerToMove);
      }
    }

    return { node, reward: evaluateState(det, context, this.ourPlayerId) };
  }

  private calculateAdaptiveExplorationConstant(node: ISMCTSNode): number {
    const visitedChildren = [...node.children.values()].filter(c => c.visits > 0);
    if (visitedChildren.length < 2) return this.config.explorationConstant;

    const qValues = visitedChildren.map(c => c.totalReward / c.visits);
    const mean = qValues.reduce((a, b) => a + b, 0) / qValues.length;
    const variance = qValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / qValues.length;
    const sigma = Math.sqrt(variance);
    const adaptiveC = Math.max(0.5, Math.min(3.0, 2 * sigma));

    return sigma > 0.01 ? adaptiveC : this.config.explorationConstant;
  }

  private selectChild(node: ISMCTSNode, legalActions: Card[]): ISMCTSNode {
    let bestScore = -Infinity;
    let bestChild: ISMCTSNode | null = null;
    const explorationConstant = this.calculateAdaptiveExplorationConstant(node);

    for (const action of legalActions) {
      const child = node.children.get(cardToKey(action));
      if (!child) continue;
      // An unvisited move has infinite UCB priority (its mean reward would be 0/0).
      if (child.visits === 0 || child.availabilityCount === 0) return child;

      const exploitation = child.totalReward / child.visits;
      // ISMCTS UCB: the parent count is how often this move was available.
      const exploration = explorationConstant * Math.sqrt(Math.log(child.availabilityCount) / child.visits);
      const score = exploitation + exploration;

      if (score > bestScore) {
        bestScore = score;
        bestChild = child;
      }
    }

    if (!bestChild) {
      const randomAction = legalActions[Math.floor(Math.random() * legalActions.length)];
      return node.children.get(cardToKey(randomAction)) || createNode(randomAction, node, this.ourPlayerId);
    }

    return bestChild;
  }

  private simulate(node: ISMCTSNode, det: Determinization, context: GameContext, depth: number): number {
    const simDet = copyDeterminization(det);
    let simDepth = depth;
    let currentPlayer = node.playerToMove;

    while (simDepth < this.config.maxDepth) {
      const legalActions = getLegalActionsForPlayer(simDet, currentPlayer);
      if (legalActions.length === 0) break;

      const action = this.selectSimulationAction(legalActions, simDet, context);
      applyAction(simDet, action, currentPlayer);
      currentPlayer = this.getNextPlayer(context, currentPlayer);
      simDepth++;
    }

    return evaluateState(simDet, context, this.ourPlayerId);
  }

  private selectSimulationAction(actions: Card[], det: Determinization, context: GameContext): Card {
    if (Math.random() < 0.15) {
      return actions[Math.floor(Math.random() * actions.length)];
    }

    const ourHand = det.hands.get(this.ourPlayerId) || [];
    const tricksNeeded = Math.max(0, (context.myBid ?? 0) - context.myTricksWon);
    const tricksRemaining = ourHand.length;
    const needToWin = tricksNeeded > 0;
    const needToLose = tricksNeeded <= 0 && tricksRemaining > 0;

    if (needToWin) {
      const winningCards = actions.filter(card =>
        wouldWinTrick(card, det.trickCards, det.trumpSuit, det.cardRules));
      if (winningCards.length > 0) return getLowestCard(winningCards);
      return getLowestCard(actions);
    }

    if (needToLose) {
      const losingCards = actions.filter(card =>
        !wouldWinTrick(card, det.trickCards, det.trumpSuit, det.cardRules));
      if (losingCards.length > 0) return getHighestCard(losingCards);
      return getLowestCard(actions);
    }

    return getLowestCard(actions);
  }

  private backpropagate(node: ISMCTSNode, reward: number): void {
    let current: ISMCTSNode | null = node;
    while (current !== null) {
      current.visits++;
      current.totalReward += reward;
      current = current.parent;
    }
  }

  private selectBestAction(root: ISMCTSNode, playableCards: Card[]): Card {
    let bestVisits = -1;
    let bestCard = playableCards[0];

    for (const card of playableCards) {
      const child = root.children.get(cardToKey(card));
      if (child && child.visits > bestVisits) {
        bestVisits = child.visits;
        bestCard = card;
      }
    }

    return bestCard;
  }

  private getNextPlayer(context: GameContext, currentPlayer?: string): string {
    const players = context.playerIds;
    const idx = currentPlayer ? players.indexOf(currentPlayer) : players.indexOf(this.ourPlayerId);
    return players[(idx + 1) % players.length];
  }
}

export function createISMCTS(
  informationSet: InformationSet,
  ourPlayerId: string,
  config?: Partial<ISMCTSConfig>
): ISMCTS {
  return new ISMCTS(informationSet, ourPlayerId, config);
}
