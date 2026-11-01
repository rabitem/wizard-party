'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { SPRING_COLORS, SPRING_REALISM } from '@/presentation/config/spring-environment.config';
import { InstancedProp, useDisposables } from '../primitives';
import { addFoliageSway, useSwayClock } from '../solarpunk/foliage-sway';
import { buildGrass } from './grass-layout';
import { createFlowerHeadGeometry, createGrassTuftGeometry } from './spring-geometry';

/**
 * Lawn detail: instanced grass tufts (root-darkened blades, swaying in the
 * vertex shader) around trees, hedges, beds and columns, with small
 * wildflowers. Two draw calls.
 */
export function GrassTufts() {
  const parts = useMemo(() => buildGrass(), []);
  const { assets, sway } = useMemo(() => {
    const blades = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.85, side: THREE.DoubleSide });
    const resources = {
      tuft: createGrassTuftGeometry(),
      head: createFlowerHeadGeometry(),
      blades,
      petals: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, emissive: SPRING_COLORS.petalEmissive, emissiveIntensity: 0.25 }),
    };
    return { assets: resources, sway: [addFoliageSway(blades, SPRING_REALISM.SWAY.grass)] };
  }, []);
  useDisposables(assets);
  useSwayClock(sway);

  return (
    <group>
      <InstancedProp geometry={assets.tuft} material={assets.blades} placements={parts.tufts} />
      <InstancedProp geometry={assets.head} material={assets.petals} placements={parts.wildflowers} />
    </group>
  );
}
