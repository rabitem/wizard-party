import { SPRING_LAYOUT, SPRING_REALISM } from '@/presentation/config/spring-environment.config';
import { ENVIRONMENT_ROOM, type Vec3 } from '@/presentation/config/themed-environment.config';
import { seededRandom, type PropPlacement } from '../primitives';

/**
 * Pure placement builder for lawn detail: grass tufts around tree roots,
 * along the hedge bases, around the raised beds and at the column plinths,
 * with a few wildflowers peeking out. Nothing comes closer than
 * MIN_TABLE_DISTANCE to the table.
 */

const FLOOR = ENVIRONMENT_ROOM.FLOOR_Y;
const G = SPRING_REALISM.GRASS;
const MIN_TABLE_DISTANCE = 5.6;
const TUFT_SIZE: [number, number] = [0.22, 0.42];
const HEDGE_INSET = 0.72;
const BED_MARGIN = 0.12;
const WILDFLOWER_CHANCE = 0.22;
const WILDFLOWER_SCALE = 0.55;

export interface GrassParts {
  tufts: PropPlacement[];
  wildflowers: PropPlacement[];
}

export function buildGrass(): GrassParts {
  const rand = seededRandom(97);
  const parts: GrassParts = { tufts: [], wildflowers: [] };

  const add = (x: number, z: number, sizeScale = 1) => {
    if (Math.hypot(x, z) < MIN_TABLE_DISTANCE) return;
    const height = (TUFT_SIZE[0] + rand() * (TUFT_SIZE[1] - TUFT_SIZE[0])) * sizeScale;
    const width = height * (0.9 + rand() * 0.5);
    parts.tufts.push({
      position: [x, FLOOR, z],
      scale: [width, height, width],
      rotationY: rand() * Math.PI * 2,
      color: G.tints[Math.floor(rand() * G.tints.length)],
    });
    if (rand() < WILDFLOWER_CHANCE) {
      parts.wildflowers.push({
        position: [x + (rand() - 0.5) * 0.1, FLOOR + height * 0.85, z + (rand() - 0.5) * 0.1] as Vec3,
        scale: WILDFLOWER_SCALE * (0.8 + rand() * 0.4),
        rotationY: rand() * Math.PI,
        tilt: [(rand() - 0.5) * 0.4, (rand() - 0.5) * 0.4],
        color: SPRING_REALISM.WILDFLOWER_COLORS[Math.floor(rand() * SPRING_REALISM.WILDFLOWER_COLORS.length)],
      });
    }
  };

  SPRING_LAYOUT.TREES.forEach(([x, z, scale]) => {
    for (let i = 0; i < G.tuftsPerTree; i++) {
      const angle = rand() * Math.PI * 2;
      const radius = (0.35 + rand() * 1.5) * scale;
      add(x + Math.cos(angle) * radius, z + Math.sin(angle) * radius, 1.1);
    }
  });

  SPRING_LAYOUT.HEDGES.forEach(([x, z, length, rot]) => {
    const dirX = Math.cos(rot);
    const dirZ = -Math.sin(rot);
    // Normal pointing into the garden (towards the table).
    let normalX = -dirZ;
    let normalZ = dirX;
    if (normalX * -x + normalZ * -z < 0) {
      normalX = -normalX;
      normalZ = -normalZ;
    }
    const count = Math.round(length * G.tuftsPerHedgeUnit);
    for (let i = 0; i < count; i++) {
      const along = (rand() - 0.5) * length;
      const inset = HEDGE_INSET + rand() * 0.35;
      add(x + dirX * along + normalX * inset, z + dirZ * along + normalZ * inset, 1.25);
    }
  });

  SPRING_LAYOUT.BEDS.forEach(([x, z, width, depth, rot]) => {
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    for (let i = 0; i < G.tuftsPerBed; i++) {
      // Walk the bed perimeter, just outside the frame.
      const t = rand() * 2 * (width + depth);
      const hw = width / 2 + BED_MARGIN;
      const hd = depth / 2 + BED_MARGIN;
      let lx: number;
      let lz: number;
      if (t < width) [lx, lz] = [t - width / 2, -hd];
      else if (t < width + depth) [lx, lz] = [hw, t - width - depth / 2];
      else if (t < 2 * width + depth) [lx, lz] = [t - width - depth - width / 2, hd];
      else [lx, lz] = [-hw, t - 2 * width - depth - depth / 2];
      add(x + lx * cos + lz * sin, z - lx * sin + lz * cos, 0.9);
    }
  });

  SPRING_LAYOUT.COLUMNS.forEach(([x, z]) => {
    for (let i = 0; i < 3; i++) {
      const angle = rand() * Math.PI * 2;
      add(x + Math.cos(angle) * 0.6, z + Math.sin(angle) * 0.6, 0.8);
    }
  });

  return parts;
}
