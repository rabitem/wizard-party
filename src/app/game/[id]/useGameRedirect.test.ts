import { describe, expect, it } from 'vitest';

import { GamePhase, type IGameState } from '@shared/domain';

import { resolveGameRedirectTarget } from './useGameRedirect';

describe('resolveGameRedirectTarget', () => {
  it('keeps the game route open while the final trick animation is still active', () => {
    const gameEndState = {
      id: 'room-1',
      phase: GamePhase.GAME_END,
    } as IGameState;

    expect(resolveGameRedirectTarget({
      roomId: 'room-1',
      sessionLoaded: true,
      status: 'connected',
      gameState: gameEndState,
      playerId: 'player-1',
      isCorrectRoom: true,
      isTrickAnimationPending: true,
    })).toBeNull();

    expect(resolveGameRedirectTarget({
      roomId: 'room-1',
      sessionLoaded: true,
      status: 'connected',
      gameState: gameEndState,
      playerId: 'player-1',
      isCorrectRoom: true,
      isTrickAnimationPending: false,
    })).toBe('/results/room-1');
  });

  it('does not redirect while the player is leaving (the provider navigates then)', () => {
    const leftState = { roomId: 'room-1', sessionLoaded: true, status: 'idle' as const, gameState: null, playerId: null, isCorrectRoom: false };

    expect(resolveGameRedirectTarget({ ...leftState, isLeaving: true })).toBeNull();
    expect(resolveGameRedirectTarget(leftState)).toBe('/lobby/room-1');
  });

  it('sends a seated player home when the state is of another room, and to the lobby while the room is in its lobby', () => {
    const seated = { roomId: 'room-1', sessionLoaded: true, status: 'connected' as const, playerId: 'player-1' };

    expect(resolveGameRedirectTarget({ ...seated, gameState: { id: 'room-2', phase: GamePhase.PLAYING } as IGameState, isCorrectRoom: false })).toBe('/');
    expect(resolveGameRedirectTarget({ ...seated, gameState: { id: 'room-1', phase: GamePhase.LOBBY } as IGameState, isCorrectRoom: true })).toBe('/lobby/room-1');
  });

  describe('redirect on connection changes', () => {
    const playing = { id: 'room-1', phase: GamePhase.PLAYING } as IGameState;
    const atTable = { roomId: 'room-1', sessionLoaded: true, gameState: playing, playerId: 'player-1', isCorrectRoom: true };
    const noTable = { roomId: 'room-1', sessionLoaded: true, gameState: null, playerId: null, isCorrectRoom: false };

    it.each(['reconnecting', 'failed', 'superseded', 'connecting'] as const)('keeps the table mounted while %s', (status) => {
      expect(resolveGameRedirectTarget({ ...atTable, status })).toBeNull();
    });

    it('waits on the game page while a fresh load connects instead of bouncing through the lobby', () => {
      expect(resolveGameRedirectTarget({ ...noTable, status: 'connecting' })).toBeNull();
      expect(resolveGameRedirectTarget({ ...noTable, status: 'connected' })).toBeNull();
    });

    it('sends a player without a seat to the lobby, which explains or offers to join', () => {
      expect(resolveGameRedirectTarget({ ...noTable, status: 'idle' })).toBe('/lobby/room-1');
      expect(resolveGameRedirectTarget({ ...noTable, status: 'connected', hasError: true })).toBe('/lobby/room-1');
      expect(resolveGameRedirectTarget({ ...noTable, status: 'kicked' })).toBe('/lobby/room-1');
    });
  });
});
