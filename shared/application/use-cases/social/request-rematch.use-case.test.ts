import { describe, expect, it } from 'vitest';
import {
  Game,
  GamePhase,
  InvalidPhaseError,
  NotHostError,
  Player,
} from '../../../domain';
import { RequestRematchUseCase } from './request-rematch.use-case';

function finishedGame(): Game {
  const game = new Game('rematch', 'h');
  game.addPlayer(new Player('h', 'Hana'));
  game.addPlayer(new Player('p', 'Pia'));
  game.addPlayer(new Player('b1', 'Bot One', true, 2));
  game.phase = GamePhase.GAME_END;
  return game;
}

describe('RequestRematchUseCase', () => {
  const rematch = new RequestRematchUseCase();

  it('is the host\'s call, and only after the game is over', () => {
    expect(() => rematch.execute({ game: finishedGame(), playerId: 'p' })).toThrow(NotHostError);
    const running = finishedGame();
    running.phase = GamePhase.PLAYING;
    expect(() => rematch.execute({ game: running, playerId: 'h' })).toThrow(InvalidPhaseError);
    expect(rematch.execute({ game: finishedGame(), playerId: 'h' }).newGame.phase).toBe(GamePhase.LOBBY);
  });
});
