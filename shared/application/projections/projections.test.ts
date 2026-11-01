import { describe, expect, it } from 'vitest';

import {
  Card,
  Game,
  GamePhase,
  Player,
  Suit,
  Trick,
  ensureRulesetConfig,
  type IRoomSettings,
} from '../../domain';
import { createPersonalizedState } from './personalized-state';
import { getLegalPlays } from './legal-plays';

const ROOM: IRoomSettings = { name: 'Projection', isPublic: true, maxPlayers: 6 };

/** Three players with one card each, bidding in round 1 of 1; p3 deals and bids last. */
function biddingGame(hiddenBids: boolean): Game {
  const game = new Game('projection', 'p1');
  game.setRulesetConfig(ensureRulesetConfig({ bidding: { hiddenBids } }));
  game.players = ['p1', 'p2', 'p3'].map((id, index) => {
    const player = new Player(id, id);
    player.receiveCards([Card.createNumberCard(Suit.GIANTS, index + 1)]);
    return player;
  });
  game.phase = GamePhase.BIDDING;
  game.currentRound = 1;
  game.maxRounds = 1;
  game.dealerIndex = 2;
  game.currentPlayerIndex = 0;
  return game;
}

describe('createPersonalizedState', () => {
  it('shows the forbidden bid only to the last bidder while bids are hidden', () => {
    const game = biddingGame(true);
    game.placeBid('p1', 1);
    game.placeBid('p2', 0);

    const lastBidder = createPersonalizedState(game, 'p3', ROOM);
    const observer = createPersonalizedState(game, 'p1', ROOM);

    expect(lastBidder.forbiddenBid).toBe(0);
    expect(observer.forbiddenBid).toBeNull();
    expect(observer.players.map((p) => p.bid)).toEqual([1, null, null]);
    expect(lastBidder.players.map((p) => p.bid)).toEqual([null, null, null]);
  });

  it('keeps the forbidden bid public when bids are public', () => {
    const game = biddingGame(false);
    game.placeBid('p1', 1);
    game.placeBid('p2', 0);

    expect(createPersonalizedState(game, 'p1', ROOM).forbiddenBid).toBe(0);
    expect(createPersonalizedState(game, 'p1', ROOM).players.map((p) => p.bid)).toEqual([1, 0, null]);
  });

  it('never leaks another hand or the kicked ids, and sends only the shown room settings', () => {
    const game = biddingGame(false);
    game.kickedPlayerIds.add('kicked');

    const state = createPersonalizedState(game, 'p2', ROOM);

    expect(state.players[0].hand.map((c) => c.id)).toEqual(['hidden']);
    expect(state.players[1].hand.map((c) => c.id)).toEqual(['GIANTS-2']);
    expect(state.kickedPlayerIds).toBeUndefined();
    expect(state.roomSettings).toEqual({ name: 'Projection', isPublic: true, maxPlayers: 6 });
  });
});

describe('getLegalPlays', () => {
  function playingState(trickCards: Card[], hand: Card[]) {
    const game = new Game('legal', 'p1');
    game.players = ['p1', 'p2', 'p3'].map((id) => new Player(id, id));
    game.players[2].receiveCards(hand);
    game.phase = GamePhase.PLAYING;
    game.currentRound = 3;
    game.maxRounds = 3;
    game.currentTrick = new Trick(Suit.HUMANS);
    trickCards.forEach((card, index) => game.currentTrick?.playCard(`p${index + 1}`, card));
    game.currentPlayerIndex = trickCards.length;
    return game.toJSON();
  }

  const elves2 = Card.createNumberCard(Suit.ELVES, 2);
  const dwarves13 = Card.createNumberCard(Suit.DWARVES, 13);

  it('makes the player follow the first number card after a led Jester', () => {
    const state = playingState([Card.createJester(0), Card.createNumberCard(Suit.ELVES, 5)], [elves2, dwarves13]);
    expect(getLegalPlays(state, 'p3').map((c) => c.id)).toEqual(['ELVES-2']);
  });

  it('is empty while the table is paused, and the same once it resumes', () => {
    const state = playingState([], [elves2, dwarves13]);
    const paused = {
      ...state,
      currentPlayerIndex: 2,
      pauseState: { pausedForPlayerId: 'p1', pausedForPlayerName: 'p1', pausedAt: 0, previousPhase: GamePhase.PLAYING, timeoutDuration: 1 },
    };
    expect(getLegalPlays(paused, 'p3')).toEqual([]);
    expect(getLegalPlays({ ...paused, pauseState: null }, 'p3')).toHaveLength(2);
  });

  it('lets the player discard after a led Wizard, ignoring a stale serialized lead suit', () => {
    const state = playingState([Card.createWizard(0), Card.createNumberCard(Suit.ELVES, 5)], [elves2, dwarves13]);
    if (!state.currentTrick) throw new Error('No trick');
    state.currentTrick.leadSuit = Suit.ELVES;
    expect(getLegalPlays(state, 'p3').map((c) => c.id)).toEqual(['ELVES-2', 'DWARVES-13']);
  });

  it('is empty when it is not the player\'s turn or not playing', () => {
    const state = playingState([], [elves2]);
    expect(getLegalPlays(state, 'p3')).toEqual([]);
    expect(getLegalPlays({ ...state, phase: GamePhase.BIDDING, currentPlayerIndex: 2 }, 'p3')).toEqual([]);
    expect(getLegalPlays(null, 'p3')).toEqual([]);
  });
});
