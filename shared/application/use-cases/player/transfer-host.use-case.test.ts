import { describe, expect, it } from 'vitest';

import {
  CannotTargetSelfError,
  Game,
  GameEventType,
  GamePhase,
  InvalidHostTargetError,
  InvalidPhaseError,
  NotHostError,
  Player,
  PlayerNotFoundError,
} from '../../../domain';
import { TransferHostUseCase } from './transfer-host.use-case';

const HOST_ID = 'player-1700000000000-host001';
const GUEST_ID = 'player-1700000000000-guest01';
const OTHER_ID = 'player-1700000000000-other01';
const BOT_ID = 'bot-1-1700000000000';

function createLobby(): Game {
  const game = new Game('host-room', HOST_ID);
  game.addPlayer(new Player(HOST_ID, 'Alice'));
  game.addPlayer(new Player(GUEST_ID, 'Bob'));
  game.addPlayer(new Player(OTHER_ID, 'Clara'));
  game.addPlayer(new Player(BOT_ID, 'Merlin', true, 3));
  return game;
}

describe('TransferHostUseCase', () => {
  describe('execute', () => {
    it('should hand the host role to a connected human and return HOST_CHANGED', () => {
      const game = createLobby();

      const result = new TransferHostUseCase().execute({ game, playerId: HOST_ID, targetPlayerId: GUEST_ID });

      expect(result.hostChangedEvent).toMatchObject({ type: GameEventType.HOST_CHANGED, hostId: GUEST_ID });
      expect(game.hostId).toBe(GUEST_ID);
    });

    it('should throw NotHostError when a non-host tries to transfer', () => {
      const game = createLobby();

      expect(() =>
        new TransferHostUseCase().execute({ game, playerId: GUEST_ID, targetPlayerId: OTHER_ID })
      ).toThrow(NotHostError);
      expect(game.hostId).toBe(HOST_ID);
    });

    it('should throw InvalidPhaseError outside the lobby', () => {
      const game = createLobby();
      game.phase = GamePhase.ROUND_END;

      expect(() =>
        new TransferHostUseCase().execute({ game, playerId: HOST_ID, targetPlayerId: GUEST_ID })
      ).toThrow(InvalidPhaseError);
    });

    it('should reject transferring to yourself', () => {
      const game = createLobby();

      expect(() =>
        new TransferHostUseCase().execute({ game, playerId: HOST_ID, targetPlayerId: HOST_ID })
      ).toThrow(CannotTargetSelfError);
    });

    it('should reject unknown, bot and disconnected targets', () => {
      const game = createLobby();
      game.gracePlayer(OTHER_ID);
      const useCase = new TransferHostUseCase();

      expect(() => useCase.execute({ game, playerId: HOST_ID, targetPlayerId: 'nobody' })).toThrow(PlayerNotFoundError);
      expect(() => useCase.execute({ game, playerId: HOST_ID, targetPlayerId: BOT_ID })).toThrow(InvalidHostTargetError);
      expect(() => useCase.execute({ game, playerId: HOST_ID, targetPlayerId: OTHER_ID })).toThrow(InvalidHostTargetError);
      expect(game.hostId).toBe(HOST_ID);
    });
  });
});
