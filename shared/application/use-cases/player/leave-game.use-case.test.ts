import { describe, expect, it } from 'vitest';
import { Game, GamePhase, Player } from '../../../domain';
import { LeaveGameUseCase } from './leave-game.use-case';

function runningGame(): Game {
  const game = new Game('leave', 'h');
  game.addPlayer(new Player('h', 'Hana'));
  game.addPlayer(new Player('p', 'Pia'));
  game.addPlayer(new Player('b', 'Bot B', true, 2));
  game.start();
  return game;
}

describe('LeaveGameUseCase', () => {
  const leave = new LeaveGameUseCase();

  describe('running game', () => {
    it('queues a second dropped player behind the current pause', () => {
      const game = runningGame();
      leave.execute({ game, playerId: 'p', isIntentional: false });

      const result = leave.execute({ game, playerId: 'h', isIntentional: false });

      expect(result.shouldPause).toBe(false);
      expect(game.pauseState?.pausedForPlayerId).toBe('p');
      expect(game.getPlayer('h')?.isConnected).toBe(false);
      // Nobody connected is human any more: the host stays a human who may come back.
      expect(game.hostId).toBe('h');
    });

    it('changes nothing when a connection of a seat a bot holds drops', () => {
      const game = runningGame();
      leave.execute({ game, playerId: 'p', isIntentional: true });

      const result = leave.execute({ game, playerId: 'p', isIntentional: false });

      expect(result).toMatchObject({ shouldPause: false, replacedWithBot: false, wasRemoved: false });
      expect(game.isPaused()).toBe(false);
      expect(game.getPlayer('p')).toMatchObject({ isBot: true, isConnected: true });
    });
  });

  describe('lobby', () => {
    it('frees the seat of a deliberate leaver and hands the host on', () => {
      const game = new Game('lobby', 'h');
      game.addPlayer(new Player('h', 'Hana'));
      game.addPlayer(new Player('p', 'Pia'));

      const result = leave.execute({ game, playerId: 'h', isIntentional: true });

      expect(result.wasRemoved).toBe(true);
      expect(game.getPlayer('h')).toBeUndefined();
      expect(result.newHostId).toBe('p');
    });

    it('keeps the seat of a dropped connection for the grace period', () => {
      const game = new Game('lobby', 'h');
      game.addPlayer(new Player('h', 'Hana'));

      const result = leave.execute({ game, playerId: 'h', isIntentional: false, graceTimeoutDuration: 9_000 });

      expect(result.shouldGrace).toBe(true);
      expect(result.playerGracedEvent).toMatchObject({ playerId: 'h', graceDuration: 9_000, wasHost: true });
      expect(game.isPlayerGraced('h')).toBe(true);
    });
  });

  it('keeps the seat at GAME_END and hands the host to a connected human', () => {
    const game = runningGame();
    game.phase = GamePhase.GAME_END;

    const result = leave.execute({ game, playerId: 'h', isIntentional: true });

    expect(game.getPlayer('h')?.isConnected).toBe(false);
    expect(result.newHostId).toBe('p');
  });
});
