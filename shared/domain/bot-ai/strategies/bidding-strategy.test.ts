import { afterEach, describe, expect, it, vi } from 'vitest';

import { Card } from '../../entities/card';
import { Game, GamePhase } from '../../entities/game';
import { Player } from '../../entities/player';
import { Suit } from '../../value-objects/card-types';
import { BOT_ID, botContext } from '../bot-ai.fixtures';
import { createBotBrain } from '../bot-brain';
import { BotDifficulty, BotPersonality } from '../types';
import { createExpertBiddingStrategy } from './expert-strategies';

/** Round 1 with three players where the first two bids leave 0 as the forbidden bid for the last bidder. */
function lastBidderFacingForbiddenZero(): { game: Game; lastBidderId: string } {
  const game = new Game('room', 'p0');
  for (const id of ['p0', 'p1', 'p2']) game.addPlayer(new Player(id, id, true));
  game.start();
  if (game.phase === GamePhase.TRUMP_SELECTION) game.selectTrump(game.getDealer().id, Suit.GIANTS);

  game.placeBid(game.getCurrentPlayer().id, 1);
  game.placeBid(game.getCurrentPlayer().id, 0);
  expect(game.getForbiddenBid()).toBe(0);
  return { game, lastBidderId: game.getCurrentPlayer().id };
}

const DIFFICULTIES = [
  BotDifficulty.NOVICE,
  BotDifficulty.EASY,
  BotDifficulty.MEDIUM,
  BotDifficulty.HARD,
  BotDifficulty.EXPERT,
];

describe('bot bidding', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(DIFFICULTIES)('never names the forbidden bid when making an intentional mistake (difficulty %i)', (difficulty) => {
    const { game, lastBidderId } = lastBidderFacingForbiddenZero();
    const brain = createBotBrain(difficulty);
    // Math.random() === 0 forces the error branch, whose naive choice is a bid of 0.
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const bid = brain.calculateBid(game, lastBidderId);

    expect(bid).not.toBe(game.getForbiddenBid());
    vi.restoreAllMocks();
    expect(() => game.placeBid(lastBidderId, bid)).not.toThrow();
  });

  it('Expert bids every trick when four Wizards guarantee them', () => {
    const context = botContext({
      hand: [0, 1, 2, 3].map((index) => Card.createWizard(index)),
      playerIds: [BOT_ID, 'p1', 'p2'],
    });

    const bid = createExpertBiddingStrategy().calculateBid(context, {
      difficulty: BotDifficulty.EXPERT,
      personality: BotPersonality.BALANCED,
    });

    expect(bid).toBe(4);
  });

  it.each(DIFFICULTIES.slice(0, 3))('only produces legal bids across many random decisions (difficulty %i)', (difficulty) => {
    const brain = createBotBrain(difficulty);
    for (let i = 0; i < 100; i++) {
      const { game, lastBidderId } = lastBidderFacingForbiddenZero();
      expect(brain.calculateBid(game, lastBidderId)).not.toBe(0);
    }
  });
});
