import { describe, expect, it } from 'vitest';
import { GamePhase } from './game-phase';
import {
  getDisplayPhase,
  getPauseDeadline,
  isGamePaused,
  toLegacyPause,
  toOrthogonalPause,
  type PausableState,
} from './game-pause';

const PAUSE = {
  pausedForPlayerId: 'p2',
  pausedAt: 1_000,
  timeoutDuration: 120_000,
  previousPhase: GamePhase.PLAYING,
};

const orthogonal: PausableState = { phase: GamePhase.PLAYING, pauseState: PAUSE };
const legacy: PausableState = { phase: GamePhase.PAUSED, pauseState: PAUSE };
const running: PausableState = { phase: GamePhase.BIDDING, pauseState: null };

describe('game pause', () => {
  it('recognizes a pause in either wire form', () => {
    expect(isGamePaused(orthogonal)).toBe(true);
    expect(isGamePaused(legacy)).toBe(true);
    expect(isGamePaused(running)).toBe(false);
  });

  it('shows the real phase while paused, whatever the server sent', () => {
    expect(getDisplayPhase(orthogonal)).toBe(GamePhase.PLAYING);
    expect(getDisplayPhase(legacy)).toBe(GamePhase.PLAYING);
    expect(getDisplayPhase(running)).toBe(GamePhase.BIDDING);
  });

  it('converts between the two forms without losing the real phase', () => {
    expect(toOrthogonalPause(legacy)).toEqual(orthogonal);
    expect(toLegacyPause(orthogonal)).toEqual(legacy);
    expect(toLegacyPause(running)).toBe(running);
    expect(toOrthogonalPause(running)).toBe(running);
    expect(toOrthogonalPause(toLegacyPause(orthogonal))).toEqual(orthogonal);
  });

  it('knows when a pause runs out', () => {
    expect(getPauseDeadline(PAUSE)).toBe(121_000);
    expect(getPauseDeadline(null)).toBeNull();
  });
});
