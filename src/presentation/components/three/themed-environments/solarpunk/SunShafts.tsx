'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ENVIRONMENT_ROOM } from '@/presentation/config/themed-environment.config';
import { SOLARPUNK_COLORS, SOLARPUNK_SUN_SHAFTS } from '@/presentation/config/solarpunk-environment.config';
import {
  createGlowMaterial,
  GlowSprites,
  LightShafts,
  RealisticParticleField,
  useDisposables,
  type GlowPoint,
} from '../primitives';
import { createCausticsMaterial } from './water-materials';
import { useShaderTime } from './useShaderTime';

const S = SOLARPUNK_SUN_SHAFTS;
const POOL_LIFT = 0.008;
const POOL_TIME_SCALE = 0.25;
const POLLEN_COLORS = ['#ffe680', '#fff4c0', '#f8f0d0'] as const;

const ROOF_GLOWS: GlowPoint[] = S.SHAFTS.map(({ source, radiusStart }) => ({
  position: [source[0], source[1] - 0.25, source[2]],
  scale: radiusStart * S.ROOF_GLOW_SCALE,
}));

/**
 * Sun through the glass roof: soft volumetric cones (LightShafts, one draw
 * call) with dust motes, bright glow where they enter the glass, warm
 * dappled light pools where they land and pollen drifting through the
 * atrium. The bright entry glows and pools feed the bloom pass.
 */
export function SunShafts() {
  const poolRef = useRef<THREE.Mesh>(null);
  const assets = useMemo(() => {
    // All pools share one merged geometry + material (one draw call); UVs stay per plane.
    const pools = S.SHAFTS.map(({ target, radiusEnd }) => {
      const size = radiusEnd * S.POOL_SCALE * 2;
      const plane = new THREE.PlaneGeometry(size, size * 0.8);
      plane.rotateX(-Math.PI / 2);
      plane.translate(target[0], ENVIRONMENT_ROOM.FLOOR_Y + POOL_LIFT, target[2]);
      return plane;
    });
    const merged = mergeGeometries(pools) ?? new THREE.BufferGeometry();
    pools.forEach((plane) => plane.dispose());
    return {
      pool: merged,
      poolMaterial: createCausticsMaterial({ color: S.COLOR, intensity: S.POOL_INTENSITY, scale: 1.1, caustic: 0.35, edge: 0.7 }),
      glow: createGlowMaterial(SOLARPUNK_COLORS.sunGlow, S.ROOF_GLOW_OPACITY),
    };
  }, []);
  useDisposables(assets);
  useShaderTime([poolRef], POOL_TIME_SCALE);

  return (
    <group>
      <LightShafts shafts={S.SHAFTS} color={S.COLOR} intensity={S.INTENSITY} dust={S.DUST} dustCount={S.DUST_COUNT} />
      <GlowSprites points={ROOF_GLOWS} material={assets.glow} />
      <mesh ref={poolRef} geometry={assets.pool} material={assets.poolMaterial} renderOrder={1} />
      <RealisticParticleField kind="pollen" volume={S.POLLEN} count={S.POLLEN_COUNT} colors={POLLEN_COLORS} wind={S.POLLEN_WIND} seed={41} />
    </group>
  );
}
