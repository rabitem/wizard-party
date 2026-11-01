import type { Vec3 } from '@/presentation/config/themed-environment.config';
import { SPRING_FLOWER_COLORS } from '@/presentation/config/spring-environment.config';
import { seededRandom, type PropPlacement } from '../primitives';
import { POT } from './spring-geometry';

const BUSH = { RADIUS: 0.34, HEIGHT_RATIO: 0.75 } as const;
const FLOWERS_PER_POT = 7;

export interface PottedPlantParts {
  pots: PropPlacement[];
  bushes: PropPlacement[];
  flowers: PropPlacement[];
}

export function emptyPlantParts(): PottedPlantParts {
  return { pots: [], bushes: [], flowers: [] };
}

/**
 * Adds one terracotta pot with a leafy mound and flower heads dotted over
 * it to the shared instanced part lists.
 */
export function addPottedPlant(parts: PottedPlantParts, position: Vec3, scale: number, rotationY: number, seed: number): void {
  const rand = seededRandom(seed);
  const [x, y, z] = position;
  const soilY = y + POT.SOIL_Y * scale;
  const bushRadius = BUSH.RADIUS * scale;
  parts.pots.push({ position, scale, rotationY });
  parts.bushes.push({ position: [x, soilY, z], scale: [bushRadius, bushRadius * BUSH.HEIGHT_RATIO * 1.4, bushRadius] });
  for (let i = 0; i < FLOWERS_PER_POT; i++) {
    const angle = rotationY + (i / FLOWERS_PER_POT) * Math.PI * 2 + rand() * 0.4;
    const ring = i === 0 ? 0 : 0.55 + rand() * 0.3;
    const lift = Math.sqrt(Math.max(0, 1 - ring * ring)) * bushRadius * BUSH.HEIGHT_RATIO * 1.4;
    parts.flowers.push({
      position: [x + Math.cos(angle) * ring * bushRadius, soilY + lift, z + Math.sin(angle) * ring * bushRadius],
      scale: scale * (0.9 + rand() * 0.4),
      rotationY: rand() * Math.PI,
      tilt: [Math.cos(angle) * ring * 0.6, -Math.sin(angle) * ring * 0.6],
      color: SPRING_FLOWER_COLORS[Math.floor(rand() * SPRING_FLOWER_COLORS.length)],
    });
  }
}
