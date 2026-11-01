import { describe, expect, it } from 'vitest';

import type { Card } from '../../entities/card';
import { Suit } from '../../value-objects/card-types';
import { legalCards } from '../bot-rules';
import { BotDifficulty, BotPersonality, type GameContext } from '../types';
import {
  createExpertBiddingStrategy,
  createExpertPlayingStrategy,
  type ExpertStrategyConfig,
} from './expert-strategies';
import {
  jester,
  n,
  play,
  positionContext,
  spentBudget,
  wizard,
  withSeededMath,
} from '../bot-ai.fixtures';

const PERSONALITIES = Object.values(BotPersonality);
const expert = (personality: BotPersonality) => ({ difficulty: BotDifficulty.EXPERT, personality });

const STRONG = [wizard(0), wizard(1), wizard(2), n(Suit.GIANTS, 13)];
const WEAK = [n(Suit.ELVES, 2), n(Suit.HUMANS, 3), n(Suit.DWARVES, 2), jester(0)];

/** Last bidder of four, so the hook rule applies; the forbidden bid is the one the hand wants. */
const HOOKED_BIDS: { name: string; hand: Card[]; bids: Record<string, number>; forbidden: number | null }[] = [
  { name: 'a strong hand barred from bidding every trick', hand: STRONG, bids: { p1: 0, p2: 0, p3: 0 }, forbidden: 4 },
  { name: 'a weak hand barred from bidding zero', hand: WEAK, bids: { p1: 2, p2: 1, p3: 1 }, forbidden: 0 },
  { name: 'an unrestricted first bidder', hand: STRONG, bids: {}, forbidden: null },
];

describe('ExpertBiddingStrategy', () => {
  it.each(PERSONALITIES.flatMap((personality) => HOOKED_BIDS.map((spot) => ({ personality, ...spot }))))(
    'bids in range and never the forbidden bid: $name ($personality)',
    ({ personality, hand, bids, forbidden }) => {
      const context = positionContext({
        hand,
        trumpSuit: Suit.GIANTS,
        playerIds: ['p1', 'p2', 'p3', 'me'],
        bids,
        forbiddenBid: forbidden,
      });
      for (let seed = 1; seed <= 10; seed++) {
        const bid = withSeededMath(seed, () => createExpertBiddingStrategy().calculateBid(context, expert(personality)));
        expect(bid).toBeGreaterThanOrEqual(0);
        expect(bid).toBeLessThanOrEqual(hand.length);
        expect(bid).not.toBe(forbidden);
      }
    }
  );

  it('bids more tricks with four sure winners than with four sure losers', () => {
    const bidFor = (hand: Card[]) =>
      createExpertBiddingStrategy().calculateBid(
        positionContext({ hand, trumpSuit: Suit.GIANTS, playerIds: ['me', 'p1', 'p2'] }),
        expert(BotPersonality.BALANCED)
      );

    expect(bidFor(STRONG)).toBeGreaterThan(bidFor(WEAK));
  });
});

/** Expert configurations: the default (ISMCTS with card inference) and each alternative search. */
const PLAY_CONFIGS: { name: string; config: Partial<ExpertStrategyConfig> }[] = [
  { name: 'default ISMCTS', config: {} },
  { name: 'ISMCTS without card inference', config: { useCardInference: false } },
  { name: 'EPIMC', config: { useEPIMC: true } },
  { name: 'alpha-beta', config: { useISMCTS: false, useAlphaBeta: true, alphaBetaDepth: 3 } },
  { name: 'heuristics', config: { useISMCTS: false } },
];

/** Positions as one seat sees them mid-round: a suit to follow, a Wizard lead, a lead of our own. */
const PLAY_POSITIONS: { name: string; context: () => GameContext }[] = [
  {
    name: 'following suit after a void was shown',
    context: () =>
      positionContext({
        hand: [n(Suit.ELVES, 9), n(Suit.ELVES, 2), n(Suit.GIANTS, 12), wizard(0)],
        trumpSuit: Suit.GIANTS,
        completedTricks: [[play('p1', n(Suit.HUMANS, 4)), play('p2', n(Suit.DWARVES, 6)), play('me', n(Suit.HUMANS, 9))]],
        trick: [play('p1', n(Suit.ELVES, 5)), play('p2', n(Suit.ELVES, 11))],
        bids: { p1: 1, p2: 2, me: 2 },
        tricksWon: { me: 1 },
      }),
  },
  {
    name: 'after a Wizard lead',
    context: () =>
      positionContext({
        hand: [n(Suit.ELVES, 9), jester(1), n(Suit.GIANTS, 3)],
        trumpSuit: Suit.GIANTS,
        trick: [play('p1', wizard(1))],
        bids: { p1: 1, p2: 0, me: 0 },
      }),
  },
  {
    name: 'leading with hidden bids',
    context: () =>
      positionContext({
        hand: [n(Suit.HUMANS, 13), n(Suit.HUMANS, 1), jester(0), n(Suit.DWARVES, 7), n(Suit.GIANTS, 10)],
        trumpSuit: Suit.GIANTS,
        playerIds: ['me', 'p1', 'p2', 'p3'],
        bids: { me: 2 },
      }),
  },
];

describe('ExpertPlayingStrategy', () => {
  it.each(PLAY_CONFIGS.flatMap((cfg) => PLAY_POSITIONS.map((position) => ({ ...cfg, position }))))(
    '$name only plays a legal card $position.name',
    ({ config, position }) => {
      for (let seed = 1; seed <= 3; seed++) {
        const context = position.context();
        const playable = legalCards(context.hand, context.lead);
        const card = withSeededMath(seed, () =>
          createExpertPlayingStrategy(config).selectCard(context, playable, expert(BotPersonality.AGGRESSIVE))
        );
        expect(playable.map((c) => c.id)).toContain(card.id);
      }
    }
  );

  it.each(PLAY_CONFIGS)('$name still answers with a legal card when the budget is already spent', ({ config }) => {
    const context = { ...PLAY_POSITIONS[0].context(), budget: spentBudget() };
    const playable = legalCards(context.hand, context.lead);

    const card = withSeededMath(1, () =>
      createExpertPlayingStrategy(config).selectCard(context, playable, expert(BotPersonality.CHAOTIC))
    );

    expect(playable.map((c) => c.id)).toContain(card.id);
  });

  it.each(PLAY_CONFIGS)('$name makes the same choice from the same seed', ({ config }) => {
    const decide = () =>
      withSeededMath(77, () => {
        const context = PLAY_POSITIONS[2].context();
        return createExpertPlayingStrategy(config)
          .selectCard(context, legalCards(context.hand, context.lead), expert(BotPersonality.BALANCED)).id;
      });

    expect(decide()).toBe(decide());
  });

  it('ducks with the heuristics once its bid is made', () => {
    const context = positionContext({
      hand: [n(Suit.ELVES, 9), jester(0)],
      trumpSuit: Suit.GIANTS,
      trick: [play('p1', n(Suit.ELVES, 5)), play('p2', n(Suit.ELVES, 3))],
      bids: { p1: 1, p2: 1, me: 0 },
    });
    const card = createExpertPlayingStrategy({ useISMCTS: false })
      .selectCard(context, legalCards(context.hand, context.lead), expert(BotPersonality.BALANCED));

    expect(card.id).toBe(jester(0).id);
  });
});
