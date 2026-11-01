import { describe, expect, it } from 'vitest';

import {
  CardType,
  DEFAULT_RULESET_CONFIG,
  Game,
  GamePhase,
  Player,
  createManualClock,
  createSeededRandom,
  ensureRulesetConfig,
  getStandings,
  getWinnerIds,
  type IGameState,
} from '../index';
import { SEED, startInBidding } from './game-aggregate.fixtures';

describe('Game aggregate snapshots, host, rematch and standings', () => {
  describe('serialization', () => {
    function playedGame(): Game {
      const game = new Game('snapshot', 'p1', { random: createSeededRandom(SEED), clock: createManualClock(42) });
      game.setRulesetConfig(ensureRulesetConfig({
        bidding: { hiddenBids: true },
        card: { lastWizardWins: true },
        turn: { biddingTimerSeconds: 30, playTimerSeconds: 20 },
        expansions: { specialCards: [CardType.CLOUD, CardType.BOMB] },
      }));
      game.addPlayer(new Player('p1', 'Alice'));
      game.addPlayer(new Player('bot-1', 'Bot One', true, 5));
      game.addPlayer(new Player('bot-2', 'Bot Two', true, 2));
      startInBidding(game);
      return game;
    }

    it('round-trips every field, including bot difficulty, ruleset and expansion state', () => {
      const game = playedGame();
      const snapshot = game.toJSON();
      const restored = Game.fromJSON(JSON.parse(JSON.stringify(snapshot)) as IGameState);

      expect(restored.toJSON()).toEqual(snapshot);
      expect(restored.getPlayer('bot-1')?.botDifficulty).toBe(5);
      expect(restored.rulesetConfig.expansions.specialCards).toEqual([CardType.BOMB, CardType.CLOUD]);
      expect(restored.rulesetConfig.card.lastWizardWins).toBe(true);
      expect(restored.turnTimerState).toEqual(game.turnTimerState);
    });

    it('never aliases live state in a snapshot or a restored game', () => {
      const game = playedGame();
      const snapshot = game.toJSON();
      const handBefore = snapshot.players[0].hand.length;

      const current = game.getCurrentPlayer();
      game.placeBid(current.id, game.getForbiddenBid() === 0 ? 1 : 0);

      expect(snapshot.players.find((p) => p.id === current.id)?.bid).toBeNull();
      expect(snapshot.rulesetConfig).not.toBe(game.rulesetConfig);
      snapshot.players[0].hand.pop();
      snapshot.players[0].roundHistory.push({ bid: 1, tricksWon: 1, score: 30 });
      expect(game.players[0].hand).toHaveLength(handBefore);
      expect(game.players[0].roundHistory).toHaveLength(0);

      const restored = Game.fromJSON(snapshot);
      snapshot.completedTricks.push({ cards: [], leadSuit: null, winnerId: null });
      expect(restored.completedTricks).toHaveLength(0);
    });

    it('gives every game its own ruleset and keeps the defaults frozen', () => {
      const game = new Game('own-rules', 'p1');

      expect(game.rulesetConfig).not.toBe(DEFAULT_RULESET_CONFIG);
      expect(game.rulesetConfig).toEqual(DEFAULT_RULESET_CONFIG);
      expect(Object.isFrozen(DEFAULT_RULESET_CONFIG)).toBe(true);
      expect(Object.isFrozen(DEFAULT_RULESET_CONFIG.bidding)).toBe(true);
      expect(Object.isFrozen(DEFAULT_RULESET_CONFIG.expansions.specialCards)).toBe(true);
    });
  });

  describe('host and seat takeover', () => {
    function seat(game: Game, id: string): Player {
      const player = game.getPlayer(id);
      if (!player) throw new Error(`No seat ${id}`);
      return player;
    }

    function table(): Game {
      const game = new Game('host', 'h');
      game.addPlayer(new Player('h', 'Hana'));
      game.addPlayer(new Player('p', 'Pia'));
      game.addPlayer(new Player('b', 'Bot B', true, 4));
      return game;
    }

    it('keeps a connected human host', () => {
      const game = table();
      expect(game.ensureHost()).toBeNull();
      expect(game.hostId).toBe('h');
    });

    it('moves the host to the first connected human when the host drops or becomes a bot', () => {
      const game = table();
      seat(game, 'h').isConnected = false;
      expect(game.ensureHost()).toBe('p');

      const other = table();
      other.replaceWithBot('h');
      expect(other.ensureHost()).toBe('p');
    });

    it('keeps a disconnected human host when no human is connected, and a human over a bot', () => {
      const game = table();
      seat(game, 'h').isConnected = false;
      seat(game, 'p').isConnected = false;
      expect(game.ensureHost()).toBeNull();

      game.replaceWithBot('h');
      expect(game.ensureHost()).toBe('p');
    });

    it('hands a seat to a bot and back to its human', () => {
      const game = table();
      const taken = game.replaceWithBot('p');
      expect(taken).toMatchObject({ name: 'Bot Pia', isBot: true, isConnected: true, botDifficulty: 3 });

      taken.reclaimByHuman('Pia');
      expect(taken).toMatchObject({ name: 'Pia', isBot: false, isConnected: true });
      expect(taken.botDifficulty).toBeUndefined();
    });
  });

  describe('rematch', () => {
    function finishedGame(): Game {
      const game = new Game('done', 'h', { random: createSeededRandom(SEED), clock: createManualClock(5_000) });
      game.setRulesetConfig(ensureRulesetConfig({
        structure: { customRoundCount: 3, descendingRounds: true },
        bidding: { allowEqualBids: true },
      }));
      game.addPlayer(new Player('h', 'Hana'));
      game.addPlayer(new Player('p', 'Pia'));
      game.addPlayer(new Player('b1', 'Bot One', true, 2));
      game.addPlayer(new Player('b2', 'Bot Two', true, 5));
      game.kickPlayer('ghost', ['ghost-browser']);
      game.phase = GamePhase.GAME_END;
      game.players.forEach((p) => { p.score = 40; });
      return game;
    }

    it('keeps the rules, the bot levels, the host and the bans; scores start over', () => {
      const game = finishedGame();
      const rematch = game.createRematch();

      expect(rematch.phase).toBe(GamePhase.LOBBY);
      expect(rematch.rulesetConfig).toEqual(game.rulesetConfig);
      expect(rematch.players.map((p) => p.botDifficulty)).toEqual([undefined, undefined, 2, 5]);
      expect(rematch.players.every((p) => p.score === 0)).toBe(true);
      expect(rematch.hostId).toBe('h');
      expect(rematch.isPlayerKicked('ghost-browser')).toBe(true);
      expect(rematch.dependencies).toEqual(game.dependencies);
    });
  });

  describe('bot difficulty', () => {
    it.each([
      [5, 5],
      [99, 5],
      [0, 1],
      [2.4, 2],
      ['hard', 3],
      [undefined, 3],
      [null, 3],
    ])('parses %p into level %p for bots', (input, expected) => {
      expect(new Player('bot', 'Bot', true, input).botDifficulty).toBe(expected);
    });

    it('never gives a human a difficulty', () => {
      expect(new Player('human', 'Human', false, 4).botDifficulty).toBeUndefined();
    });
  });

  describe('standings', () => {
    const scored = [
      { id: 'a', score: 100 },
      { id: 'b', score: 50 },
      { id: 'c', score: 100 },
      { id: 'd', score: 20 },
    ];

    it('ranks ties with competition ranking and keeps seat order among ties', () => {
      expect(getStandings(scored)).toEqual([
        { playerId: 'a', score: 100, rank: 1 },
        { playerId: 'c', score: 100, rank: 1 },
        { playerId: 'b', score: 50, rank: 3 },
        { playerId: 'd', score: 20, rank: 4 },
      ]);
    });

    it('reports every co-winner', () => {
      expect(getWinnerIds(scored)).toEqual(['a', 'c']);
      expect(getWinnerIds([])).toEqual([]);
    });
  });
});
