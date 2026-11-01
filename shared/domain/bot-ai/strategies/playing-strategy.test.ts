import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Card } from '../../entities/card';
import { Suit } from '../../value-objects/card-types';
import { legalCards } from '../bot-rules';
import { BotDifficulty, DEFAULT_BOT_CONFIGS } from '../types';
import { createPlayingStrategy } from './playing-strategy';
import { jester, n, play, positionContext, wizard, type PositionSpec } from '../bot-ai.fixtures';

const E = Suit.ELVES;
const G = Suit.GIANTS;
const H = Suit.HUMANS;

/** Last to play in a three-seat trick, Giants trump. */
function lastToPlay(trick: [Card, Card], hand: Card[], myBid: number, myTricksWon = 0) {
  const spec: PositionSpec = {
    hand,
    trumpSuit: G,
    trick: [play('p1', trick[0]), play('p2', trick[1])],
    bids: { p1: 1, p2: 1, me: myBid },
    tricksWon: { me: myTricksWon },
  };
  return positionContext(spec);
}

function leading(hand: Card[], myBid: number) {
  return positionContext({ hand, trumpSuit: G, playerIds: ['me', 'p1', 'p2'], bids: { me: myBid } });
}

/**
 * Positions with a single right answer by the rules, for the levels that claim to
 * reason about the trick (Medium: minimum winner and ducking; Hard: one-ply scoring).
 */
const SOLVED = [
  {
    name: 'ducks with the only losing card once the bid is made',
    context: () => lastToPlay([n(E, 5), n(E, 3)], [n(E, 9), jester(0)], 0),
    expected: jester(0),
  },
  {
    name: 'follows suit under the winner once the bid is made',
    context: () => lastToPlay([n(E, 5), n(E, 3)], [n(E, 9), n(E, 4), n(H, 13)], 1, 1),
    expected: n(E, 4),
  },
  {
    name: 'takes a needed trick with the lowest winning card',
    context: () => lastToPlay([n(E, 5), n(E, 10)], [n(E, 13), n(E, 11)], 2),
    expected: n(E, 11),
  },
  {
    name: 'trumps in when void in the led suit and it needs the trick',
    context: () => lastToPlay([n(E, 5), n(E, 10)], [n(G, 2), n(H, 13)], 2),
    expected: n(G, 2),
  },
];

describe.each([BotDifficulty.MEDIUM, BotDifficulty.HARD])('playing strategy (difficulty %i)', (difficulty) => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(SOLVED)('$name', ({ context, expected }) => {
    // A draw above every error rate: no intentional mistake.
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const ctx = context();
    const playable = legalCards(ctx.hand, ctx.lead);

    const card = createPlayingStrategy(difficulty).selectCard(ctx, playable, DEFAULT_BOT_CONFIGS[difficulty]);

    expect(card.id).toBe(expected.id);
  });
});

describe('playing strategy legality', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const POSITIONS = [
    { name: 'following a led suit', context: () => lastToPlay([n(E, 5), n(E, 3)], [n(E, 9), n(G, 12), wizard(0), n(H, 2)], 1) },
    { name: 'after a Wizard lead', context: () => lastToPlay([wizard(1), n(E, 3)], [n(E, 9), n(G, 12), jester(0)], 0) },
    { name: 'leading for tricks', context: () => leading([n(G, 12), wizard(0), n(H, 2)], 3) },
    { name: 'leading to lose', context: () => leading([n(G, 12), jester(1), n(H, 2)], 0) },
  ];

  const LEVELS = [BotDifficulty.NOVICE, BotDifficulty.EASY, BotDifficulty.MEDIUM, BotDifficulty.HARD];

  it.each(LEVELS.flatMap((difficulty) => POSITIONS.map((position) => ({ difficulty, ...position }))))(
    'difficulty $difficulty only plays a legal card $name, mistakes included',
    ({ difficulty, context }) => {
      const ctx = context();
      const playable = legalCards(ctx.hand, ctx.lead);
      const strategy = createPlayingStrategy(difficulty);
      // 0 forces every random branch (mistakes, Novice's random pick); 0.99 none of them.
      for (const draw of [0, 0.5, 0.99]) {
        vi.spyOn(Math, 'random').mockReturnValue(draw);
        const card = strategy.selectCard(ctx, playable, DEFAULT_BOT_CONFIGS[difficulty]);
        expect(playable.map((c) => c.id)).toContain(card.id);
      }
    }
  );
});
