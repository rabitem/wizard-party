import { describe, expect, it } from 'vitest';

import { DRAG_CONFIG } from '../config/drag-drop.config';
import { getReleaseOutcome, hasPassedDragThreshold } from './useCardDragGesture';

describe('hasPassedDragThreshold', () => {
  const press = { x: 600, y: 650 };

  it('treats a tap with hand tremor as a tap, so the card is not lifted', () => {
    expect(hasPassedDragThreshold(press, { x: 602, y: 647 })).toBe(false);
  });

  it('starts the drag once the pointer has moved past the threshold', () => {
    expect(hasPassedDragThreshold(press, { x: 600, y: 650 - DRAG_CONFIG.DRAG_START_THRESHOLD_PX - 1 })).toBe(true);
  });
});

describe('getReleaseOutcome', () => {
  it('ends a drag on pointerup and cancels it on pointercancel', () => {
    expect(getReleaseOutcome('dragging', false)).toBe('end');
    expect(getReleaseOutcome('dragging', true)).toBe('cancel');
  });

  it('does nothing for a press that never became a drag', () => {
    expect(getReleaseOutcome('pressed', false)).toBe('none');
    expect(getReleaseOutcome('pressed', true)).toBe('none');
    expect(getReleaseOutcome('idle', false)).toBe('none');
  });
});
