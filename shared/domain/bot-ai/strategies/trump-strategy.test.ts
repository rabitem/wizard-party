import { afterEach, describe, expect, it, vi } from 'vitest';

import { ALL_SUITS, Suit } from '../../value-objects/card-types';
import { BotDifficulty, BotPersonality, DEFAULT_BOT_CONFIGS } from '../types';
import { createTrumpStrategy } from './trump-strategy';
import { jester, n, wizard } from '../bot-ai.fixtures';

const BALANCED = (difficulty: BotDifficulty) => ({ difficulty, personality: BotPersonality.BALANCED });

describe('trump selection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([BotDifficulty.MEDIUM, BotDifficulty.HARD, BotDifficulty.EXPERT])(
    'names the suit with the strongest holding, not the longest one (difficulty %i)',
    (difficulty) => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);
      // Three low Elves against King and Queen of Dwarves.
      const hand = [n(Suit.ELVES, 2), n(Suit.ELVES, 3), n(Suit.ELVES, 4), n(Suit.DWARVES, 13), n(Suit.DWARVES, 12), wizard(0)];

      expect(createTrumpStrategy(difficulty).selectTrump(hand, BALANCED(difficulty))).toBe(Suit.DWARVES);
    }
  );

  it('names the suit it holds most cards of at Easy', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const hand = [n(Suit.HUMANS, 2), n(Suit.HUMANS, 3), n(Suit.HUMANS, 4), n(Suit.GIANTS, 13), n(Suit.GIANTS, 12)];

    expect(createTrumpStrategy(BotDifficulty.EASY).selectTrump(hand, BALANCED(BotDifficulty.EASY))).toBe(Suit.HUMANS);
  });

  it.each([
    BotDifficulty.NOVICE,
    BotDifficulty.EASY,
    BotDifficulty.MEDIUM,
    BotDifficulty.HARD,
    BotDifficulty.EXPERT,
  ])('always names one of the four suits, even with no suit card or by mistake (difficulty %i)', (difficulty) => {
    const strategy = createTrumpStrategy(difficulty);
    for (const draw of [0, 0.3, 0.99]) {
      vi.spyOn(Math, 'random').mockReturnValue(draw);
      for (const hand of [[wizard(0), jester(0)], [n(Suit.GIANTS, 7)]]) {
        expect(ALL_SUITS).toContain(strategy.selectTrump(hand, DEFAULT_BOT_CONFIGS[difficulty]));
      }
    }
  });
});
