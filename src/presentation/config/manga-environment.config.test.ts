import { describe, expect, it } from 'vitest';
import {
  MANGA_KATANA_RACK,
  MANGA_LANTERNS,
  MANGA_LOW_TABLES,
  MANGA_ROOM,
  MANGA_SCROLLS,
  MANGA_TOKONOMA,
  MANGA_WINDOW,
} from './manga-environment.config';

const FLOOR_CLEAR_RADIUS = 5.5;

type Spot = [number, number];

const FLOOR_SPOTS: Spot[] = [
  ...MANGA_LOW_TABLES.map(([x, z]): Spot => [x, z]),
  ...MANGA_LANTERNS.map(([x, z]): Spot => [x, z]),
  [MANGA_KATANA_RACK.POSITION[0], MANGA_KATANA_RACK.POSITION[2]],
  [MANGA_TOKONOMA.POSITION[0], MANGA_TOKONOMA.POSITION[2]],
];
const WALL_SPOTS: Spot[] = MANGA_SCROLLS.map(({ position }): Spot => [position[0], position[2]]);

const radius = ([x, z]: Spot) => Math.hypot(x, z);
const inside = ([x, z]: Spot) => Math.abs(x) <= MANGA_ROOM.HALF_WIDTH && Math.abs(z) <= MANGA_ROOM.HALF_DEPTH;

describe('manga environment config', () => {
  describe('floor props', () => {
    it('should keep tables, lanterns, the rack and the tokonoma clear of the game table', () => {
      for (const spot of FLOOR_SPOTS) expect(radius(spot)).toBeGreaterThan(FLOOR_CLEAR_RADIUS);
    });

    it('should keep every prop and scroll inside the room footprint', () => {
      for (const spot of [...FLOOR_SPOTS, ...WALL_SPOTS]) expect(inside(spot)).toBe(true);
      for (const [, , hang] of MANGA_LANTERNS) expect(hang).toBeLessThan(MANGA_ROOM.HEIGHT);
    });

    it('should fit the mountain view below the wall rail', () => {
      expect(MANGA_WINDOW.BOTTOM + MANGA_WINDOW.HEIGHT).toBeLessThan(MANGA_ROOM.BEAM_HEIGHT);
      expect(MANGA_WINDOW.WIDTH / 2).toBeLessThan(MANGA_ROOM.HALF_WIDTH);
    });
  });
});
