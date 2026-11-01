'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import {
  SPRING_COLORS,
  SPRING_RIM_PETALS,
  SPRING_RIM_POT_SCALE,
  SPRING_RIM_POTS,
} from '@/presentation/config/spring-environment.config';
import { InstancedProp, useDisposables } from '../primitives';
import { createFlowerHeadGeometry, createPetalGeometry, createPotGeometry } from './spring-geometry';
import { addPottedPlant, emptyPlantParts } from './potted-plants';

/** Fallen petals rest flat on the wood, slightly larger than the drifting ones. */
const RIM_PETAL_SCALE = 1.3;

function buildRimPots() {
  const parts = emptyPlantParts();
  SPRING_RIM_POTS.forEach((pot, i) => addPottedPlant(parts, pot.position, SPRING_RIM_POT_SCALE, pot.rotationY, 211 + i));
  return parts;
}

/**
 * Tiny flower pots and a few fallen cherry petals on the wood rim. Visual
 * only (no colliders), in the safe rim slots outside the play area.
 */
export function SpringTableDecor() {
  const pots = useMemo(() => buildRimPots(), []);
  const petals = useMemo(() => SPRING_RIM_PETALS.map((petal) => ({ ...petal, scale: RIM_PETAL_SCALE })), []);
  const assets = useMemo(
    () => ({
      pot: createPotGeometry(),
      head: createFlowerHeadGeometry(),
      petal: createPetalGeometry(),
      bush: new THREE.IcosahedronGeometry(1, 1),
      terracotta: new THREE.MeshStandardMaterial({ color: SPRING_COLORS.terracotta, roughness: 0.85 }),
      leaf: new THREE.MeshStandardMaterial({ color: SPRING_COLORS.leaf, roughness: 0.9, flatShading: true }),
      bloom: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, side: THREE.DoubleSide, emissive: SPRING_COLORS.petalEmissive, emissiveIntensity: 0.3 }),
    }),
    [],
  );
  useDisposables(assets);

  return (
    <group>
      <InstancedProp geometry={assets.pot} material={assets.terracotta} placements={pots.pots} />
      <InstancedProp geometry={assets.bush} material={assets.leaf} placements={pots.bushes} />
      <InstancedProp geometry={assets.head} material={assets.bloom} placements={pots.flowers} />
      <InstancedProp geometry={assets.petal} material={assets.bloom} placements={petals} />
    </group>
  );
}
