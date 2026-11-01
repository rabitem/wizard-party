'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { WINTER_COLORS } from '@/presentation/config/winter-environment.config';
import { PORCH_FRONT_Z, WINTER_YARD, WINTER_YARD_COLORS } from '@/presentation/config/winter-porch.config';
import { ENVIRONMENT_ROOM, type Vec3 } from '@/presentation/config/themed-environment.config';
import { createPbrMaterial, InstancedProp, useDisposables, WindowSnowView, type PropPlacement } from '../primitives';
import { applySnowDusting } from './snow-dusting';
import { createPineTierGeometry, createSnowGroundGeometry } from './lodge-shell-geometry';

const Y = WINTER_YARD;
const GROUND_DEPTH = PORCH_FRONT_Z - Y.FAR_Z + 1;
const GROUND_CENTER_Z = (PORCH_FRONT_Z + 0.5 + Y.FAR_Z) / 2;
const PINE_TIERS = 4;

/** Each yard pine as stacked cones, narrowing upwards (one instanced draw call). */
const PINE_TIER_PLACEMENTS: PropPlacement[] = Y.PINES.flatMap(([x, z, height, radius], p) =>
  Array.from({ length: PINE_TIERS }, (_, i) => {
    const t = i / PINE_TIERS;
    const tierHeight = (height / PINE_TIERS) * 1.6 * (1 - t * 0.3);
    return {
      position: [x, Y.GROUND_Y + height * 0.12 + (height / PINE_TIERS) * i * 0.82, z] as Vec3,
      scale: [radius * (1 - t * 0.7), tierHeight, radius * (1 - t * 0.7)] as Vec3,
      rotationY: i * 0.7 + p,
    };
  }),
);

const PINE_TRUNKS: PropPlacement[] = Y.PINES.map(([x, z, height]) => ({
  position: [x, Y.GROUND_Y + height * 0.1, z] as Vec3,
  scale: [1, height * 0.2, 1] as Vec3,
}));

/** Drifts on the deck / threshold sit on the floor, the rest on the yard ground. */
const DRIFTS: PropPlacement[] = Y.DRIFTS.map(([x, z, radius, height]) => ({
  position: [x, z > PORCH_FRONT_Z ? ENVIRONMENT_ROOM.FLOOR_Y : Y.GROUND_Y + 0.05, z] as Vec3,
  scale: [radius, height, radius * 0.75] as Vec3,
}));

const BACKDROP_PALETTE = WINTER_YARD_COLORS.backdrop;

/**
 * Snowy yard seen through the archway: rolling snow ground with sparkle,
 * drifts against the porch, snow-laden pines and a ray-cast moonlit forest
 * with its own parallax snowfall far behind them.
 */
export function SnowyYard() {
  const assets = useMemo(
    () => ({
      ground: createSnowGroundGeometry(Y.HALF_WIDTH * 2, GROUND_DEPTH, Y.SEGMENTS, Y.DRIFT_HEIGHT),
      snow: createPbrMaterial('snow', { color: WINTER_COLORS.snow, accent: WINTER_COLORS.snowShadow, repeat: [10, 5], roughness: 1 }),
      drift: applySnowDusting(createPbrMaterial('snow', { color: WINTER_COLORS.snow, accent: WINTER_COLORS.snowShadow, repeat: [1, 1] }), {
        amount: 1,
        threshold: -1,
        sparkle: 0.8,
        keepSurface: 1,
      }),
      pine: applySnowDusting(new THREE.MeshStandardMaterial({ color: WINTER_YARD_COLORS.pine, roughness: 0.92, flatShading: true }), {
        amount: 0.9,
        threshold: 0.2,
        patchScale: 1.8,
        sparkle: 0.4,
      }),
      trunk: new THREE.MeshStandardMaterial({ color: WINTER_COLORS.trunk, roughness: 0.95 }),
      tier: createPineTierGeometry(),
      trunkGeometry: new THREE.CylinderGeometry(0.14, 0.2, 1, 6),
      ball: new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    }),
    [],
  );
  useDisposables(assets);

  return (
    <group>
      <mesh position={[0, Y.GROUND_Y, GROUND_CENTER_Z]} geometry={assets.ground} material={assets.snow} />
      <InstancedProp geometry={assets.ball} material={assets.drift} placements={DRIFTS} />
      <InstancedProp geometry={assets.trunkGeometry} material={assets.trunk} placements={PINE_TRUNKS} />
      <InstancedProp geometry={assets.tier} material={assets.pine} placements={PINE_TIER_PLACEMENTS} />
      <WindowSnowView
        position={Y.BACKDROP_CENTER}
        size={Y.BACKDROP_SIZE}
        variant="night"
        palette={BACKDROP_PALETTE}
        precipitation="snow"
        frost={0}
        sillDrift={0}
      />
    </group>
  );
}
