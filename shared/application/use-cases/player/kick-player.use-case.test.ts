import { describe, expect, it } from 'vitest';

import {
  CannotTargetSelfError,
  Game,
  GameEventType,
  GamePhase,
  InvalidPhaseError,
  NotHostError,
  Player,
  PlayerKickedError,
  PlayerNotFoundError,
} from '../../../domain';
import { KickPlayerUseCase } from './kick-player.use-case';
import { JoinGameUseCase } from './join-game.use-case';

// Join validates persistent ids (format and a recent timestamp), so build them from "now".
const NOW = Date.now();
const HOST_ID = `player-${NOW}-host001`;
const GUEST_ID = `player-${NOW}-guest01`;
const OTHER_ID = `player-${NOW}-other01`;
const MAX_PLAYERS = 6;

function createLobby(): Game {
  const game = new Game('kick-room', HOST_ID);
  game.addPlayer(new Player(HOST_ID, 'Alice'));
  game.addPlayer(new Player(GUEST_ID, 'Bob'));
  game.addPlayer(new Player(OTHER_ID, 'Clara'));
  return game;
}

describe('KickPlayerUseCase', () => {
  describe('execute', () => {
    it('should remove the player and return a PLAYER_KICKED event', () => {
      const game = createLobby();

      const result = new KickPlayerUseCase().execute({ game, playerId: HOST_ID, targetPlayerId: GUEST_ID });

      expect(result.playerKickedEvent).toMatchObject({
        type: GameEventType.PLAYER_KICKED,
        playerId: GUEST_ID,
        playerName: 'Bob',
      });
      expect(game.getPlayer(GUEST_ID)).toBeUndefined();
      expect(game.isPlayerKicked(GUEST_ID)).toBe(true);
    });

    it('should clear the grace state of a disconnected player that is kicked', () => {
      const game = createLobby();
      game.gracePlayer(GUEST_ID);

      new KickPlayerUseCase().execute({ game, playerId: HOST_ID, targetPlayerId: GUEST_ID });

      expect(game.isPlayerGraced(GUEST_ID)).toBe(false);
    });

    it('should throw NotHostError when a non-host tries to kick', () => {
      const game = createLobby();

      expect(() =>
        new KickPlayerUseCase().execute({ game, playerId: GUEST_ID, targetPlayerId: OTHER_ID })
      ).toThrow(NotHostError);
      expect(game.getPlayer(OTHER_ID)).toBeDefined();
    });

    it('should throw InvalidPhaseError outside the lobby', () => {
      const game = createLobby();
      game.phase = GamePhase.PLAYING;

      expect(() =>
        new KickPlayerUseCase().execute({ game, playerId: HOST_ID, targetPlayerId: GUEST_ID })
      ).toThrow(InvalidPhaseError);
    });

    it('should throw CannotTargetSelfError when the host kicks themselves', () => {
      const game = createLobby();

      expect(() =>
        new KickPlayerUseCase().execute({ game, playerId: HOST_ID, targetPlayerId: HOST_ID })
      ).toThrow(CannotTargetSelfError);
    });

    it('should throw PlayerNotFoundError for an unknown target', () => {
      const game = createLobby();

      expect(() =>
        new KickPlayerUseCase().execute({ game, playerId: HOST_ID, targetPlayerId: 'nobody' })
      ).toThrow(PlayerNotFoundError);
    });

    it('should block the kicked identity from rejoining the lobby', () => {
      const game = createLobby();
      new KickPlayerUseCase().execute({ game, playerId: HOST_ID, targetPlayerId: GUEST_ID });

      const rejoin = () => new JoinGameUseCase().execute({
        game,
        playerId: GUEST_ID,
        playerName: 'Bobby',
        persistentId: GUEST_ID,
        maxPlayers: MAX_PLAYERS,
      });

      expect(rejoin).toThrow(PlayerKickedError);
      expect(rejoin).toThrow(/removed from the table/);
      expect(game.getPlayer(GUEST_ID)).toBeUndefined();
    });

    it('should block the browser behind an opaque seat id from taking a new seat', () => {
      const game = createLobby();
      const seatId = 'p_opaqueSeatId01';
      const browserId = `player-${NOW}-brows01`;
      game.addPlayer(new Player(seatId, 'Dora'));

      new KickPlayerUseCase().execute({ game, playerId: HOST_ID, targetPlayerId: seatId, rejoinIdentities: [browserId] });

      expect(() => new JoinGameUseCase().execute({
        game,
        playerId: 'p_freshSeatId002',
        playerName: 'Dora',
        persistentId: browserId,
        maxPlayers: MAX_PLAYERS,
      })).toThrow(PlayerKickedError);
    });

    it('should keep the kick list across serialization', () => {
      const game = createLobby();
      new KickPlayerUseCase().execute({ game, playerId: HOST_ID, targetPlayerId: GUEST_ID });

      const restored = Game.fromJSON(game.toJSON());

      expect(restored.isPlayerKicked(GUEST_ID)).toBe(true);
    });
  });
});
