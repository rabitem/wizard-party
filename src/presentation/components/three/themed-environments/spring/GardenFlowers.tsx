'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { SPRING_COLORS, SPRING_FLOWER_COLORS, SPRING_LAYOUT } from '@/presentation/config/spring-environment.config';
import { ENVIRONMENT_ROOM, type Vec3 } from '@/presentation/config/themed-environment.config';
import { addSurfaceDetail, InstancedProp, seededRandom, useDisposables, type PropPlacement } from '../primitives';
import { createFlowerHeadGeometry, createPotGeometry } from './spring-geometry';
import { addPottedPlant, emptyPlantParts, type PottedPlantParts } from './potted-plants';

const FLOOR = ENVIRONMENT_ROOM.FLOOR_Y;
const BED = { HEIGHT: 0.45, RIM: 0.12, SOIL_INSET: 0.1 } as const;
const STEM = { RADIUS: 0.012, HEIGHT: 0.32 } as const;
const MOUND = { SIZE: 0.32, PER_BED: 5 } as const;

interface BedParts {
  frames: PropPlacement[];
  soil: PropPlacement[];
  mounds: PropPlacement[];
  stems: PropPlacement[];
  heads: PropPlacement[];
}

/** Raised planters with leafy mounds and flowers on short stems. */
function buildBeds(): BedParts {
  const rand = seededRandom(29);
  const parts: BedParts = { frames: [], soil: [], mounds: [], stems: [], heads: [] };
  SPRING_LAYOUT.BEDS.forEach(([x, z, width, depth, rot], b) => {
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const local = (lx: number, lz: number): [number, number] => [x + lx * cos + lz * sin, z - lx * sin + lz * cos];
    parts.frames.push({ position: [x, FLOOR + BED.HEIGHT / 2, z], scale: [width, BED.HEIGHT, depth], rotationY: rot });
    parts.soil.push({
      position: [x, FLOOR + BED.HEIGHT + 0.005, z],
      scale: [width - BED.RIM * 2, 0.02, depth - BED.RIM * 2],
      rotationY: rot,
    });
    const innerW = width - BED.RIM * 2 - BED.SOIL_INSET;
    const innerD = depth - BED.RIM * 2 - BED.SOIL_INSET;
    for (let m = 0; m < MOUND.PER_BED; m++) {
      const [mx, mz] = local((rand() - 0.5) * innerW, (rand() - 0.5) * innerD);
      const size = MOUND.SIZE * (0.8 + rand() * 0.5);
      parts.mounds.push({ position: [mx, FLOOR + BED.HEIGHT, mz], scale: [size, size * 0.8, size] });
    }
    for (let f = 0; f < SPRING_LAYOUT.FLOWERS_PER_BED; f++) {
      const [fx, fz] = local((rand() - 0.5) * innerW, (rand() - 0.5) * innerD);
      const height = 0.7 + rand() * 0.7;
      const base: Vec3 = [fx, FLOOR + BED.HEIGHT, fz];
      parts.stems.push({ position: base, scale: [1, height, 1] });
      parts.heads.push({
        position: [fx, base[1] + STEM.HEIGHT * height, fz],
        scale: 1 + rand() * 0.5,
        rotationY: rand() * Math.PI,
        tilt: [(rand() - 0.5) * 0.5, (rand() - 0.5) * 0.5],
        color: SPRING_FLOWER_COLORS[(b * 5 + f) % SPRING_FLOWER_COLORS.length],
      });
    }
  });
  return parts;
}

function buildFloorPots(): PottedPlantParts {
  const parts = emptyPlantParts();
  SPRING_LAYOUT.POTS.forEach(([x, z, scale], i) => addPottedPlant(parts, [x, FLOOR, z], scale, i * 1.3, 101 + i));
  return parts;
}

/** Raised flower beds and terracotta pots overflowing with blooms. */
export function GardenFlowers() {
  const beds = useMemo(() => buildBeds(), []);
  const pots = useMemo(() => buildFloorPots(), []);
  const leafMounds = useMemo(() => [...beds.mounds, ...pots.bushes], [beds, pots]);
  const flowerHeads = useMemo(() => [...beds.heads, ...pots.flowers], [beds, pots]);
  const assets = useMemo(() => {
    const stem = new THREE.CylinderGeometry(STEM.RADIUS, STEM.RADIUS, STEM.HEIGHT, 4);
    stem.translate(0, STEM.HEIGHT / 2, 0);
    return {
      stem,
      box: new THREE.BoxGeometry(1, 1, 1),
      mound: new THREE.IcosahedronGeometry(1, 1),
      head: createFlowerHeadGeometry(),
      pot: createPotGeometry(),
      planter: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: SPRING_COLORS.planter, roughness: 0.85 }), { scale: 3, normalStrength: 0.45 }),
      soil: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: SPRING_COLORS.soil, roughness: 1 }), { scale: 5, normalStrength: 0.8 }),
      leaf: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: SPRING_COLORS.leaf, roughness: 0.9, flatShading: true }), { scale: 4, normalStrength: 0.5 }),
      petal: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, emissive: SPRING_COLORS.petalEmissive, emissiveIntensity: 0.3 }),
      terracotta: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: SPRING_COLORS.terracotta, roughness: 0.85 }), { scale: 3, normalStrength: 0.35 }),
    };
  }, []);
  useDisposables(assets);

  return (
    <group>
      <InstancedProp geometry={assets.box} material={assets.planter} placements={beds.frames} />
      <InstancedProp geometry={assets.box} material={assets.soil} placements={beds.soil} />
      <InstancedProp geometry={assets.mound} material={assets.leaf} placements={leafMounds} />
      <InstancedProp geometry={assets.stem} material={assets.leaf} placements={beds.stems} />
      <InstancedProp geometry={assets.head} material={assets.petal} placements={flowerHeads} />
      <InstancedProp geometry={assets.pot} material={assets.terracotta} placements={pots.pots} />
    </group>
  );
}
