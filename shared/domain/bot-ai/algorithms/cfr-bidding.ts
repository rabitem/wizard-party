/**
 * Counterfactual Regret Minimization (CFR) for Bidding
 */

import { Card } from '../../entities/card';
import { Suit } from '../../value-objects/card-types';
import {
  HandSignature,
  BiddingInfoSet,
  CFRNode,
  CFRConfig,
  DEFAULT_CFR_CONFIG,
} from './cfr-bidding.types';
import {
  evaluateBiddingOutcome,
  createHandSignature,
} from './cfr-bidding.evaluation';
import {
  sampleHands,
  generateBidCombinations,
} from './cfr-bidding.utils';

export type { CFRConfig } from './cfr-bidding.types';
export { DEFAULT_CFR_CONFIG } from './cfr-bidding.types';

/**
 * CFR Bidding Trainer - trains bidding strategies through self-play
 */
interface UpdateRegretsParams {
  hands: HandSignature[];
  bids: number[];
  numPlayers: number;
  round: number;
  strategies: number[][];
  reachProb: number;
  outcome: number[];
  iterationNum: number;
}

export class CFRBiddingTrainer {
  private nodes: Map<string, CFRNode> = new Map();
  private config: CFRConfig;

  constructor(config: Partial<CFRConfig> = {}) {
    this.config = { ...DEFAULT_CFR_CONFIG, ...config };
  }

  train(numPlayers: number = 4, maxRound: number = 15): void {
    for (let i = 0; i < this.config.iterations; i++) {
      const round = Math.floor(Math.random() * maxRound) + 1;
      const hands = sampleHands(numPlayers, round);
      this.cfrIteration(hands, numPlayers, round, i);
    }
  }

  getStrategy(infoSet: BiddingInfoSet): number[] {
    const key = this.infoSetToKey(infoSet);
    const node = this.nodes.get(key);

    if (!node) {
      const numActions = infoSet.round + 1;
      return new Array(numActions).fill(1 / numActions);
    }

    return this.getAverageStrategy(node, infoSet.round + 1);
  }

  sampleBid(infoSet: BiddingInfoSet): number {
    const strategy = this.getStrategy(infoSet);
    const validStrategy = strategy.map((prob, bid) =>
      infoSet.isForbiddenBid[bid] ? 0 : prob
    );

    const sum = validStrategy.reduce((a, b) => a + b, 0);
    if (sum <= 0) {
      const validBids = strategy.map((_, bid) => !infoSet.isForbiddenBid[bid]);
      const validIdx = validBids.findIndex(v => v);
      return validIdx >= 0 ? validIdx : 0;
    }

    const normalized = validStrategy.map(p => p / sum);
    const r = Math.random();
    let cumProb = 0;

    for (let bid = 0; bid < normalized.length; bid++) {
      cumProb += normalized[bid];
      if (r <= cumProb) return bid;
    }

    return normalized.length - 1;
  }

  getBestBid(infoSet: BiddingInfoSet): number {
    const strategy = this.getStrategy(infoSet);
    let bestBid = 0;
    let bestProb = 0;

    for (let bid = 0; bid < strategy.length; bid++) {
      if (!infoSet.isForbiddenBid[bid] && strategy[bid] > bestProb) {
        bestProb = strategy[bid];
        bestBid = bid;
      }
    }

    return bestBid;
  }

  createInfoSet(params: {
    hand: Card[];
    trumpSuit: Suit | null;
    position: number;
    numPlayers: number;
    previousBids: number[];
    forbiddenBid: number | null;
  }): BiddingInfoSet {
    const { hand, trumpSuit, position, numPlayers, previousBids, forbiddenBid } = params;
    const signature = createHandSignature(hand, trumpSuit);

    const isForbiddenBid = new Array(hand.length + 1).fill(false);
    if (forbiddenBid !== null && forbiddenBid >= 0 && forbiddenBid <= hand.length) {
      isForbiddenBid[forbiddenBid] = true;
    }

    return {
      handSignature: signature,
      position,
      numPlayers,
      previousBids,
      round: hand.length,
      isForbiddenBid,
    };
  }

  exportStrategy(): string {
    const data: Record<string, { regretSum: number[]; strategySum: number[] }> = {};

    for (const [key, node] of this.nodes) {
      data[key] = { regretSum: node.regretSum, strategySum: node.strategySum };
    }

    return JSON.stringify(data);
  }

  importStrategy(json: string): void {
    const data = JSON.parse(json) as Record<string, { regretSum: number[]; strategySum: number[] }>;
    this.nodes.clear();

    for (const [key, nodeData] of Object.entries(data)) {
      this.nodes.set(key, {
        regretSum: nodeData.regretSum,
        strategySum: nodeData.strategySum,
        visits: nodeData.strategySum.reduce((a, b) => a + b, 0),
      });
    }
  }

