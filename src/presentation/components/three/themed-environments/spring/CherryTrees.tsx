'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { SPRING_BLOSSOM_COLORS, SPRING_COLORS, SPRING_LAYOUT, SPRING_REALISM } from '@/presentation/config/spring-environment.config';
import { ENVIRONMENT_ROOM, type Vec3 } from '@/presentation/config/themed-environment.config';
import { addSurfaceDetail, InstancedProp, seededRandom, useDisposables, type PropPlacement } from '../primitives';
import { addFoliageSway, useSwayClock } from '../solarpunk/foliage-sway';

const TRUNK = { RADIUS: 0.2, HEIGHT: 2.4 } as const;
const BRANCH = { RADIUS: 0.09, LENGTH: 1.5, TILT: 0.75 } as const;
const BRANCHES_PER_TREE = 3;
const CANOPY = { CENTER_Y: 3.3, SPREAD: 1.4, LIFT: 0.7, MIN_SIZE: 0.75, EXTRA_SIZE: 0.5 } as const;
const PETAL_CARPET = { RADIUS: 2.0, LIFT: 0.008, OPACITY: 0.55 } as const;
const FLOOR = ENVIRONMENT_ROOM.FLOOR_Y;

interface TreeParts {
  trunks: PropPlacement[];
  branches: PropPlacement[];
  blossoms: PropPlacement[];
  carpets: PropPlacement[];
}

/** Trunks, angled branches, blossom clumps and petal carpets for every tree. */
function buildTrees(): TreeParts {
  const rand = seededRandom(73);
  const parts: TreeParts = { trunks: [], branches: [], blossoms: [], carpets: [] };
  SPRING_LAYOUT.TREES.forEach(([x, z, scale, rot], t) => {
    parts.trunks.push({ position: [x, FLOOR, z], scale, rotationY: rot, tilt: [0.05, -0.04] });
    for (let b = 0; b < BRANCHES_PER_TREE; b++) {
      const angle = rot + (b / BRANCHES_PER_TREE) * Math.PI * 2;
      parts.branches.push({
        position: [x, FLOOR + TRUNK.HEIGHT * 0.75 * scale, z],
        scale,
        rotationY: angle,
        // Tilt around local z first, then yaw: each branch leans outward.
        tilt: [0, BRANCH.TILT + rand() * 0.2],
      });
    }
    for (let c = 0; c < SPRING_LAYOUT.BLOSSOM_CLUMPS_PER_TREE; c++) {
      const angle = rand() * Math.PI * 2;
      const radius = (c === 0 ? 0 : 0.5 + rand() * 0.5) * CANOPY.SPREAD * scale;
      const size = (CANOPY.MIN_SIZE + rand() * CANOPY.EXTRA_SIZE) * scale;
      parts.blossoms.push({
        position: [x + Math.cos(angle) * radius, FLOOR + (CANOPY.CENTER_Y + rand() * CANOPY.LIFT - radius * 0.2) * scale, z + Math.sin(angle) * radius] as Vec3,
        scale: [size, size * 0.78, size],
        rotationY: rand() * Math.PI,
        color: SPRING_BLOSSOM_COLORS[(t + c) % SPRING_BLOSSOM_COLORS.length],
      });
    }
    parts.carpets.push({ position: [x, FLOOR + PETAL_CARPET.LIFT, z], scale: scale * PETAL_CARPET.RADIUS });
  });
  return parts;
}

/** Cherry trees with fluffy, swaying pink canopies and a carpet of fallen petals below each. */
export function CherryTrees() {
  const parts = useMemo(() => buildTrees(), []);
  const { assets, sway } = useMemo(() => {
    const trunk = new THREE.CylinderGeometry(TRUNK.RADIUS * 0.7, TRUNK.RADIUS, TRUNK.HEIGHT, 7);
    trunk.translate(0, TRUNK.HEIGHT / 2, 0);
    const branch = new THREE.CylinderGeometry(BRANCH.RADIUS * 0.5, BRANCH.RADIUS, BRANCH.LENGTH, 5);
    branch.translate(0, BRANCH.LENGTH / 2, 0);
    const carpet = new THREE.CircleGeometry(1, 18);
    carpet.rotateX(-Math.PI / 2);
    const bloom = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, flatShading: true, emissive: SPRING_COLORS.petalEmissive, emissiveIntensity: 0.4 });
    const resources = {
      trunk,
      branch,
      carpet,
      blossom: new THREE.IcosahedronGeometry(1, 2),
      // Bark: fine roughness + normal noise stretched along the trunk.
      bark: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: SPRING_COLORS.bark, roughness: 0.95, flatShading: true }), { scale: 3, normalStrength: 0.6 }),
      bloom,
      carpetMaterial: new THREE.MeshStandardMaterial({
        color: SPRING_BLOSSOM_COLORS[0],
        roughness: 1,
        transparent: true,
        opacity: PETAL_CARPET.OPACITY,
        depthWrite: false,
      }),
    };
    // Canopy clumps rock gently in the breeze (vertex shader, per-instance phase).
    return { assets: resources, sway: [addFoliageSway(bloom, SPRING_REALISM.SWAY.blossom)] };
  }, []);
  useDisposables(assets);
  useSwayClock(sway);

  return (
    <group>
      <InstancedProp geometry={assets.carpet} material={assets.carpetMaterial} placements={parts.carpets} />
      <InstancedProp geometry={assets.trunk} material={assets.bark} placements={parts.trunks} />
      <InstancedProp geometry={assets.branch} material={assets.bark} placements={parts.branches} />
      <InstancedProp geometry={assets.blossom} material={assets.bloom} placements={parts.blossoms} />
    </group>
  );
}
