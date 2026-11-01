import { SOLARPUNK_COLORS, SOLARPUNK_GREENHOUSE, SOLARPUNK_PLANTS } from '@/presentation/config/solarpunk-environment.config';
import { ENVIRONMENT_ROOM, type Vec3 } from '@/presentation/config/themed-environment.config';
import { seededRandom, type PropPlacement } from '../primitives';
import { BASKET, POT } from './solarpunk-geometry';

/**
 * Pure placement builders for the greenhouse planting. Every repeated part
 * (pots, fronds, leaves, stems) becomes one instanced draw call.
 */

const FLOOR = ENVIRONMENT_ROOM.FLOOR_Y;
const CEILING = FLOOR + ENVIRONMENT_ROOM.HEIGHT;
const LEAF_GREENS = [SOLARPUNK_COLORS.leaf, SOLARPUNK_COLORS.leafLight, SOLARPUNK_COLORS.leafDeep] as const;
const POT_TINTS = [SOLARPUNK_COLORS.pot, SOLARPUNK_COLORS.terracotta] as const;
const FROND_LENGTH = 1.5;
const MONSTERA_SIZE = 1.05;
const CABLE_RADIUS = 0.012;
/** Climbers grow out of the ledge planting, just in front of the mullions */
const CLIMBER_INSET = 0.18;
const LEDGE_Y = FLOOR + SOLARPUNK_GREENHOUSE.KNEE_HEIGHT;

export interface PottedParts {
  pots: PropPlacement[];
  soil: PropPlacement[];
  fronds: PropPlacement[];
  stems: PropPlacement[];
  bigLeaves: PropPlacement[];
}

export interface HangingParts {
  cables: PropPlacement[];
  baskets: PropPlacement[];
  mounds: PropPlacement[];
  leaves: PropPlacement[];
  vines: PropPlacement[];
}

function pick<T>(list: readonly T[], rand: () => number): T {
  return list[Math.floor(rand() * list.length) % list.length];
}

/** Direction a +X curl points after yawing by `rotationY`. */
function outward(rotationY: number): [number, number] {
  return [Math.cos(rotationY), -Math.sin(rotationY)];
}

function addPot(parts: PottedParts, x: number, z: number, scale: number, tint: string): number {
  parts.pots.push({ position: [x, FLOOR, z], scale, color: tint });
  const soilY = FLOOR + POT.SOIL_Y * scale;
  parts.soil.push({ position: [x, soilY, z], scale: [POT.RADIUS * 0.9 * scale, 0.02, POT.RADIUS * 0.9 * scale] });
  return soilY;
}

export function buildPottedPlants(): PottedParts {
  const parts: PottedParts = { pots: [], soil: [], fronds: [], stems: [], bigLeaves: [] };
  const rand = seededRandom(57);

  SOLARPUNK_PLANTS.FERNS.forEach(([x, z, s], plant) => {
    const soilY = addPot(parts, x, z, s, POT_TINTS[plant % POT_TINTS.length]);
    const n = SOLARPUNK_PLANTS.FROND_COUNT;
    for (let i = 0; i < n; i++) {
      const lean = 0.35 + rand() * 0.7;
      parts.fronds.push({
        position: [x, soilY, z],
        scale: s * FROND_LENGTH * (0.75 + rand() * 0.35),
        rotationY: (i / n) * Math.PI * 2 + rand() * 0.4,
        tilt: [0, -lean],
        color: pick(LEAF_GREENS, rand),
      });
    }
  });

  SOLARPUNK_PLANTS.MONSTERAS.forEach(([x, z, s], plant) => {
    const soilY = addPot(parts, x, z, s, POT_TINTS[(plant + 1) % POT_TINTS.length]);
    const n = SOLARPUNK_PLANTS.MONSTERA_LEAVES;
    for (let i = 0; i < n; i++) {
      const rotationY = (i / n) * Math.PI * 2 + rand() * 0.6;
      const lean = 0.2 + rand() * 0.45;
      const length = s * (0.9 + rand() * 0.7);
      parts.stems.push({ position: [x, soilY, z], scale: [0.025 * s, length, 0.025 * s], rotationY, tilt: [0, -lean] });
      const [ox, oz] = outward(rotationY);
      const reach = Math.sin(lean) * length;
      parts.bigLeaves.push({
        position: [x + ox * reach, soilY + Math.cos(lean) * length, z + oz * reach],
        scale: s * MONSTERA_SIZE * (0.8 + rand() * 0.3),
        rotationY,
        tilt: [0, -(lean + 0.55)],
        color: pick(LEAF_GREENS, rand),
      });
    }
  });
  return parts;
}

