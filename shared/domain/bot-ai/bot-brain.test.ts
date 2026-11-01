import { describe, expect, it } from 'vitest';

import { GamePhase } from '../entities/game';
import { SPECIAL_CARD_TYPES } from '../value-objects/card-types';
import { BotDifficulty } from './types';
import { botTable, playWithBrains, withSeededMath, type BotStep } from './bot-ai.fixtures';

const ALL_DIFFICULTIES = [
  BotDifficulty.NOVICE,
  BotDifficulty.EASY,
  BotDifficulty.MEDIUM,
  BotDifficulty.HARD,
  BotDifficulty.EXPERT,
];

const RULESETS: { name: string; rules: unknown }[] = [
  { name: 'classic', rules: { structure: { customRoundCount: 4, descendingRounds: true } } },
  {
    name: 'last Wizard and last Jester win',
    rules: {
      card: { lastWizardWins: true, lastJesterWins: true },
      structure: { customRoundCount: 4, descendingRounds: true },
    },
  },
  {
    name: 'hidden bids',
    rules: { bidding: { hiddenBids: true }, structure: { customRoundCount: 4, descendingRounds: true } },
  },
  {
    name: 'every expansion special card',
    rules: {
      expansions: { specialCards: [...SPECIAL_CARD_TYPES] },
      structure: { customRoundCount: 5, descendingRounds: true },
    },
  },
];

function bidsOf(steps: BotStep[]) {
  return steps.filter((step): step is Extract<BotStep, { kind: 'bid' }> => step.kind === 'bid');
}

function cardsOf(steps: BotStep[]) {
  return steps.filter((step): step is Extract<BotStep, { kind: 'card' }> => step.kind === 'card');
}

describe('BotBrain decisions accepted by the Game aggregate', () => {
  // Each seat plays at its own level, so one table exercises every strategy together.
  it.each(RULESETS)('every level only makes legal moves to the end of a game ($name)', ({ rules }) => {
    for (const seed of [1, 2]) {
      const game = botTable(seed, ALL_DIFFICULTIES, rules);

      // The aggregate throws on an illegal trump choice, bid, card, declaration or effect answer.
      const steps = withSeededMath(seed, () => playWithBrains(game, 2000));

      expect(game.phase).toBe(GamePhase.GAME_END);
      for (const step of bidsOf(steps)) {
        expect(step.bid).toBeGreaterThanOrEqual(0);
        expect(step.bid).toBeLessThanOrEqual(step.cards);
        expect(step.bid).not.toBe(step.forbidden);
      }
      for (const step of cardsOf(steps)) expect(step.legal).toContain(step.cardId);
    }
  });

  it.each(ALL_DIFFICULTIES)('respects the hook rule when it bids last (difficulty %i)', (difficulty) => {
    let hooked = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const game = botTable(seed, [difficulty, difficulty, difficulty, difficulty], {
        structure: { customRoundCount: 3 },
      });
      const steps = withSeededMath(seed, () => playWithBrains(game, 2000));
      for (const step of bidsOf(steps)) {
        if (step.forbidden === null) continue;
        hooked++;
        expect(step.bid).not.toBe(step.forbidden);
      }
    }
    // The table must actually reach hooked bids, or the assertion above proves nothing.
    expect(hooked).toBeGreaterThan(0);
  });

  it.each(ALL_DIFFICULTIES)('makes the same decisions from the same seed and deal (difficulty %i)', (difficulty) => {
    const run = () =>
      withSeededMath(42, () =>
        playWithBrains(botTable(42, [difficulty, difficulty, difficulty], { structure: { customRoundCount: 3 } }), 2000)
      );

    expect(run()).toEqual(run());
  });
});
