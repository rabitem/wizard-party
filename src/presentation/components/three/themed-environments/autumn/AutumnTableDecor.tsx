'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import {
  AUTUMN_COLORS,
  AUTUMN_RIM_ACORN_SCALE,
  AUTUMN_RIM_ACORNS,
  AUTUMN_RIM_LEAF_SCALE,
  AUTUMN_RIM_LEAVES,
} from '@/presentation/config/autumn-environment.config';
import { InstancedProp, useDisposables, type PropPlacement } from '../primitives';
import { createAcornGeometries, createLeafGeometry } from './autumn-geometry';

/** Acorns lying on their side are lifted so they rest on the wood. */
const LYING_ACORN_LIFT = 0.03;

/**
 * Fallen leaves and acorns on the wood rim. Visual only (no colliders),
 * placed in the safe rim slots outside the play area.
 */
export function AutumnTableDecor() {
  const assets = useMemo(() => {
    const acorn = createAcornGeometries();
    return {
      leaf: createLeafGeometry(),
      nut: acorn.nut,
      cap: acorn.cap,
      leafMaterial: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75, side: THREE.DoubleSide }),
      nutMaterial: new THREE.MeshStandardMaterial({ color: AUTUMN_COLORS.acornNut, roughness: 0.45 }),
      capMaterial: new THREE.MeshStandardMaterial({ color: AUTUMN_COLORS.acornCap, roughness: 0.95 }),
    };
  }, []);
  useDisposables(assets);

  const leaves = useMemo<PropPlacement[]>(
    () => AUTUMN_RIM_LEAVES.map((leaf) => ({ ...leaf, scale: AUTUMN_RIM_LEAF_SCALE })),
    [],
  );
  const acorns = useMemo<PropPlacement[]>(
    () =>
      AUTUMN_RIM_ACORNS.map((acorn, i) => {
        const lying = i % 2 === 1;
        const [x, y, z] = acorn.position;
        return {
          ...acorn,
          position: [x, y + (lying ? LYING_ACORN_LIFT * AUTUMN_RIM_ACORN_SCALE : 0), z] as [number, number, number],
          scale: AUTUMN_RIM_ACORN_SCALE,
          tilt: [lying ? Math.PI / 2 : 0, 0] as [number, number],
        };
      }),
    [],
  );

  return (
    <group>
      <InstancedProp geometry={assets.leaf} material={assets.leafMaterial} placements={leaves} />
      <InstancedProp geometry={assets.nut} material={assets.nutMaterial} placements={acorns} />
      <InstancedProp geometry={assets.cap} material={assets.capMaterial} placements={acorns} />
    </group>
  );
}
