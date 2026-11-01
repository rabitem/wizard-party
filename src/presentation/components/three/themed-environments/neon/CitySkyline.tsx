'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { NEON_COLORS } from '@/presentation/config/neon-environment.config';
import { InstancedProp, useDisposables } from '../primitives';
import { AircraftLights } from './AircraftLights';
import { createWindowTexture } from './neon-textures';
import { FAR_BUILDINGS, NEAR_BUILDINGS } from './skyline-layout';
import { SkylineHaze } from './SkylineHaze';

/** Box faces in BoxGeometry order: +x, -x, +y, -y, +z, -z (4 vertices each) */
const TOP_BOTTOM_VERTICES: readonly [number, number] = [8, 16];
/** A UV inside the black padding of the window texture */
const DARK_UV = 0.004;

/** Unit box whose roof and floor sample the dark texture padding (no windows on top). */
function createTowerGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = TOP_BOTTOM_VERTICES[0]; i < TOP_BOTTOM_VERTICES[1]; i++) uv.setXY(i, DARK_UV, DARK_UV);
  uv.needsUpdate = true;
  return geometry;
}

/**
 * City skyline: a near ring of glassy towers with seeded lit windows
 * (emissive map, one draw call), a far ring of flat violet silhouettes, haze
 * bands between the rings for depth and blinking aviation lights / passing
 * planes above.
 */
export function CitySkyline() {
  const assets = useMemo(() => {
    const windows = createWindowTexture();
    return {
      windows,
      tower: createTowerGeometry(),
      box: new THREE.BoxGeometry(1, 1, 1),
      near: new THREE.MeshStandardMaterial({
        color: NEON_COLORS.building,
        roughness: 0.35,
        metalness: 0.6,
        emissive: '#ffffff',
        emissiveMap: windows,
        emissiveIntensity: 1.15,
      }),
      far: new THREE.MeshBasicMaterial({ color: NEON_COLORS.buildingFar }),
    };
  }, []);
  useDisposables(assets);

  return (
    <group>
      <InstancedProp geometry={assets.box} material={assets.far} placements={FAR_BUILDINGS} />
      <InstancedProp geometry={assets.tower} material={assets.near} placements={NEAR_BUILDINGS} />
      <SkylineHaze />
      <AircraftLights />
    </group>
  );
}
