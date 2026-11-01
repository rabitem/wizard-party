import { describe, expect, it } from 'vitest';
import { Game, Player, createManualClock } from '../../../domain';
import { ResumeGameUseCase } from './resume-game.use-case';

function pausedGame(clock = createManualClock(1_000)): Game {
  const game = new Game('resume', 'h', { clock });
  game.addPlayer(new Player('h', 'Hana'));
  game.addPlayer(new Player('p', 'Pia'));
  game.addPlayer(new Player('b', 'Bot B', true));
  game.start();
  const host = game.getPlayer('h');
  if (host) host.isConnected = false;
  game.pause('h', 'Hana', 10_000);
  return game;
}

describe('ResumeGameUseCase', () => {
  const resume = new ResumeGameUseCase();

  it('resumes for the awaited player only', () => {
    const game = pausedGame();

    expect(resume.executeOnReconnect({ game, reconnectedPlayerId: 'p' }).wasResumed).toBe(false);
    const result = resume.executeOnReconnect({ game, reconnectedPlayerId: 'h' });

    expect(result.wasResumed).toBe(true);
    expect(game.isPaused()).toBe(false);
    expect(game.getPlayer('h')?.isConnected).toBe(true);
  });

  it('hands the seat to a bot once due, and the host to a connected human', () => {
    const clock = createManualClock(1_000);
    const game = pausedGame(clock);
    clock.advance(10_000);

    const result = resume.executeOnTimeout({ game, botCounter: 2 });

    expect(result).toMatchObject({ wasResumed: true, replacedWithBot: true, newBotCounter: 3, newHostId: 'p' });
    expect(result.gameResumedEvent?.resumedPlayerName).toBe('Bot Hana');
    expect(game.getPlayer('h')).toMatchObject({ isBot: true, isConnected: true });
    expect(game.hostId).toBe('p');
    expect(game.isPaused()).toBe(false);
  });
});