export function buildHangingPlants(): HangingParts {
  const parts: HangingParts = { cables: [], baskets: [], mounds: [], leaves: [], vines: [] };
  const rand = seededRandom(83);
  const step = SOLARPUNK_PLANTS.VINE_STEP;

  SOLARPUNK_PLANTS.BASKETS.forEach(([x, z, hang, vineCount], basket) => {
    const rimY = FLOOR + hang;
    const cable = CEILING - rimY;
    parts.cables.push({ position: [x, rimY + cable / 2, z], scale: [CABLE_RADIUS, cable, CABLE_RADIUS] });
    parts.baskets.push({ position: [x, rimY, z], color: POT_TINTS[basket % POT_TINTS.length] });
    parts.mounds.push({ position: [x, rimY + 0.04, z], scale: [BASKET.RADIUS * 1.05, 0.26, BASKET.RADIUS * 1.05], color: pick(LEAF_GREENS, rand) });

    for (let v = 0; v < vineCount; v++) {
      const angle = (v / vineCount) * Math.PI * 2 + rand() * 0.5;
      const vx = x + Math.cos(angle) * BASKET.RADIUS * 0.95;
      const vz = z + Math.sin(angle) * BASKET.RADIUS * 0.95;
      const leaves = SOLARPUNK_PLANTS.VINE_LEAVES - Math.floor(rand() * 4);
      const length = leaves * step;
      // The vine drifts slightly outward as it falls
      const drift = 0.12 + rand() * 0.12;
      parts.vines.push({ position: [vx + Math.cos(angle) * drift / 2, rimY - length / 2, vz + Math.sin(angle) * drift / 2], scale: [0.008, length, 0.008] });
      for (let l = 0; l < leaves; l++) {
        const t = (l + 0.5) / leaves;
        const side = l % 2 === 0 ? 1 : -1;
        parts.leaves.push({
          position: [vx + Math.cos(angle) * drift * t, rimY - (l + 0.5) * step, vz + Math.sin(angle) * drift * t],
          scale: 0.9 + rand() * 0.5,
          rotationY: angle + rand() * 1.2,
          tilt: [0, Math.PI + side * (0.6 + rand() * 0.4)],
          color: pick(LEAF_GREENS, rand),
        });
      }
    }
  });

  SOLARPUNK_PLANTS.CLIMBERS.forEach(([wall, along, height]) => {
    const onSideWall = Math.abs(wall) === ENVIRONMENT_ROOM.HALF_WIDTH;
    const inward = onSideWall ? -Math.sign(wall) * CLIMBER_INSET : CLIMBER_INSET;
    const base: Vec3 = onSideWall ? [wall + inward, LEDGE_Y, along] : [along, LEDGE_Y, wall + inward];
    // Leaves face into the room: +x from the left wall, -x from the right, +z from the back.
    const faceY = onSideWall ? -Math.sign(wall) * (Math.PI / 2) : 0;
    parts.vines.push({ position: [base[0], LEDGE_Y + height / 2, base[2]], scale: [0.012, height, 0.012] });
    const count = Math.floor(height / SOLARPUNK_PLANTS.CLIMBER_STEP);
    for (let l = 0; l < count; l++) {
      const side = l % 2 === 0 ? 1 : -1;
      parts.leaves.push({
        position: [base[0], LEDGE_Y + 0.1 + l * SOLARPUNK_PLANTS.CLIMBER_STEP, base[2]],
        scale: 1.1 + rand() * 0.6,
        rotationY: faceY + (rand() - 0.5) * 0.5,
        tilt: [0, side * (0.7 + rand() * 0.5)],
        color: pick(LEAF_GREENS, rand),
      });
    }
  });
  return parts;
}
