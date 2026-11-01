import { describe, expect, it } from 'vitest';

import { getShuffleSortDuration } from '../config/physics.config';
import {
  IDLE_HAND_ANIMATION_CLOCK,
  getHandAnimationProgress,
  syncHandAnimationClock,
} from './PlayerHand.animation';
import { getCardAnimOffset } from './PlayerHand.layout';

describe('hand animation clock', () => {
  it('starts the clock for a hand that mounts while a sort is already requested', () => {
    const clock = syncHandAnimationClock(IDLE_HAND_ANIMATION_CLOCK, 'sort', 5000);

    expect(clock).toEqual({ animation: 'sort', startedAt: 5000 });
    expect(getHandAnimationProgress(clock, 2, 5000 + getShuffleSortDuration('sort', 2))).toBe(1);
  });

  it('keeps the running clock while the animation is unchanged', () => {
    const clock = syncHandAnimationClock(IDLE_HAND_ANIMATION_CLOCK, 'shuffle', 100);

    expect(syncHandAnimationClock(clock, 'shuffle', 400)).toBe(clock);
    expect(getHandAnimationProgress(clock, 4, 100 + getShuffleSortDuration('shuffle', 4) / 2)).toBeCloseTo(0.5);
  });

  it('reports no progress once the animation is cleared', () => {
    const running = syncHandAnimationClock(IDLE_HAND_ANIMATION_CLOCK, 'shuffle', 100);
    const idle = syncHandAnimationClock(running, 'none', 900);

    expect(getHandAnimationProgress(idle, 4, 1000)).toBeNull();
  });
});

describe('shuffle offset across the reorder', () => {
  it('keeps a card sliding the same way when the shuffle moves it to a slot of the other parity', () => {
    const before = getCardAnimOffset({ index: 2, cardId: 'ELVES-8', animation: 'shuffle', progress: 0.4, cardCount: 5 });
    const after = getCardAnimOffset({ index: 3, cardId: 'ELVES-8', animation: 'shuffle', progress: 0.4, cardCount: 5 });

    expect(after).toEqual(before);
  });
});