  private cfrIteration(
    hands: HandSignature[],
    numPlayers: number,
    round: number,
    iterationNum: number
  ): number[] {
    const utilities = new Array(numPlayers).fill(0);
    const allBids = generateBidCombinations(numPlayers, round);

    for (const bids of allBids) {
      const { reachProb, strategies } = this.calculateReachProbability(
        hands, bids, numPlayers, round
      );

      if (reachProb < 1e-10) continue;

      const outcome = evaluateBiddingOutcome(hands, bids, round, numPlayers);
      this.updateRegrets({ hands, bids, numPlayers, round, strategies, reachProb, outcome, iterationNum });

      for (let p = 0; p < numPlayers; p++) {
        utilities[p] += outcome[p] * reachProb;
      }
    }

    return utilities;
  }

  private calculateReachProbability(
    hands: HandSignature[],
    bids: number[],
    numPlayers: number,
    round: number
  ): { reachProb: number; strategies: number[][] } {
    let reachProb = 1.0;
    const strategies: number[][] = [];

    for (let p = 0; p < numPlayers; p++) {
      const infoSet = this.buildInfoSet(hands[p], p, numPlayers, bids.slice(0, p), round);
      const strategy = this.getRegretMatchingStrategy(infoSet);
      strategies.push(strategy);
      reachProb *= strategy[bids[p]];
    }

    return { reachProb, strategies };
  }

  private updateRegrets(params: UpdateRegretsParams): void {
    const { hands, bids, numPlayers, round, strategies, reachProb, outcome, iterationNum } = params;

    for (let p = 0; p < numPlayers; p++) {
      const infoSet = this.buildInfoSet(hands[p], p, numPlayers, bids.slice(0, p), round);
      const key = this.infoSetToKey(infoSet);
      const node = this.getOrCreateNode(key, round + 1);
      const oppReach = reachProb / strategies[p][bids[p]];

      for (let bid = 0; bid <= round; bid++) {
        if (bid === bids[p]) continue;

        const altBids = [...bids];
        altBids[p] = bid;
        const altOutcome = evaluateBiddingOutcome(hands, altBids, round, numPlayers);
        const regret = (altOutcome[p] - outcome[p]) * oppReach;
        node.regretSum[bid] += regret;
      }

      const weight = this.config.useCFRPlus
        ? Math.pow(iterationNum + 1, this.config.discountFactor)
        : 1;

      for (let bid = 0; bid <= round; bid++) {
        node.strategySum[bid] += strategies[p][bid] * weight;
      }

      node.visits++;
    }
  }

  private getRegretMatchingStrategy(infoSet: BiddingInfoSet): number[] {
    const key = this.infoSetToKey(infoSet);
    const node = this.getOrCreateNode(key, infoSet.round + 1);

    const positiveRegrets = node.regretSum.map(r => Math.max(0, r));
    const sum = positiveRegrets.reduce((a, b) => a + b, 0);

    if (sum > 0) {
      return positiveRegrets.map(r => r / sum);
    }

    const numActions = infoSet.round + 1;
    return new Array(numActions).fill(1 / numActions);
  }

  private getAverageStrategy(node: CFRNode, numActions: number): number[] {
    const sum = node.strategySum.reduce((a, b) => a + b, 0);
    if (sum > 0) return node.strategySum.map(s => s / sum);
    return new Array(numActions).fill(1 / numActions);
  }

  private getOrCreateNode(key: string, numActions: number): CFRNode {
    let node = this.nodes.get(key);

    if (!node) {
      node = {
        regretSum: new Array(numActions).fill(0),
        strategySum: new Array(numActions).fill(0),
        visits: 0,
      };
      this.nodes.set(key, node);
    }

    return node;
  }

  private buildInfoSet(
    hand: HandSignature,
    position: number,
    numPlayers: number,
    previousBids: number[],
    round: number
  ): BiddingInfoSet {
    return {
      handSignature: hand,
      position,
      numPlayers,
      previousBids,
      round,
      isForbiddenBid: new Array(round + 1).fill(false),
    };
  }

  private infoSetToKey(infoSet: BiddingInfoSet): string {
    const { handSignature: h, position, numPlayers, previousBids, round } = infoSet;
    const totalPrevBids = previousBids.reduce((a, b) => a + b, 0);
    const avgPrevBid = previousBids.length > 0 ? Math.round(totalPrevBids / previousBids.length) : 0;

    return [
      h.wizardCount, h.jesterCount, h.trumpStrength, h.offSuitStrength,
      h.voidCount, position, numPlayers, avgPrevBid, round,
    ].join('|');
  }
}

let globalCFRTrainer: CFRBiddingTrainer | null = null;

export function getCFRTrainer(): CFRBiddingTrainer {
  if (!globalCFRTrainer) {
    globalCFRTrainer = new CFRBiddingTrainer();
  }
  return globalCFRTrainer;
}
