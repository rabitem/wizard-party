import { describe, expect, it } from 'vitest';

import {
  Game,
  GamePhase,
  InvalidPhaseError,
  Player,
  PlayerNotFoundError,
} from '../../../domain';
import { SetReadyUseCase } from './set-ready.use-case';

const HOST_ID = 'player-1700000000000-host001';
const GUEST_ID = 'player-1700000000000-guest01';
const BOT_ID = 'bot-1-1700000000000';

function createLobby(): Game {
  const game = new Game('ready-room', HOST_ID);
  game.addPlayer(new Player(HOST_ID, 'Alice'));
  game.addPlayer(new Player(GUEST_ID, 'Bob'));
  game.addPlayer(new Player(BOT_ID, 'Merlin', true, 3));
  return game;
}

describe('SetReadyUseCase', () => {
  describe('execute', () => {
    it('should start new human players as not ready and bots as ready', () => {
      const game = createLobby();

      expect(game.getPlayer(GUEST_ID)?.isReady).toBe(false);
      expect(game.getPlayer(BOT_ID)?.isReady).toBe(true);
      expect(game.toJSON().players.map((p) => p.isReady)).toEqual([false, false, true]);
    });

    it('should toggle the sender ready flag and include it in the serialized state', () => {
      const game = createLobby();
      const useCase = new SetReadyUseCase();

      const result = useCase.execute({ game, playerId: GUEST_ID, ready: true });

      expect(result).toEqual({ playerId: GUEST_ID, isReady: true, changed: true });
      expect(game.toJSON().players.find((p) => p.id === GUEST_ID)?.isReady).toBe(true);

      const unready = useCase.execute({ game, playerId: GUEST_ID, ready: false });
      expect(unready.isReady).toBe(false);
      expect(game.getPlayer(GUEST_ID)?.isReady).toBe(false);
    });

    it('should report no change when the flag already has the requested value', () => {
      const game = createLobby();

      const result = new SetReadyUseCase().execute({ game, playerId: GUEST_ID, ready: false });

      expect(result.changed).toBe(false);
    });

    it('should round-trip the ready flag through serialization', () => {
      const game = createLobby();
      new SetReadyUseCase().execute({ game, playerId: HOST_ID, ready: true });

      const restored = Game.fromJSON(game.toJSON());

      expect(restored.getPlayer(HOST_ID)?.isReady).toBe(true);
      expect(restored.getPlayer(GUEST_ID)?.isReady).toBe(false);
    });

    it('should throw InvalidPhaseError outside the lobby', () => {
      const game = createLobby();
      game.phase = GamePhase.BIDDING;

      expect(() =>
        new SetReadyUseCase().execute({ game, playerId: GUEST_ID, ready: true })
      ).toThrow(InvalidPhaseError);
    });

    it('should throw PlayerNotFoundError for unknown players and bots', () => {
      const game = createLobby();
      const useCase = new SetReadyUseCase();

      expect(() => useCase.execute({ game, playerId: 'nobody', ready: true })).toThrow(PlayerNotFoundError);
      expect(() => useCase.execute({ game, playerId: BOT_ID, ready: false })).toThrow(PlayerNotFoundError);
    });
  });
});
