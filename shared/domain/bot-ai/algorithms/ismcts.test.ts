import { afterEach, describe, expect, it, vi } from 'vitest';

import { Card } from '../../entities/card';
import { createSeededRandom } from '../../ports/random.port';
import { Suit } from '../../value-objects/card-types';
import { BOT_ID, botContext } from '../bot-ai.fixtures';
import { createExpertPlayingStrategy } from '../strategies/expert-strategies';
import { BotDifficulty, BotPersonality } from '../types';

const SEEDS = Array.from({ length: 40 }, (_, index) => index + 1);
const EXPERT = { difficulty: BotDifficulty.EXPERT, personality: BotPersonality.BALANCED };

const elves9 = Card.createNumberCard(Suit.ELVES, 9);
const jester = Card.createJester(0);

/**
 * Giants are trump, Elves 5 and Elves 3 are in the trick and the Expert plays last
 * holding Elves 9 and a Jester: the Elves 9 takes the trick, the Jester loses it.
 */
function playLastToTrick(bid: number, seed: number): Card {
  const random = createSeededRandom(seed);
  vi.spyOn(Math, 'random').mockImplementation(() => random.next());
  const context = botContext({
    hand: [elves9, jester],
    playerIds: ['p0', 'p1', BOT_ID],
    trick: [
      { playerId: 'p0', card: Card.createNumberCard(Suit.ELVES, 5) },
      { playerId: 'p1', card: Card.createNumberCard(Suit.ELVES, 3) },
    ],
    bids: { p0: 1, p1: 1, [BOT_ID]: bid },
  });
  return createExpertPlayingStrategy().selectCard(context, [elves9, jester], EXPERT);
}

describe('ISMCTS card play (Expert)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    { bid: 0, card: jester, goal: 'ducks with the Jester' },
    { bid: 1, card: elves9, goal: 'takes the trick with Elves 9' },
  ])('with bid $bid it $goal in at least 36 of 40 seeds', ({ bid, card }) => {
    const plays = SEEDS.filter((seed) => playLastToTrick(bid, seed).id === card.id);
    expect(plays.length).toBeGreaterThanOrEqual(36);
  });
});
