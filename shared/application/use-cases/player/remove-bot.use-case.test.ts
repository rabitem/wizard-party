import { describe, expect, it } from 'vitest';

import {
  BotDifficulty,
  Game,
  InvalidPhaseError,
  Player,
  PlayerNotFoundError,
} from '../../../domain';
import { RemoveBotUseCase } from './remove-bot.use-case';

function lobbyWithBot(): Game {
  const game = new Game('remove-bot', 'host');
  game.addPlayer(new Player('host', 'Hana'));
  game.addPlayer(new Player('guest', 'Gus'));
  game.addPlayer(new Player('bot-1', 'Bot Merlin', true, BotDifficulty.EASY));
  return game;
}

describe('RemoveBotUseCase', () => {
  const removeBot = new RemoveBotUseCase();

  // Removing a bot and the host-only refusal are owned by party/room/lobby.test.ts.
  it.each([
    ['the host removes a human through it', 'host', 'guest', PlayerNotFoundError],
    ['the host names nobody at the table', 'host', 'bot-9', PlayerNotFoundError],
  ])('refuses when %s', (_label, playerId, botId, error) => {
    const game = lobbyWithBot();

    expect(() => removeBot.execute({ game, playerId, botId })).toThrow(error);
    expect(game.players).toHaveLength(3);
  });

  it('refuses once the game has started', () => {
    const game = lobbyWithBot();
    game.start();

    expect(() => removeBot.execute({ game, playerId: 'host', botId: 'bot-1' })).toThrow(InvalidPhaseError);
    expect(game.players).toHaveLength(3);
  });
});
