import { describe, expect, it } from 'vitest';
import { SURFACE_LAYOUT } from '@/presentation/components/table/surfaces/surface.config';
import { AUTUMN_RIM_ACORNS, AUTUMN_RIM_LEAVES } from './autumn-environment.config';
import {
  CELESTIAL_RIM_ASTROLABE,
  CELESTIAL_RIM_CANDLES,
  CELESTIAL_RIM_CRYSTAL,
  CELESTIAL_RIM_STARS,
} from './celestial-environment.config';
import { HALLOWEEN_RIM_CANDLES, HALLOWEEN_RIM_PUMPKINS } from './halloween-environment.config';
import { CAMERA_CONFIG } from './layout.config';
import { MANGA_RIM } from './manga-environment.config';
import { NEON_RIM_DECOR } from './neon-environment.config';
import { PIXEL_RIM_COIN_POSITIONS, PIXEL_RIM_DECOR } from './pixel-environment.config';
import { SOLARPUNK_RIM } from './solarpunk-environment.config';
import { SPRING_RIM_PETALS, SPRING_RIM_POTS } from './spring-environment.config';
import {
  SUMMER_RIM_CONCHS,
  SUMMER_RIM_GLASS,
  SUMMER_RIM_SCALLOPS,
  SUMMER_RIM_STARFISH,
} from './summer-environment.config';
import { THEMED_FX_IDS } from './theme-fx.config';
import { TABLE_RIM_DECOR, getCameraEnvelope } from './themed-environment.config';
import { WINTER_RIM_CANDLES, WINTER_RIM_CONES } from './winter-environment.config';

interface RimItem {
  readonly position: readonly number[];
}

const ROOM_RIM_DECOR: ReadonlyArray<readonly [string, readonly RimItem[]]> = [
  ['halloween', [...HALLOWEEN_RIM_PUMPKINS, ...HALLOWEEN_RIM_CANDLES]],
  ['autumn', [...AUTUMN_RIM_LEAVES, ...AUTUMN_RIM_ACORNS]],
  ['winter', [...WINTER_RIM_CANDLES, ...WINTER_RIM_CONES]],
  ['spring', [...SPRING_RIM_POTS, ...SPRING_RIM_PETALS]],
  ['summer', [SUMMER_RIM_GLASS, ...SUMMER_RIM_SCALLOPS, ...SUMMER_RIM_CONCHS, ...SUMMER_RIM_STARFISH]],
  ['manga', [MANGA_RIM.INK_STONE, MANGA_RIM.BRUSH, ...MANGA_RIM.TEA_CUPS, MANGA_RIM.SCROLL, MANGA_RIM.CRANE]],
  ['neon', Object.values(NEON_RIM_DECOR)],
  [
    'pixel',
    [
      PIXEL_RIM_DECOR.MUSHROOM,
      PIXEL_RIM_DECOR.JOYSTICK,
      PIXEL_RIM_DECOR.BLOCK,
      ...PIXEL_RIM_COIN_POSITIONS.map((position) => ({ position })),
    ],
  ],
  ['celestial', [...CELESTIAL_RIM_CANDLES, CELESTIAL_RIM_CRYSTAL, CELESTIAL_RIM_ASTROLABE, ...CELESTIAL_RIM_STARS]],
  ['solarpunk', [SOLARPUNK_RIM.FERN, SOLARPUNK_RIM.PANEL, SOLARPUNK_RIM.TURBINE, SOLARPUNK_RIM.SUCCULENT]],
];

/** Rim angle in degrees, TABLE_RIM_DECOR convention: 0 is the local player's seat, counter-clockwise */
function rimAngleDeg([x, , z]: readonly number[]): number {
  const deg = (Math.atan2(z, x) * 180) / Math.PI - 90;
  return ((deg % 360) + 360) % 360;
}

function distanceToNearestSafeSlotDeg(angle: number): number {
  return Math.min(
    ...TABLE_RIM_DECOR.SAFE_ANGLES_DEG.map((slot) => Math.abs((((angle - slot) % 360) + 540) % 360 - 180))
  );
}

describe('table rim decor', () => {
  it.each(ROOM_RIM_DECOR)(
    'should keep the %s room decor on the wood rim, outside the play area and clear of seats and cup holders',
    (_room, items) => {
      expect(items.length).toBeGreaterThan(0);
      for (const { position } of items) {
        const radius = Math.hypot(position[0], position[2]);
        expect(radius).toBeGreaterThan(SURFACE_LAYOUT.PLAY_RADIUS);
        expect(radius).toBeGreaterThan(SURFACE_LAYOUT.RIM_INNER);
        expect(radius).toBeLessThan(SURFACE_LAYOUT.RIM_OUTER);
        expect(distanceToNearestSafeSlotDeg(rimAngleDeg(position))).toBeLessThanOrEqual(TABLE_RIM_DECOR.SLOT_SPREAD_DEG);
      }
    }
  );
});

describe('camera envelope', () => {
  it.each([...THEMED_FX_IDS, 'default'])(
    'should leave room for the phone and desktop camera presets under the %s room ceiling',
    (room) => {
      const { maxHeight } = getCameraEnvelope(room);
      expect(maxHeight).toBeGreaterThanOrEqual(CAMERA_CONFIG.MOBILE.POSITION[1]);
      expect(maxHeight).toBeGreaterThanOrEqual(CAMERA_CONFIG.DESKTOP.POSITION[1]);
    }
  );
});
