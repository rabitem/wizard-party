import { NEON_LAYOUT } from '@/presentation/config/neon-environment.config';
import type { Vec3 } from '@/presentation/config/themed-environment.config';
import { seededRandom, type PropPlacement } from '../primitives';

/**
 * Seeded skyline layout shared by the towers (CitySkyline) and the blinking
 * aviation lights on the tallest roofs (AircraftLights).
 */

const { SKYLINE, GRID_Y } = NEON_LAYOUT;
const BEACON = { MIN_HEIGHT: 18, LIFT: 0.6 } as const;
const MAX_ATTEMPTS = 400;

function lerp([a, b]: readonly [number, number], t: number): number {
  return a + (b - a) * t;
}

interface Ring {
  count: number;
  radius: readonly [number, number];
  height: readonly [number, number];
}

/** Buildings scattered on a ring around the roof, keeping the sunset gap clear. */
function buildRing(ring: Ring, rand: () => number): PropPlacement[] {
  const placements: PropPlacement[] = [];
  for (let attempt = 0; attempt < MAX_ATTEMPTS && placements.length < ring.count; attempt++) {
    const angle = rand() * Math.PI * 2;
    const radius = lerp(ring.radius, rand());
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (z < 0 && Math.abs(x) < SKYLINE.SUN_GAP_HALF_X) continue;
    const width = lerp(SKYLINE.WIDTH, rand());
    const depth = lerp(SKYLINE.WIDTH, rand());
    const height = lerp(ring.height, rand());
    placements.push({ position: [x, GRID_Y + height / 2, z], scale: [width, height, depth], rotationY: -angle });
  }
  return placements;
}

const RAND = seededRandom(SKYLINE.SEED);
export const NEAR_BUILDINGS = buildRing({ count: SKYLINE.COUNT_NEAR, radius: SKYLINE.RADIUS_NEAR, height: SKYLINE.HEIGHT_NEAR }, RAND);
export const FAR_BUILDINGS = buildRing({ count: SKYLINE.COUNT_FAR, radius: SKYLINE.RADIUS_FAR, height: SKYLINE.HEIGHT_FAR }, RAND);

/** Aviation beacon positions on top of the tallest near towers. */
export const BEACON_POSITIONS: readonly Vec3[] = NEAR_BUILDINGS.filter((b) => (b.scale as Vec3)[1] >= BEACON.MIN_HEIGHT).map((b) => {
  const [x, , z] = b.position;
  const height = (b.scale as Vec3)[1];
  return [x, GRID_Y + height + BEACON.LIFT, z];
});
