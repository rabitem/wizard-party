/**
 * Decision Budget
 *
 * Every bot decision gets a wall-clock deadline. Search algorithms are anytime:
 * they check the budget between iterations or samples and return the best answer
 * found so far, so an Expert bot cannot block the room's event loop for seconds.
 * The clock is a port, so tests can run a budget out deterministically.
 */

import { systemClock, type IClock } from '../ports/clock.port';
import { BOT_DECISION_BUDGET } from '../constants/bot-ai.constants';

export interface DecisionBudget {
  readonly clock: IClock;
  /** Clock time (ms) by which the decision must be made. */
  readonly deadline: number;
}

/**
 * A budget of `budgetMs` from now (clamped to 0..BOT_DECISION_BUDGET.MAX_MS).
 */
export function createDecisionBudget(
  clock: IClock = systemClock,
  budgetMs: number = BOT_DECISION_BUDGET.DEFAULT_MS
): DecisionBudget {
  const ms = Number.isFinite(budgetMs) ? budgetMs : BOT_DECISION_BUDGET.DEFAULT_MS;
  const clamped = Math.min(BOT_DECISION_BUDGET.MAX_MS, Math.max(0, ms));
  return { clock, deadline: clock.now() + clamped };
}

export function isBudgetExhausted(budget: DecisionBudget | undefined): boolean {
  return budget !== undefined && budget.clock.now() >= budget.deadline;
}

/**
 * Iteration cap scaled to the cards still in play: searches over small hands
 * converge with far fewer samples than over a full 20-card hand.
 */
export function scaleIterations(
  maxIterations: number,
  cardsInHand: number,
  fullHand: number = BOT_DECISION_BUDGET.FULL_HAND_CARDS
): number {
  const share = Math.min(1, Math.max(0, cardsInHand) / Math.max(1, fullHand));
  return Math.max(1, Math.ceil(maxIterations * Math.max(share, BOT_DECISION_BUDGET.MIN_ITERATION_SHARE)));
}
