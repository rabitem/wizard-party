import { describe, expect, it } from 'vitest';

import { GamePhase, type IGameState } from '@shared/domain';

import { resolveResultsRedirect, type ResultsRedirectInput } from './results-redirect';

const ended = { id: 'room-1', phase: GamePhase.GAME_END } as IGameState;
const atResults: ResultsRedirectInput = {
  sessionLoaded: true,
  isLeaving: false,
  status: 'connected',
  hasError: false,
  gameState: ended,
  playerId: 'player-1',
  isCorrectRoom: true,
};
const noSeat: ResultsRedirectInput = { ...atResults, gameState: null, playerId: null, isCorrectRoom: false };

describe('resolveResultsRedirect', () => {
  it.each(['reconnecting', 'failed', 'superseded'] as const)('keeps the results on screen while %s', (status) => {
    expect(resolveResultsRedirect({ ...atResults, status })).toBeNull();
  });

  it('waits while a fresh load connects instead of sending the player home', () => {
    expect(resolveResultsRedirect({ ...noSeat, status: 'connecting' })).toBeNull();
    expect(resolveResultsRedirect({ ...noSeat, status: 'connected' })).toBeNull();
  });

  it('sends a player without a seat, or seated elsewhere, home', () => {
    expect(resolveResultsRedirect({ ...noSeat, status: 'idle' })).toBe('/');
    expect(resolveResultsRedirect({ ...noSeat, status: 'connected', hasError: true })).toBe('/');
    expect(resolveResultsRedirect({ ...atResults, isCorrectRoom: false })).toBe('/');
  });

  it('never races the provider while the player leaves', () => {
    expect(resolveResultsRedirect({ ...noSeat, status: 'idle', isLeaving: true })).toBeNull();
    expect(resolveResultsRedirect({ ...noSeat, status: 'idle', sessionLoaded: false })).toBeNull();
  });
});
