import { describe, expect, it } from 'vitest';

import {
  BidAlreadyPlacedError,
  Card,
  DEFAULT_RULESET_CONFIG,
  ForbiddenBidError,
  Game,
  GamePausedError,
  GamePhase,
  InvalidBidError,
  InvalidPhaseError,
  InvalidTrumpSuitError,
  NoTrumpNotAllowedError,
  NotTrumpChooserError,
  Player,
  Suit,
  canTransitionPhase,
  createManualClock,
  ensureRulesetConfig,
  type IGameState,
} from '../index';
import { SEED, seededGame, startInBidding } from './game-aggregate.fixtures';

/** Three players with one card each, bidding in round 1 of 1. */
function stagedBidding(rules: Parameters<Game['setRulesetConfig']>[0] = DEFAULT_RULESET_CONFIG): Game {
  const game = new Game('staged', 'p1');
  game.setRulesetConfig(rules);
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

describe('Game aggregate invariants', () => {
  describe('bidding', () => {
    it.each([
      ['null', null],
      ['a string', '1'],
      ['a fraction', 0.5],
      ['an array', [1]],
      ['a boolean', true],
      ['a negative number', -1],
      ['more than the cards dealt', 2],
      ['NaN', Number.NaN],
    ])('rejects %s as a bid without changing the game', (_label, bid) => {
      const game = stagedBidding();

      expect(() => game.placeBid('p1', bid as never)).toThrow(InvalidBidError);
      expect(game.players[0].bid).toBeNull();
      expect(game.currentPlayerIndex).toBe(0);
      expect(game.phase).toBe(GamePhase.BIDDING);
    });

    it('rejects a second bid of the same player in a round', () => {
      const game = stagedBidding();
      game.placeBid('p1', 0);
      game.currentPlayerIndex = 0;

      expect(() => game.placeBid('p1', 1)).toThrow(BidAlreadyPlacedError);
      expect(() => game.players[0].placeBid(1)).toThrow(BidAlreadyPlacedError);
      expect(game.players[0].bid).toBe(0);
    });

    it('enforces the hook rule for the last bidder whatever the bid type', () => {
      const game = stagedBidding();
      game.placeBid('p1', 0);
      game.placeBid('p2', 0);

      expect(game.getForbiddenBid()).toBe(1);
      expect(game.getForbiddenBidFor('p3')).toBe(1);
      expect(game.getForbiddenBidFor('p1')).toBeNull();
      expect(() => game.placeBid('p3', '1' as never)).toThrow(InvalidBidError);
      expect(() => game.placeBid('p3', 1)).toThrow(ForbiddenBidError);
      expect(game.phase).toBe(GamePhase.BIDDING);

      game.placeBid('p3', 0);
      expect(game.phase).toBe(GamePhase.PLAYING);
      expect(game.getTotalBids()).toBe(0);
    });

    it('has no forbidden bid with equal bids allowed', () => {
      const game = stagedBidding(ensureRulesetConfig({ bidding: { allowEqualBids: true } }));
      game.placeBid('p1', 0);
      game.placeBid('p2', 0);

      expect(game.getForbiddenBid()).toBeNull();
      game.placeBid('p3', 1);
      expect(game.phase).toBe(GamePhase.PLAYING);
    });
  });

  describe('trump selection', () => {
    function stagedTrumpSelection(): Game {
      const game = stagedBidding();
      game.phase = GamePhase.TRUMP_SELECTION;
      game.trumpChoice = null;
      return game;
    }

    it('accepts only a suit from the dealer', () => {
      const game = stagedTrumpSelection();
      const dealerId = game.getDealer().id;

      expect(() => game.selectTrump(dealerId, 'BANANAS' as Suit)).toThrow(InvalidTrumpSuitError);
      expect(() => game.selectTrump(dealerId, 7 as unknown as Suit)).toThrow(InvalidTrumpSuitError);
      expect(() => game.selectTrump(dealerId, null)).toThrow(NoTrumpNotAllowedError);
      expect(() => game.selectTrump('p1', Suit.ELVES)).toThrow(NotTrumpChooserError);
      expect(game.trumpSuit).toBeNull();
      expect(game.phase).toBe(GamePhase.TRUMP_SELECTION);

      game.selectTrump(dealerId, Suit.HUMANS);
      expect(game.trumpSuit).toBe(Suit.HUMANS);
      expect(game.phase).toBe(GamePhase.BIDDING);
    });
  });

  describe('round plan', () => {
    it('only plays whole numbers of rounds', () => {
      const game = seededGame();
      game.setRulesetConfig({ ...DEFAULT_RULESET_CONFIG, structure: { customRoundCount: 2.5, descendingRounds: false } });

      expect(game.rulesetConfig.structure.customRoundCount).toBe(2);
      game.start();
      expect(game.maxRounds).toBe(2);
      expect(game.players.every((player) => player.hand.length === 1)).toBe(true);
    });
  });

  describe('phase state machine', () => {
    it('allows only the transitions in the table', () => {
      expect(canTransitionPhase(GamePhase.LOBBY, GamePhase.DEALING)).toBe(true);
      expect(canTransitionPhase(GamePhase.LOBBY, GamePhase.PLAYING)).toBe(false);
      expect(canTransitionPhase(GamePhase.ROUND_END, GamePhase.GAME_END)).toBe(true);
      expect(canTransitionPhase(GamePhase.GAME_END, GamePhase.BIDDING)).toBe(false);
      // A pause is not a phase: nothing enters or leaves PAUSED.
      for (const phase of Object.values(GamePhase)) {
        expect(canTransitionPhase(phase, GamePhase.PAUSED)).toBe(false);
        expect(canTransitionPhase(GamePhase.PAUSED, phase)).toBe(false);
      }
    });

    it('rejects operations of another phase with typed errors', () => {
      const game = seededGame();

      expect(() => game.startNextRound()).toThrow(InvalidPhaseError);
      expect(() => game.placeBid('p1', 0)).toThrow(InvalidPhaseError);
      expect(() => game.playCard('p1', 'GIANTS-1')).toThrow(InvalidPhaseError);
    });

    it('pauses beside the phase: the table stays as it is and refuses moves until it resumes', () => {
      const game = seededGame();
      game.setRulesetConfig(ensureRulesetConfig({ turn: { biddingTimerSeconds: 30 } }));
      startInBidding(game);
      const current = game.getCurrentPlayer();
      const hands = game.players.map((p) => p.hand.length);

      game.pause('p2', 'Player 2');
      expect(game.phase).toBe(GamePhase.BIDDING);
      expect(game.isPaused()).toBe(true);
      expect(game.pauseState?.previousPhase).toBe(GamePhase.BIDDING);
      expect(game.players.map((p) => p.hand.length)).toEqual(hands);
      expect(game.turnTimerState).toBeNull();
      game.syncTurnTimerState();
      expect(game.turnTimerState).toBeNull();
      expect(() => game.placeBid(current.id, 0)).toThrow(GamePausedError);
      expect(() => game.pause('p3', 'Player 3')).toThrow(GamePausedError);

      game.resume();
      expect(game.isPaused()).toBe(false);
      expect(game.phase).toBe(GamePhase.BIDDING);
      expect(game.turnTimerState?.playerId).toBe(current.id);
    });

    it('offers no legal plays while paused', () => {
      const game = seededGame();
      startInBidding(game);
      while (game.phase === GamePhase.BIDDING) {
        const bidder = game.getCurrentPlayer();
        game.placeBid(bidder.id, game.getForbiddenBidFor(bidder.id) === 0 ? 1 : 0);
      }
      const leader = game.getCurrentPlayer();
      expect(game.getLegalPlays(leader.id).length).toBeGreaterThan(0);

      game.pause(leader.id, leader.name);
      expect(game.getLegalPlays(leader.id)).toEqual([]);
      expect(() => game.playCard(leader.id, leader.hand[0].id)).toThrow(GamePausedError);
    });

    it('restores a game a room saved as phase PAUSED into its real phase', () => {
      const game = seededGame();
      startInBidding(game);
      game.pause('p2', 'Player 2');
      const legacy: IGameState = { ...game.toJSON(), phase: GamePhase.PAUSED };

      const restored = Game.fromJSON(legacy);
      expect(restored.phase).toBe(GamePhase.BIDDING);
      expect(restored.isPaused()).toBe(true);
    });

    it('restarts the round-end wait when a pause during ROUND_END ends', () => {
      const clock = createManualClock(10_000);
      const timed = new Game('round-end', 'p1', { clock });
      ['p1', 'p2', 'p3'].forEach((id) => timed.addPlayer(new Player(id, id)));
      timed.phase = GamePhase.ROUND_END;
      timed.roundEndedAt = 10_000;

      timed.pause('p2', 'p2');
      clock.advance(60_000);
      timed.resume();
      expect(timed.roundEndedAt).toBe(70_000);
    });
  });

  describe('ports', () => {
    it('deals the same round for the same seed', () => {
      const deal = (seed: number) => {
        const game = seededGame(seed, 4);
        game.start();
        return { hands: game.players.map((p) => p.hand.map((c) => c.id)), trump: game.trumpCard?.id ?? null };
      };

      expect(deal(SEED)).toEqual(deal(SEED));
      expect(deal(SEED)).not.toEqual(deal(SEED + 1));
    });

    it('measures grace and pause time with the injected clock', () => {
      const clock = createManualClock(5_000);
      const game = new Game('clocked', 'p1', { clock });
      game.addPlayer(new Player('p1', 'Alice'));

      game.gracePlayer('p1', 10_000);
      clock.advance(4_000);
      expect(game.getGraceTimeRemaining('p1')).toBe(6_000);
      clock.advance(6_000);
      expect(game.isGraceExpired('p1')).toBe(true);
    });
  });
});
