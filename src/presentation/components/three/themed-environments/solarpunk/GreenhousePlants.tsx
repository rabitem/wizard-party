'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { SOLARPUNK_COLORS, SOLARPUNK_SWAY } from '@/presentation/config/solarpunk-environment.config';
import { addSurfaceDetail, InstancedProp, useDisposables } from '../primitives';
import { addFoliageSway, useSwayClock } from './foliage-sway';
import { buildHangingPlants, buildPottedPlants } from './plant-layout';
import { createBasketGeometry, createFrondGeometry, createLeafGeometry, createMonsteraLeafGeometry, createPotGeometry } from './solarpunk-geometry';

/** Unit cylinder with its base at the origin, so tilted stems pivot at the soil. */
function createStemGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.CylinderGeometry(1, 1, 1, 5, 1);
  geometry.translate(0, 0.5, 0);
  return geometry;
}

/**
 * All greenhouse planting: potted ferns and monsteras on the floor, hanging
 * baskets with trailing vines and climbers up the mullions. Every repeated
 * part is one instanced draw call sharing a handful of materials; leaves and
 * fronds sway in the vertex shader (no per-instance JS).
 */
export function GreenhousePlants() {
  const potted = useMemo(() => buildPottedPlants(), []);
  const hanging = useMemo(() => buildHangingPlants(), []);
  const { assets, sway } = useMemo(() => {
    const foliage = addSurfaceDetail(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, side: THREE.DoubleSide }), { scale: 3, normalStrength: 0.15 });
    const mossy = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true });
    const resources = {
      pot: createPotGeometry(),
      basket: createBasketGeometry(),
      frond: createFrondGeometry(),
      monstera: createMonsteraLeafGeometry(),
      leaf: createLeafGeometry(),
      stem: createStemGeometry(),
      cable: new THREE.CylinderGeometry(1, 1, 1, 4, 1),
      disc: new THREE.CylinderGeometry(1, 1, 1, 12, 1),
      mound: new THREE.IcosahedronGeometry(1, 1),
      ceramic: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 }), { scale: 3, normalStrength: 0.12 }),
      soil: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: SOLARPUNK_COLORS.soil, roughness: 1 }), { scale: 4, normalStrength: 0.6 }),
      foliage,
      mossy,
      stemMat: new THREE.MeshStandardMaterial({ color: SOLARPUNK_COLORS.stem, roughness: 0.8 }),
      brass: new THREE.MeshStandardMaterial({ color: SOLARPUNK_COLORS.brass, roughness: 0.35, metalness: 0.7 }),
    };
    // Leaves and fronds sway in the vertex shader; moss mounds only breathe slightly.
    return { assets: resources, sway: [addFoliageSway(foliage, SOLARPUNK_SWAY.foliage), addFoliageSway(mossy, SOLARPUNK_SWAY.bushes)] };
  }, []);
  useSwayClock(sway);
  useDisposables(assets);

  return (
    <group>
      <InstancedProp geometry={assets.pot} material={assets.ceramic} placements={potted.pots} />
      <InstancedProp geometry={assets.disc} material={assets.soil} placements={potted.soil} />
      <InstancedProp geometry={assets.frond} material={assets.foliage} placements={potted.fronds} />
      <InstancedProp geometry={assets.stem} material={assets.stemMat} placements={potted.stems} />
      <InstancedProp geometry={assets.monstera} material={assets.foliage} placements={potted.bigLeaves} />

      <InstancedProp geometry={assets.cable} material={assets.brass} placements={hanging.cables} />
      <InstancedProp geometry={assets.basket} material={assets.ceramic} placements={hanging.baskets} />
      <InstancedProp geometry={assets.mound} material={assets.mossy} placements={hanging.mounds} />
      <InstancedProp geometry={assets.cable} material={assets.stemMat} placements={hanging.vines} />
      <InstancedProp geometry={assets.leaf} material={assets.foliage} placements={hanging.leaves} />
    </group>
  );
}
