import { describe, expect, it } from 'vitest';
import { GamePhase, type IGameState } from '@shared/domain';
import { calcDerivedState, shouldShowLoadingOverlay } from './game-client-view';

const gameState = { id: 'room-1', phase: GamePhase.PLAYING } as IGameState;
const loaded = { gameState, playerId: 'p1', isCorrectRoom: true, isGamePhase: true };

describe('shouldShowLoadingOverlay', () => {
  it.each([
    ['a game is loaded', loaded, false],
    ['the game state has not arrived', { ...loaded, gameState: null }, true],
    ['the player has not been seated', { ...loaded, playerId: null }, true],
    ['the state belongs to another room', { ...loaded, isCorrectRoom: false }, true],
    ['the phase is not a game phase', { ...loaded, isGamePhase: false }, true],
  ])('should show the overlay only while the game view cannot be mounted: %s', (_case, input, expected) => {
    expect(shouldShowLoadingOverlay(input)).toBe(expected);
  });
});

describe('calcDerivedState', () => {
  const settled = { phase: GamePhase.PLAYING, isConnected: true, isTrickAnimating: false, hasTrickResult: false, hasPendingTrickResult: false };

  it('should allow interactions while connected and playing', () => {
    expect(calcDerivedState(settled).interactionsDisabled).toBe(false);
  });

  it('should disable interactions while the connection is down', () => {
    expect(calcDerivedState({ ...settled, isConnected: false }).interactionsDisabled).toBe(true);
  });

  it('should disable interactions during the trick result', () => {
    expect(calcDerivedState({ ...settled, hasTrickResult: true }).interactionsDisabled).toBe(true);
    expect(calcDerivedState({ ...settled, isTrickAnimating: true }).interactionsDisabled).toBe(true);
  });

  it('should show the round end only after the last trick has been resolved', () => {
    const roundEnd = { ...settled, phase: GamePhase.ROUND_END };

    expect(calcDerivedState(roundEnd).showRoundEndUI).toBe(true);
    expect(calcDerivedState({ ...roundEnd, hasPendingTrickResult: true }).showRoundEndUI).toBe(false);
    expect(calcDerivedState({ ...roundEnd, hasTrickResult: true }).showRoundEndUI).toBe(false);
  });
});
