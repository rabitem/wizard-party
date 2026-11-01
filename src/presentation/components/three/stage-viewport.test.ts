import { describe, expect, it } from 'vitest';
import { getStageViewport } from './stage-viewport';

const SIZE = { width: 1200, height: 600 };
const NO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

describe('getStageViewport', () => {
  it('should be the whole canvas without side docks, whatever the top and bottom bars cover', () => {
    expect(getStageViewport(SIZE, { ...NO_INSETS, top: 80, bottom: 120 })).toEqual({ width: 1200, height: 600, offsetX: 0 });
  });

  it('should frame beside a right dock, shifting the projection centre left by half the dock', () => {
    expect(getStageViewport(SIZE, { ...NO_INSETS, right: 300 })).toEqual({ width: 900, height: 600, offsetX: 150 });
  });

  it('should shift the centre right for a left dock', () => {
    expect(getStageViewport(SIZE, { ...NO_INSETS, left: 200 }).offsetX).toBe(-100);
  });

  it('should never give the docks more than half the width, sharing the limit between them', () => {
    const stage = getStageViewport(SIZE, { ...NO_INSETS, left: 600, right: 600 });
    expect(stage.width).toBe(600);
    expect(stage.offsetX).toBe(0);
  });
});
