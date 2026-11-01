import { describe, expect, it } from 'vitest';

import { Game, GamePhase, Player, PlayersReconnectingError } from '../../../domain';
import { StartGameUseCase } from './start-game.use-case';

describe('StartGameUseCase', () => {
  it('does not start while a lobby player is still in reconnect grace', () => {
    const hostId = 'player-1700000000000-host001';
    const disconnectedId = 'player-1700000000000-away001';
    const thirdId = 'player-1700000000000-third01';
    const game = new Game('graced-start-room', hostId);
    game.addPlayer(new Player(hostId, 'Alice'));
    game.addPlayer(new Player(disconnectedId, 'Bob'));
    game.addPlayer(new Player(thirdId, 'Clara'));
    game.gracePlayer(disconnectedId);

    expect(() =>
      new StartGameUseCase().execute({
        game,
        playerId: hostId,
      })
    ).toThrow(PlayersReconnectingError);
    expect(game.phase).toBe(GamePhase.LOBBY);
  });
});
