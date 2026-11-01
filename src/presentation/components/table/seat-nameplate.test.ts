import { describe, expect, it } from 'vitest';
import { SCENE_LABEL } from '../../config/scene-label.config';
import {
  getSeatLabelAnchor,
  getSeatLabelPosition,
  getSeatLabelText,
  shortenName,
} from './seat-nameplate';

describe('seat nameplate', () => {
  it('labels the seat with a short name (You for the local player) and the bid progress once bid', () => {
    expect(getSeatLabelText({ name: 'Morgana le Fay', bid: 3, tricksWon: 1 }, false)).toBe('Morgana  1/3');
    expect(getSeatLabelText({ name: 'Merlin', bid: null, tricksWon: 0 }, true)).toBe('You  –');
    expect(getSeatLabelText({ name: 'Merlin', bid: 2, tricksWon: 1 }, true)).toBe('You  1/2');
    expect(getSeatLabelText({ name: 'Merlin', bid: 0, tricksWon: 0 }, true)).toBe('You  0/0');
    expect(shortenName('Bartholomew', SCENE_LABEL.SEAT.MAX_NAME_CHARS).length).toBeLessThanOrEqual(SCENE_LABEL.SEAT.MAX_NAME_CHARS);
  });

  it('grows side labels toward the table centre so they stay on screen', () => {
    expect(getSeatLabelAnchor(3.1)).toBe('right');
    expect(getSeatLabelAnchor(-2.68)).toBe('left');
    expect(getSeatLabelAnchor(0)).toBe('center');
  });

  it('lifts the label above the rim and pulls it toward the centre', () => {
    const [x, y, z] = getSeatLabelPosition([3.1, 0.02, 0]);
    expect(x).toBeCloseTo(3.1 - SCENE_LABEL.SEAT.INWARD, 9);
    expect(y).toBeCloseTo(0.02 + SCENE_LABEL.SEAT.LIFT, 9);
    expect(z).toBeCloseTo(0, 9);
  });
});
