'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import {
  WINTER_COLORS,
  WINTER_RIM_CANDLES,
  WINTER_RIM_CONE_SCALE,
  WINTER_RIM_CONES,
} from '@/presentation/config/winter-environment.config';
import { CandleCluster, InstancedProp, useDisposables, type PropPlacement } from '../primitives';
import { createPineConeGeometry } from './winter-geometry';

const RIM_CONES: PropPlacement[] = WINTER_RIM_CONES.map((cone) => ({ ...cone, scale: WINTER_RIM_CONE_SCALE }));

/**
 * Tiny pine cones and stubby candles on the wood rim. Visual only (no
 * colliders), in the safe rim slots outside the play area.
 */
export function WinterTableDecor() {
  const assets = useMemo(
    () => ({
      cone: createPineConeGeometry(),
      material: new THREE.MeshStandardMaterial({ color: WINTER_COLORS.pineCone, roughness: 0.9, flatShading: true }),
    }),
    [],
  );
  useDisposables(assets);

  return (
    <group>
      <InstancedProp geometry={assets.cone} material={assets.material} placements={RIM_CONES} />
      <CandleCluster
        candles={WINTER_RIM_CANDLES}
        waxColor={WINTER_COLORS.wax}
        flameColor={WINTER_COLORS.candleFlame}
        glowColor={WINTER_COLORS.candleGlow}
        glowStrength={0.45}
      />
    </group>
  );
}
